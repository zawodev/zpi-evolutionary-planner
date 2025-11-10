import json
import redis
import threading
import time
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import OptimizationJob, OptimizationProgress
from .logger import get_logger

logger = get_logger(__name__)


def convert_preferences_to_problem_data(recruitment_id: str) -> Dict[str, Any]:
    """
    Convert recruitment preferences and constraints to problem_data JSON format.
    
    Args:
        recruitment_id: UUID of the recruitment
        
    Returns:
        Dict containing problem_data in the format expected by the optimizer
        
    Format (matching new-input-updated.json):
    {
        "constraints": {
            "TimeslotsDaily": int,
            "DaysInCycle": int,
            "GroupsPerSubject": [int, ...],
            "GroupsCapacity": [int, ...],
            "MinStudentsPerGroup": int,
            "RoomsCapacity": [int, ...],
            "GroupsTags": [[string, ...], ...],
            "RoomsTags": [[string, ...], ...],
            "StudentsSubjects": [[int, ...], ...],
            "TeachersGroups": [[int, ...], ...],
            "RoomsUnavailabilityTimeslots": [[int, ...], ...],
            "StudentsUnavailabilityTimeslots": [[int, ...], ...],
            "TeachersUnavailabilityTimeslots": [[int, ...], ...]
        },
        "preferences": {
            "students": [[WidthHeightInfo, [minGaps, maxGaps, weight], [timeslot_weights...], [group_weights...]], ...],
            "teachers": [[WidthHeightInfo, [minGaps, maxGaps, weight], [timeslot_weights...]], ...]
        }
    }
    """
    from scheduling.models import Recruitment
    from preferences.models import UserPreferences, Constraints
    from identity.models import UserRecruitment
    
    try:
        # get recruitment
        recruitment = Recruitment.objects.get(recruitment_id=recruitment_id)

        # get constraints (should be one per recruitment)
        try:
            constraints = Constraints.objects.get(recruitment_id=recruitment_id)
            constraints_data = constraints.constraints_data
        except Constraints.DoesNotExist:
            logger.error(f"No constraints found for recruitment {recruitment_id}")
            raise ValueError(f"No constraints found for recruitment {recruitment_id}")
        
        # get all users in this recruitment
        user_recruitments = UserRecruitment.objects.filter(
            recruitment_id=recruitment_id
        ).select_related('user').order_by('user_id')
        
        students_preferences = []
        teachers_preferences = []
        
        # process each user based on their role
        for user_recruitment in user_recruitments:
            user = user_recruitment.user
            
            # skip users that are not participants or hosts
            if user.role not in ['participant', 'host']:
                continue
            
            # get user preferences
            try:
                user_prefs = UserPreferences.objects.get(
                    recruitment_id=recruitment_id,
                    user_id=user.id
                )
                prefs_data = user_prefs.preferences_data
                
                # extract preference fields (new format with capital case)
                width_height_info = prefs_data.get('WidthHeightInfo', 0)
                gaps_info = prefs_data.get('GapsInfo', [0, 0, 0])
                preferred_timeslots = prefs_data.get('PreferredTimeslots', [])
                preferred_groups = prefs_data.get('PreferredGroups', [])
                
                if user.role == 'participant':
                    # students: [WidthHeightInfo, GapsInfo, PreferredTimeslots, PreferredGroups]
                    student_pref = [
                        width_height_info,
                        gaps_info,
                        preferred_timeslots,
                        preferred_groups
                    ]
                    students_preferences.append(student_pref)
                    
                elif user.role == 'host':
                    # teachers: [WidthHeightInfo, GapsInfo, PreferredTimeslots]
                    # without PreferredGroups
                    teacher_pref = [
                        width_height_info,
                        gaps_info,
                        preferred_timeslots
                    ]
                    teachers_preferences.append(teacher_pref)
                    
            except UserPreferences.DoesNotExist:
                logger.warning(f"No preferences found for user {user.id} in recruitment {recruitment_id}")
                # default preferences based on role
                if user.role == 'participant':
                    students_preferences.append([0, [0, 0, 0], [], []])
                elif user.role == 'host':
                    teachers_preferences.append([0, [0, 0, 0], []])
        
        # build problem_data structure (with constraints and preferences separation)
        problem_data = {
            "constraints": constraints_data,
            "preferences": {
                "students": students_preferences,
                "teachers": teachers_preferences
            }
        }
        
        # validate data consistency
        teachers_groups_count = len(constraints_data.get('TeachersGroups', []))
        students_subjects_count = len(constraints_data.get('StudentsSubjects', []))
        
        logger.info(f"Successfully converted preferences to problem_data for recruitment {recruitment_id}")
        logger.info(f"Students count: {len(students_preferences)} (constraints: {students_subjects_count})")
        logger.info(f"Teachers count: {len(teachers_preferences)} (constraints: {teachers_groups_count})")
        
        # check for data inconsistency
        if len(students_preferences) != students_subjects_count:
            logger.error(f"DATA INCONSISTENCY: students_preferences count ({len(students_preferences)}) != "
                        f"StudentsSubjects count ({students_subjects_count})")
        
        if len(teachers_preferences) != teachers_groups_count:
            logger.error(f"DATA INCONSISTENCY: teachers_preferences count ({len(teachers_preferences)}) != "
                        f"TeachersGroups count ({teachers_groups_count})")
        
        return problem_data
        
    except Recruitment.DoesNotExist:
        logger.error(f"Recruitment {recruitment_id} not found")
        raise ValueError(f"Recruitment {recruitment_id} not found")
    except Exception as e:
        logger.error(f"Error converting preferences to problem_data for recruitment {recruitment_id}: {e}")
        raise


