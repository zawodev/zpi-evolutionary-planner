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
        
    TODO: Implementation needed
    - Fetch recruitment data
    - Parse user preferences
    - Parse management preferences
    - Parse constraints
    - Build problem_data structure
    """
    raise NotImplementedError("convert_preferences_to_problem_data not yet implemented")


def convert_solution_to_meetings(job_id: str, solution_data: Dict[str, Any]) -> None:
    """
    Convert optimizer solution (genotype) to Meeting records in SQL database.
    
    Args:
        job_id: UUID of the completed optimization job
        solution_data: Solution data containing genotype and fitness
        
    TODO: Implementation needed
    - Parse genotype from solution_data
    - Map genotype to meeting assignments
    - Delete existing meetings for this recruitment
    - Create Meeting records
    - Update recruitment status to 'active'
    """
    raise NotImplementedError("convert_solution_to_meetings not yet implemented")


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
            job_id = job_data['job_id']
            message = json.dumps(job_data)
            
            # Push job to the queue (LPUSH for FIFO with BRPOP)
            self.redis_client.lpush("optimizer:jobs", message)
            logger.info(f"Published job {job_id} to Redis queue")
            print(f"[REDIS] Published job to queue: {job_id}")
            
        except Exception as e:
            logger.error(f"Failed to publish job {job_data.get('job_id', 'unknown')}: {e}")
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
            
            # Extract solution data
            solution_data = progress_data.get('solution_data', {})
            
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
                        convert_solution_to_meetings(str(job.id), solution_data)
                        logger.info(f"Successfully converted solution to meetings for job {job.id}")
                    except NotImplementedError:
                        logger.warning(f"convert_solution_to_meetings not yet implemented for job {job.id}")
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
            
            # Prepare job data for optimizer (matching RawJobData format)
            job_data = {
                'job_id': str(job.id),
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
