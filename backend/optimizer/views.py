from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from datetime import timedelta

from .models import OptimizationJob, OptimizationProgress
from .serializers import (
    OptimizationJobCreateSerializer, OptimizationJobSerializer,
    OptimizationJobListSerializer, OptimizationProgressSerializer,
    JobCancelSerializer
)
from .services import OptimizerService
from .logger import get_logger

logger = get_logger(__name__)


class OptimizationJobPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class OptimizationJobListCreateView(generics.ListCreateAPIView):
    """
    List all optimization jobs or create a new one.
    """
    queryset = OptimizationJob.objects.all()
    pagination_class = OptimizationJobPagination
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OptimizationJobCreateSerializer
        return OptimizationJobListSerializer
    
    def get_queryset(self):
        queryset = OptimizationJob.objects.all().select_related('recruitment')
        
        # filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # filter by recruitment_id
        recruitment_id = self.request.query_params.get('recruitment_id')
        if recruitment_id:
            queryset = queryset.filter(recruitment__recruitment_id=recruitment_id)
        
        return queryset.order_by('-created_at')
    
    @extend_schema(
        summary="Create new optimization job",
        description="Submit a new optimization job with problem data",
        responses={201: OptimizationJobSerializer}
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # use the service to submit the job
            optimizer_service = OptimizerService()
            job = optimizer_service.submit_job(serializer.validated_data)
            
            # return the created job
            job_serializer = OptimizationJobSerializer(job)
            return Response(job_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to submit job: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        summary="List optimization jobs",
        description="Get a paginated list of optimization jobs",
        parameters=[
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter jobs by status',
                enum=['queued', 'running', 'completed', 'failed', 'cancelled']
            ),
            OpenApiParameter(
                name='recruitment_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter jobs by recruitment ID'
            ),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class OptimizationJobDetailView(generics.RetrieveAPIView):
    """
    Retrieve details of a specific optimization job.
    """
    queryset = OptimizationJob.objects.all().select_related('recruitment')
    serializer_class = OptimizationJobSerializer
    lookup_field = 'id'
    
    @extend_schema(
        summary="Get optimization job details",
        description="Get detailed information about a specific optimization job including progress"
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class LatestOptimizationJobView(generics.RetrieveAPIView):
    """
    Retrieve details of the latest optimization job.
    """
    serializer_class = OptimizationJobSerializer
    
    def get_object(self):
        queryset = OptimizationJob.objects.all().order_by('-created_at')
        
        # Check kwargs first (URL path)
        recruitment_id = self.kwargs.get('recruitment_id')
        
        # Fallback to query params
        if not recruitment_id:
            recruitment_id = self.request.query_params.get('recruitment_id')
            
        if recruitment_id:
            queryset = queryset.filter(recruitment__recruitment_id=recruitment_id)
        
        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        obj = queryset.first()
        if not obj:
            # Return 404 if no job found
            from django.http import Http404
            raise Http404("No optimization jobs found")
        return obj

    @extend_schema(
        summary="Get latest optimization job",
        description="Get detailed information about the most recent optimization job",
        parameters=[
            OpenApiParameter(
                name='recruitment_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by recruitment ID to get its latest job'
            ),
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by job status (e.g. completed, running)',
                enum=['queued', 'running', 'completed', 'failed', 'cancelled']
            ),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@extend_schema(
    summary="Cancel optimization job",
    description="Cancel a running or queued optimization job",
    request=JobCancelSerializer,
    responses={200: {'description': 'Job cancelled successfully'}}
)
@api_view(['POST'])
def cancel_job(request, job_id):
    """Cancel an optimization job"""
    job = get_object_or_404(OptimizationJob, id=job_id)
    
    serializer = JobCancelSerializer(data=request.data, context={'job': job})
    serializer.is_valid(raise_exception=True)
    
    try:
        optimizer_service = OptimizerService()
        success = optimizer_service.cancel_job(str(job_id))
        
        if success:
            return Response({
                'message': 'Job cancellation requested successfully',
                'job_id': str(job_id),
                'status': 'cancelled'
            })
        else:
            return Response(
                {'error': f'Cannot cancel job with status: {job.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        return Response(
            {'error': f'Failed to cancel job: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class OptimizationProgressListView(generics.ListAPIView):
    """
    List progress updates for a specific job.
    """
    serializer_class = OptimizationProgressSerializer
    pagination_class = OptimizationJobPagination
    
    def get_queryset(self):
        job_id = self.kwargs['job_id']
        return OptimizationProgress.objects.filter(job__id=job_id).order_by('-iteration')
    
    @extend_schema(
        summary="Get job progress history",
        description="Get paginated list of progress updates for a specific job"
    )
    def get(self, request, *args, **kwargs):
        # verify job exists
        job_id = kwargs['job_id']
        get_object_or_404(OptimizationJob, id=job_id)
        return super().get(request, *args, **kwargs)


@extend_schema(
    summary="Get job status",
    description="Get current status of an optimization job"
)
@api_view(['GET'])
def job_status(request, job_id):
    """Get job status endpoint"""
    try:
        optimizer_service = OptimizerService()
        status_data = optimizer_service.get_job_status(str(job_id))
        
        if status_data:
            return Response(status_data)
        else:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Exception as e:
        return Response(
            {'error': f'Failed to get job status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="Health check",
    description="Check the health of the optimization service"
)
@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    try:
        # check database connectivity
        OptimizationJob.objects.exists()
        
        # check Redis connectivity
        from .services import RedisService
        redis_service = RedisService()
        redis_service.redis_client.ping()
        
        return Response({
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'services': {
                'database': 'ok',
                'redis': 'ok'
            }
        })
        
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@extend_schema(
    summary="Get recruitment optimization status",
    description="Get detailed status of optimization process for a recruitment, including progress estimation",
    parameters=[
        OpenApiParameter(
            name='mode',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Estimation mode: optimistic (default) or pessimistic',
            enum=['optimistic', 'pessimistic']
        ),
    ],
    responses={200: {'description': 'Optimization status details'}}
)
@api_view(['GET'])
def recruitment_optimization_status(request, recruitment_id):
    """
    Get detailed status of optimization process for a recruitment.
    Calculates progress based on optimization start/end dates and job history.
    """
    from scheduling.models import Recruitment
    import math
    from datetime import timedelta
    
    try:
        recruitment = get_object_or_404(Recruitment, recruitment_id=recruitment_id)
        
        # Filter out archived jobs as requested
        jobs = OptimizationJob.objects.filter(
            recruitment_id=recruitment_id
        ).exclude(status='archived').order_by('created_at')
        
        mode = request.query_params.get('mode', 'optimistic')
        now = timezone.now()
        
        # Basic config
        opt_start = recruitment.optimization_start_date
        opt_end = recruitment.optimization_end_date
        
        # If optimization hasn't started or dates are missing, return empty/draft state
        if not opt_start:
             return Response({
                'recruitment_id': str(recruitment.recruitment_id),
                'status': recruitment.plan_status,
                'meta': None,
                'estimates': None,
                'counts': {'completed': 0, 'current': 0, 'total': 0},
                'timeline': []
            })

        # 1. Analyze jobs history
        completed_durations = []
        gaps = []
        last_completed_at = None
        
        # We will build the timeline list with past/current jobs first
        timeline_events = []
        
        completed_count = 0
        
        for job in jobs:
            # Calculate duration and gaps
            if job.started_at and job.completed_at:
                duration = (job.completed_at - job.started_at).total_seconds()
                completed_durations.append(duration)
                completed_count += 1
                
                if last_completed_at:
                    gap = (job.started_at - last_completed_at).total_seconds()
                    if gap >= 0:
                        gaps.append(gap)
                last_completed_at = job.completed_at
                
                timeline_events.append({
                    'type': 'past',
                    'start_time': job.started_at,
                    'end_time': job.completed_at,
                    'status': job.status,
                    'id': str(job.id)
                })
                
            elif job.started_at and job.status in ['running', 'queued']:
                # Current running job
                # For timeline, we don't know end time yet, will estimate later
                timeline_events.append({
                    'type': 'current',
                    'start_time': job.started_at,
                    'end_time': None, # To be estimated
                    'status': job.status,
                    'id': str(job.id)
                })
                
                if last_completed_at:
                    gap = (job.started_at - last_completed_at).total_seconds()
                    if gap >= 0:
                        gaps.append(gap)

        # 2. Calculate Statistics (Averages)
        # Default to max_round_execution_time if no history
        avg_job_duration = float(recruitment.max_round_execution_time)
        if completed_durations:
            avg_job_duration = sum(completed_durations) / len(completed_durations)
            
        avg_gap_duration = 0.0
        if gaps:
            avg_gap_duration = sum(gaps) / len(gaps)
            
        # 3. Determine Estimation Parameters based on Mode
        if mode == 'pessimistic':
            est_job_duration = avg_job_duration
            est_gap_duration = avg_gap_duration
        else: # optimistic
            est_job_duration = float(recruitment.max_round_execution_time)
            est_gap_duration = 0.0 # Assume no gaps in optimistic mode
            
        cycle_time = est_job_duration + est_gap_duration
        if cycle_time <= 0:
            cycle_time = 1.0 # Avoid division by zero
            
        # 4. Calculate Estimated End Date and Remaining Jobs
        
        # Determine effective end date (if we are already past planned end, extend it)
        effective_end_date = opt_end
        if not effective_end_date:
             effective_end_date = now
             
        if now > effective_end_date and recruitment.plan_status in ['queued', 'optimizing']:
            effective_end_date = now
            
        # Calculate remaining time from NOW to effective_end_date
        original_window_remaining = 0.0
        if opt_end and now < opt_end:
            original_window_remaining = (opt_end - now).total_seconds()
            
        # Estimate how many MORE jobs can fit in the remaining window
        future_jobs_count = 0
        if recruitment.plan_status in ['queued', 'optimizing']:
            # Check if we have a current running job
            current_job_event = next((e for e in timeline_events if e['type'] == 'current'), None)
            
            if current_job_event:
                elapsed = (now - current_job_event['start_time']).total_seconds()
                remaining_current = max(0.0, est_job_duration - elapsed)
                
                # Update current job event with estimated end
                current_job_event['end_time'] = now + timedelta(seconds=remaining_current)
                
                # Subtract time for current job from window
                window_after_current = original_window_remaining - remaining_current
            else:
                window_after_current = original_window_remaining

            if window_after_current > 0:
                # How many full cycles fit?
                future_jobs_count = math.floor(window_after_current / cycle_time)
        
        # Total estimated jobs
        total_jobs_count = len(timeline_events) + future_jobs_count
        
        # Determine current display index
        if timeline_events and timeline_events[-1]['type'] == 'current':
            current_display_index = len(timeline_events)
        else:
            current_display_index = len(timeline_events) + 1
            
        # 5. Generate Future Timeline Events
        projection_start_time = now
        if timeline_events and timeline_events[-1]['type'] == 'current':
            projection_start_time = timeline_events[-1]['end_time']
            # Add gap after current job
            projection_start_time += timedelta(seconds=est_gap_duration)
        elif timeline_events and timeline_events[-1]['type'] == 'past':
             projection_start_time = now
        
        for i in range(future_jobs_count):
            start = projection_start_time
            end = start + timedelta(seconds=est_job_duration)
            
            timeline_events.append({
                'type': 'future',
                'start_time': start,
                'end_time': end,
                'status': 'predicted',
                'id': None
            })
            
            projection_start_time = end + timedelta(seconds=est_gap_duration)

        # Update effective_end_date to include the last predicted job end
        if timeline_events:
            last_event_end = timeline_events[-1]['end_time']
            if last_event_end and last_event_end > effective_end_date:
                effective_end_date = last_event_end

        # 7. Normalize Timeline (0.0 - 1.0)
        # Range is [opt_start, effective_end_date]
        total_span = (effective_end_date - opt_start).total_seconds()
        if total_span <= 0:
            total_span = 1.0 # Avoid division by zero
            
        normalized_timeline = []
        for event in timeline_events:
            if not event['start_time'] or not event['end_time']:
                continue
                
            start_offset = (event['start_time'] - opt_start).total_seconds()
            end_offset = (event['end_time'] - opt_start).total_seconds()
            
            norm_start = max(0.0, min(1.0, start_offset / total_span))
            norm_end = max(0.0, min(1.0, end_offset / total_span))
            
            normalized_timeline.append({
                'type': event['type'],
                'start': norm_start,
                'end': norm_end,
                'status': event['status'],
                'id': event['id']
            })

        # 7. Final Response Construction
        
        # Progress of NOW
        now_offset = (now - opt_start).total_seconds()
        now_progress = max(0.0, min(1.0, now_offset / total_span))
        
        # Remaining seconds
        total_remaining = max(0.0, (effective_end_date - now).total_seconds())
        
        # Current job remaining
        current_job_remaining = 0.0
        current_event = next((e for e in timeline_events if e['type'] == 'current'), None)
        if current_event:
            current_job_remaining = max(0.0, (current_event['end_time'] - now).total_seconds())
            
        response_data = {
            'recruitment_id': str(recruitment.recruitment_id),
            'status': recruitment.plan_status,
            'meta': {
                'start_date': opt_start,
                'estimated_end_date': effective_end_date,
                'now_progress': now_progress
            },
            'estimates': {
                'total_remaining_seconds': total_remaining,
                'current_job_remaining_seconds': current_job_remaining
            },
            'counts': {
                'completed': completed_count,
                'current': current_display_index,
                'total': total_jobs_count
            },
            'timeline': normalized_timeline
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get recruitment optimization status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="Force optimization for recruitment",
    description="Force start optimization for a recruitment by setting it to draft, updating dates, and triggering optimization",
    parameters=[
        OpenApiParameter(
            name='duration_seconds',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Duration of optimization in seconds (default: 120)',
            required=False
        ),
    ],
    responses={200: {'description': 'Optimization triggered successfully'}}
)
@api_view(['POST'])
def force_recruitment_optimization(request, recruitment_id):
    """
    Force optimization for a recruitment.
    Sets status to draft, updates optimization dates, and triggers optimization.
    """
    from scheduling.models import Recruitment
    from scheduling.services import check_and_trigger_optimizations
    
    try:
        recruitment = get_object_or_404(Recruitment, recruitment_id=recruitment_id)
        
        # Get duration from query params (default 120 seconds)
        duration_seconds = int(request.query_params.get('duration_seconds', 120))
        
        # Update recruitment
        now = timezone.now()
        
        recruitment.plan_status = 'draft'
        recruitment.optimization_start_date = now
        recruitment.optimization_end_date = now + timedelta(seconds=duration_seconds * 2.1)
        
        recruitment.max_round_execution_time = duration_seconds
        recruitment.save()
        
        logger.info(f"Forced optimization setup for recruitment {recruitment_id}: "
                   f"start={recruitment.optimization_start_date}, "
                   f"end={recruitment.optimization_end_date}")
        
        # archive all existing jobs for this recruitment
        OptimizationJob.objects.filter(recruitment_id=recruitment_id).update(status='archived')
        
        # Trigger optimization
        check_and_trigger_optimizations()
        
        return Response({
            'message': 'Optimization forced successfully',
            'recruitment_id': str(recruitment_id),
            'status': 'draft',
            'optimization_start_date': recruitment.optimization_start_date,
            'optimization_end_date': recruitment.optimization_end_date,
            'duration_seconds': duration_seconds
        })
        
    except Exception as e:
        logger.error(f"Failed to force optimization for recruitment {recruitment_id}: {str(e)}")
        return Response(
            {'error': f'Failed to force optimization: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