def convert_solution_to_meetings(job_id: str) -> None:
    """
    Convert optimizer solution (genotype) to Meeting records in SQL database.
    
    Args:
        job_id: UUID of the completed optimization job
        
    Extracts solution data from the job, parses by_group and by_student arrays,
    deletes existing meetings for the recruitment, and creates new Meeting records
    with corresponding Identity Groups for students.
    """
    from scheduling.models import Meeting, SubjectGroup, Room, Recruitment
    from identity.models import Group, UserGroup, User, UserRecruitment
    from preferences.models import Constraints
    from django.db import transaction
    
    try:
        # Get the optimization job
        job = OptimizationJob.objects.get(id=job_id)
        
        # Extract solution data
        solution_data = job.final_solution
        if not solution_data:
            logger.error(f"No solution data found for job {job_id}")
            return
        
        by_group = solution_data.get('by_group', [])
        by_student = solution_data.get('by_student', [])
        
        if not by_group or not by_student:
            logger.error(f"Invalid solution data for job {job_id}: missing by_group or by_student")
            return
        
        # Get recruitment
        recruitment = job.recruitment
        recruitment_id = recruitment.recruitment_id
        
        # Get organization from recruitment
        organization = recruitment.organization
        if not organization:
            logger.error(f"No organization found for recruitment {recruitment_id}")
            return
        
        # Get constraints to understand the schedule structure
        try:
            constraints = Constraints.objects.get(recruitment_id=recruitment_id)
            constraints_data = constraints.constraints_data
            timeslots_daily = constraints_data.get('TimeslotsDaily', 0)
            days_in_cycle = constraints_data.get('DaysInCycle', 0)
        except Constraints.DoesNotExist:
            logger.error(f"No constraints found for recruitment {recruitment_id}")
            return
        
        # Get ordered lists of subject groups, rooms, and users for this recruitment
        subject_groups = list(
            SubjectGroup.objects.filter(recruitment_id=recruitment_id)
            .order_by('subject_group_id')
        )
        
        rooms = list(Room.objects.all().order_by('room_id'))
        
        # Get users participating in this recruitment (ordered by user id)
        user_recruitments = UserRecruitment.objects.filter(
            recruitment_id=recruitment_id
        ).select_related('user').order_by('user_id')
        users = [ur.user for ur in user_recruitments]
        
        # Validate data consistency
        if len(by_group) != len(subject_groups):
            logger.error(
                f"Mismatch between by_group length ({len(by_group)}) "
                f"and subject_groups count ({len(subject_groups)})"
            )
            return
        
        if len(by_student) != len(users):
            logger.error(
                f"Mismatch between by_student length ({len(by_student)}) "
                f"and users count ({len(users)})"
            )
            return
        
        # Use transaction to ensure atomicity
        with transaction.atomic():
            # Get existing meetings and their groups for deletion
            existing_meetings = Meeting.objects.filter(recruitment_id=recruitment_id)
            group_ids_to_delete = list(existing_meetings.values_list('group_id', flat=True))
            
            # Delete existing meetings for this recruitment
            deleted_count, _ = existing_meetings.delete()
            logger.info(f"Deleted {deleted_count} existing meetings for recruitment {recruitment_id}")
            
            # Delete the identity groups that were associated with those meetings
            if group_ids_to_delete:
                deleted_groups = Group.objects.filter(group_id__in=group_ids_to_delete).delete()
                logger.info(f"Deleted {deleted_groups[0] if deleted_groups else 0} identity groups")
            
            # Create meetings and identity groups
            created_meetings = []
            
            for group_idx, (timeslot_room) in enumerate(by_group):
                if len(timeslot_room) != 2:
                    logger.warning(f"Invalid by_group entry at index {group_idx}: {timeslot_room}")
                    continue
                
                start_timeslot = timeslot_room[0]
                room_idx = timeslot_room[1]
                
                # Get subject group and room
                subject_group = subject_groups[group_idx]
                
                if room_idx >= len(rooms):
                    logger.warning(f"Invalid room index {room_idx} for group {group_idx}")
                    continue
                
                room = rooms[room_idx]
                
                # Calculate day_of_week and day_of_cycle from timeslot
                if timeslots_daily > 0:
                    day_of_cycle = start_timeslot // timeslots_daily
                    day_of_week = day_of_cycle % 7
                else:
                    day_of_cycle = 0
                    day_of_week = 0
                
                # Create Identity Group for this meeting
                # Group name format: "Meeting_<recruitment_name>_<subject_name>_<group_idx>"
                group_name = f"Meeting_{recruitment.recruitment_name}_{subject_group.subject.subject_name}_{group_idx}"
                
                logger.info(f"Creating identity group with name: {group_name}")

                identity_group = Group.objects.create(
                    group_name=group_name,
                    category='meeting',
                    organization=organization
                )

                logger.info(f"Created identity group {identity_group.group_id}")
                logger.info(f"Identity group details: {identity_group}")
                
                # Find students assigned to this subject group from by_student
                students_in_group = []
                for student_idx, student_groups in enumerate(by_student):
                    if group_idx in student_groups:
                        if student_idx < len(users):
                            students_in_group.append(users[student_idx])
                
                # Add students to the identity group
                for student in students_in_group:
                    UserGroup.objects.create(
                        user=student,
                        group=identity_group
                    )
                
                # Create the Meeting with the identity group
                meeting = Meeting.objects.create(
                    recruitment=recruitment,
                    subject_group=subject_group,
                    group=identity_group,
                    room=room,
                    start_timeslot=start_timeslot,
                    day_of_week=day_of_week,
                    day_of_cycle=day_of_cycle
                )
                created_meetings.append(meeting)
                
                logger.info(
                    f"Created meeting {meeting.meeting_id} for subject group {subject_group.subject_group_id} "
                    f"with {len(students_in_group)} students in identity group {identity_group.group_id}"
                )
            
            # Update recruitment status to 'active'
            recruitment.plan_status = 'active'
            recruitment.save()
            
            logger.info(
                f"Successfully created {len(created_meetings)} meetings for recruitment {recruitment_id}"
            )
            print(f"[CONVERSION] Created {len(created_meetings)} meetings for recruitment {recruitment_id}")
    
    except OptimizationJob.DoesNotExist:
        logger.error(f"Optimization job {job_id} not found")
    except Exception as e:
        logger.error(f"Error converting solution to meetings for job {job_id}: {e}")
        raise


class RedisService:
    """Service for Redis communication with optimizer"""
    
    def __init__(self):
        self.redis_client = None
        self.connect()
    
    def connect(self):
        """Establish connection to Redis"""
        try:
            self.redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=getattr(settings, 'REDIS_DB', 0),
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            
            # test connection
            self.redis_client.ping()
            logger.info("Connected to Redis successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    def publish_job(self, job_data: Dict[str, Any]):
        """Publish optimization job to Redis queue"""
        try:
            recruitment_id = job_data['recruitment_id']
            message = json.dumps(job_data)
            
            # Push job to the queue (LPUSH for FIFO with BRPOP)
            self.redis_client.lpush("optimizer:jobs", message)
            logger.info(f"Published job {recruitment_id} to Redis queue")
            print(f"[REDIS] Published job to queue: {recruitment_id}")
            
        except Exception as e:
            logger.error(f"Failed to publish job {job_data.get('recruitment_id', 'unknown')}: {e}")
            raise
    
    def cancel_job(self, job_id: str):
        """Set cancellation flag for job"""
        try:
            cancel_key = f"optimizer:cancel:{job_id}"
            self.redis_client.set(cancel_key, "1", ex=3600)  # expire after 1 hour
            logger.info(f"Set cancellation flag for job {job_id}")
            print(f"[REDIS] Set cancel flag for job: {job_id}")
            
        except Exception as e:
            logger.error(f"Failed to set cancel flag for job {job_id}: {e}")
            raise
    
    def get_progress(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current progress for job"""
        try:
            progress_key = f"optimizer:progress:{job_id}"
            progress_data = self.redis_client.get(progress_key)
            
            if progress_data:
                return json.loads(progress_data)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get progress for job {job_id}: {e}")
            return None


class ProgressListener:
    """Service for listening to progress updates from optimizer via Redis Pub/Sub"""
    
    def __init__(self):
        self.redis_service = RedisService()
        self.channel_layer = get_channel_layer()
        self.pubsub = None
        self.running = False
        self.listener_thread = None
    
    def start_listening(self):
        """Start listening for progress updates"""
        try:
            self.pubsub = self.redis_service.redis_client.pubsub()
            self.pubsub.subscribe("optimizer:progress:updates")
            self.running = True
            
            logger.info("Started listening for Redis progress updates")
            print("[REDIS] Started listening for progress updates")
            
            # Start listener in a separate thread to avoid blocking
            self.listener_thread = threading.Thread(target=self._listen_loop, daemon=True)
            self.listener_thread.start()
            
        except Exception as e:
            logger.error(f"Failed to start progress listener: {e}")
            raise
    
    def stop_listening(self):
        """Stop listening for progress updates"""
        self.running = False
        if self.pubsub:
            self.pubsub.unsubscribe("optimizer:progress:updates")
            self.pubsub.close()
        if self.listener_thread:
            self.listener_thread.join(timeout=5)
        logger.info("Stopped listening for progress updates")
    
    def _listen_loop(self):
        """Main listening loop"""
        try:
            # Set get_message timeout to prevent hanging
            while self.running:
                try:
                    message = self.pubsub.get_message(timeout=1.0)
                    if message is None:
                        continue
                        
                    if message['type'] == 'message':
                        try:
                            data = json.loads(message['data'])
                            self.handle_progress_update(data)
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse progress message: {e}")
                            
                except Exception as e:
                    if self.running:  # Only log if we're supposed to be running
                        logger.error(f"Error receiving message: {e}")
                    time.sleep(0.1)  # Brief pause before retry
                        
        except Exception as e:
            logger.error(f"Error in progress listener loop: {e}")
        finally:
            logger.info("Progress listener loop ended")
    
    def handle_progress_update(self, data: Dict[str, Any]):
        """Handle progress update from optimizer"""
        try:
            job_id = data.get('job_id')
            iteration = data.get('iteration')
            
            if not job_id or iteration is None:
                logger.warning(f"Invalid progress update data: {data}")
                return
            
            print(f"[REDIS] Received progress update for job {job_id}, iteration {iteration}")
            
            # Get full progress data from Redis
            progress_data = self.redis_service.get_progress(job_id)
            if not progress_data:
                logger.warning(f"No progress data found for job {job_id}")
                return
            
            # Extract solution data (optimizer sends it as 'best_solution')
            solution_data = progress_data.get('best_solution', {})
            
            # Update job in database
            try:
                job = OptimizationJob.objects.get(id=job_id)
                job.current_iteration = iteration
                job.updated_at = timezone.now()
                
                # Update final_solution with latest best solution
                job.final_solution = solution_data
                
                if job.status == 'queued':
                    job.status = 'running'
                    job.started_at = timezone.now()
                
                # Check if job is completed (iteration = -1)
                if iteration == -1:
                    job.status = 'completed'
                    job.completed_at = timezone.now()
                    
                    # Convert solution to meetings after optimization completes
                    try:
                        convert_solution_to_meetings(str(job.id))
                        logger.info(f"Successfully converted solution to meetings for job {job.id}")
                    except Exception as e:
                        logger.error(f"Failed to convert solution to meetings for job {job.id}: {e}")
                
                job.save()
                
                # Create progress record (only for non-completion iterations)
                if iteration >= 0:
                    progress = OptimizationProgress.objects.create(
                        job=job,
                        iteration=iteration,
                        best_solution=solution_data
                    )
                    
                    # Send websocket update
                    self.send_websocket_update(job_id, 'progress_update', {
                        'job_id': job_id,
                        'iteration': iteration,
                        'best_solution': progress.best_solution,
                        'timestamp': progress.timestamp.isoformat()
                    })
                else:
                    # Send completion update
                    self.send_websocket_update(job_id, 'job_completed', {
                        'job_id': job_id,
                        'status': 'completed',
                        'final_solution': solution_data,
                        'timestamp': timezone.now().isoformat()
                    })
                
                logger.info(f"Updated progress for job {job_id}, iteration {iteration}")
                print(f"[REDIS] Updated database for job {job_id}, iteration {iteration}")
                
            except OptimizationJob.DoesNotExist:
                logger.warning(f"Job {job_id} not found for progress update")
                
        except Exception as e:
            logger.error(f"Error handling progress update: {e}")
    
    def send_websocket_update(self, job_id: str, message_type: str, data: Dict[str, Any]):
        """Send update to WebSocket clients"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                f'job_progress_{job_id}',
                {
                    'type': message_type,
                    'data': data
                }
            )
            print(f"[WEBSOCKET] Sent {message_type} for job {job_id}")
        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {e}")


class OptimizerService:
    """Main service for optimization operations"""
    
    def __init__(self):
        self.redis_service = RedisService()
    
    def submit_job(self, validated_data: Dict[str, Any]) -> OptimizationJob:
        """Submit a new optimization job"""
        try:
            # Extract data
            problem_data = validated_data['problem_data']
            max_execution_time = validated_data['max_execution_time']
            recruitment_id = validated_data['recruitment_id']
            
            # Create job in database
            job = OptimizationJob.objects.create(
                recruitment_id=recruitment_id,
                problem_data=problem_data,
                max_execution_time=max_execution_time
            )
            
            # Prepare job data for optimizer (matching RawJobData format in C++)
            # Note: RawJobData expects "recruitment_id", not "job_id"
            job_data = {
                'recruitment_id': str(job.id),  # C++ uses recruitment_id field
                'problem_data': problem_data,
                'max_execution_time': max_execution_time
            }
            
            # Publish to Redis queue
            self.redis_service.publish_job(job_data)
            
            logger.info(f"Submitted optimization job {job.id} for recruitment {recruitment_id}")
            print(f"[DJANGO] Submitted job {job.id} with max_execution_time: {max_execution_time}s for recruitment {recruitment_id}")
            return job
            
        except Exception as e:
            logger.error(f"Failed to submit job: {e}")
            raise
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel an optimization job"""
        try:
            job = OptimizationJob.objects.get(id=job_id)
            
            if job.status not in ['queued', 'running']:
                return False
            
            # Update job status
            job.status = 'cancelled'
            job.completed_at = timezone.now()
            job.save()
            
            # Set cancel flag in Redis
            self.redis_service.cancel_job(job_id)
            
            # Send websocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'job_progress_{job_id}',
                {
                    'type': 'job_status_change',
                    'data': {
                        'job_id': job_id,
                        'status': 'cancelled',
                        'timestamp': timezone.now().isoformat()
                    }
                }
            )
            
            logger.info(f"Cancelled job {job_id}")
            print(f"[DJANGO] Cancelled job {job_id}")
            return True
            
        except OptimizationJob.DoesNotExist:
            logger.warning(f"Job {job_id} not found for cancellation")
            return False
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {e}")
            raise
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status from database"""
        try:
            job = OptimizationJob.objects.get(id=job_id)
            status_data = {
                'job_id': str(job.id),
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'updated_at': job.updated_at.isoformat(),
                'current_iteration': job.current_iteration,
                'max_execution_time': job.max_execution_time
            }
            
            if job.started_at:
                status_data['started_at'] = job.started_at.isoformat()
            if job.completed_at:
                status_data['completed_at'] = job.completed_at.isoformat()
            if job.error_message:
                status_data['error_message'] = job.error_message
            if job.final_solution:
                status_data['final_solution'] = job.final_solution
            
            return status_data
            
        except OptimizationJob.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Failed to get job status for {job_id}: {e}")
            return None
