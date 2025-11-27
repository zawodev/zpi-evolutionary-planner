from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

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
    responses={200: {'description': 'Optimization status details'}}
)
@api_view(['GET'])
def recruitment_optimization_status(request, recruitment_id):
    """
    Get detailed status of optimization process for a recruitment.
    Calculates progress based on optimization start/end dates and job history.
    """
    from scheduling.models import Recruitment
    from django.db.models import Avg, F, ExpressionWrapper, fields
    import math
    from datetime import timedelta
    
    try:
        recruitment = get_object_or_404(Recruitment, recruitment_id=recruitment_id)
        
        # Get all jobs for this recruitment
        jobs = OptimizationJob.objects.filter(recruitment_id=recruitment_id).order_by('created_at')
        
        # Basic recruitment info
        response_data = {
            'recruitment_id': str(recruitment_id),
            'optimization_start_date': recruitment.optimization_start_date,
            'optimization_end_date': recruitment.optimization_end_date,
            'max_round_execution_time': recruitment.max_round_execution_time,
            'plan_status': recruitment.plan_status,
            'jobs_count': jobs.count(),
            'jobs': []
        }
        
        # Process jobs
        completed_jobs_durations = []
        gaps = []
        last_completed_at = None
        last_started_at = None
        
        now = timezone.now()
        current_running_job_time_running = None
        
        for job in jobs:
            # Calculate extended fields
            time_running = None
            waiting_time = None
            
            if job.started_at:
                last_started_at = job.started_at
                waiting_time = (job.started_at - job.created_at).total_seconds()
                
                if job.completed_at:
                    time_running = (job.completed_at - job.started_at).total_seconds()
                    completed_jobs_durations.append(time_running)
                    
                    # Calculate gap from previous job completion to this job start
                    if last_completed_at:
                        gap = (job.started_at - last_completed_at).total_seconds()
                        # Only consider positive gaps (in case of clock skew or parallel weirdness)
                        if gap >= 0:
                            gaps.append(gap)
                    
                    last_completed_at = job.completed_at
                else:
                    # Job is running - calculate time from started to now
                    time_running = (now - job.started_at).total_seconds()
                    current_running_job_time_running = time_running
            
            job_data = {
                'id': str(job.id),
                'status': job.status,
                'created_at': job.created_at,
                'started_at': job.started_at,
                'completed_at': job.completed_at,
                'current_iteration': job.current_iteration,
                'time_running': time_running,
                'waiting_time': waiting_time
            }
            response_data['jobs'].append(job_data)
        
        # Calculate averages
        avg_execution_time = 0
        if completed_jobs_durations:
            avg_execution_time = sum(completed_jobs_durations) / len(completed_jobs_durations)
        else:
            # Fallback if no jobs completed yet
            avg_execution_time = recruitment.max_round_execution_time

        avg_gap_time = 0
        if gaps:
            avg_gap_time = sum(gaps) / len(gaps)

        # Calculate remaining time for running job
        current_running_job_remaining_time = 0
        if current_running_job_time_running is not None:
             current_running_job_remaining_time = max(0, avg_execution_time - current_running_job_time_running)

        # Calculate estimated end date
        estimated_end_date = recruitment.optimization_end_date
        if estimated_end_date:
             potential_end = now + timedelta(seconds=current_running_job_remaining_time)
             if potential_end > estimated_end_date:
                 estimated_end_date = potential_end
        
        response_data['estimated_end_date'] = estimated_end_date

        # Calculate progress metrics
        
        # 1. Linear time progress (0.0 - 1.0)
        time_progress = 0.0
        running_time = 0.0
        to_end_time = 0.0
        
        if recruitment.optimization_start_date:
             if recruitment.optimization_end_date and now > recruitment.optimization_end_date:
                 running_time = (recruitment.optimization_end_date - recruitment.optimization_start_date).total_seconds()
             else:
                 running_time = (now - recruitment.optimization_start_date).total_seconds()
             
        if recruitment.optimization_end_date:
             if now > recruitment.optimization_end_date:
                 to_end_time = 0.0
             else:
                 to_end_time = (recruitment.optimization_end_date - now).total_seconds()

        if recruitment.optimization_start_date and recruitment.optimization_end_date:
            total_duration = (recruitment.optimization_end_date - recruitment.optimization_start_date).total_seconds()
            if total_duration > 0:
                # Use running_time calculated above which handles the cap
                time_progress = max(0.0, min(1.0, running_time / total_duration))
        
        response_data['time_progress'] = time_progress
        response_data['running_time'] = running_time
        response_data['to_end_time'] = to_end_time
        
        # Estimated time progress
        estimated_time_progress = 0.0
        estimated_to_end_time = 0.0
        
        if estimated_end_date:
            if now > estimated_end_date:
                estimated_to_end_time = 0.0
            else:
                estimated_to_end_time = (estimated_end_date - now).total_seconds()
            
        if recruitment.optimization_start_date and estimated_end_date:
             total_estimated_duration = (estimated_end_date - recruitment.optimization_start_date).total_seconds()
             if total_estimated_duration > 0:
                 elapsed = (now - recruitment.optimization_start_date).total_seconds()
                 estimated_time_progress = max(0.0, min(1.0, elapsed / total_estimated_duration))
        
        response_data['estimated_time_progress'] = estimated_time_progress
        response_data['estimated_to_end_time'] = estimated_to_end_time
        
        # Current job cycle progress (start of job -> start of next job)
        current_job_estimated_time_progress = 0.0
        current_job_estimated_to_next_job_start = 0.0
        
        cycle_duration = avg_execution_time + avg_gap_time
        
        cycle_start_time = None
        if last_started_at:
            cycle_start_time = last_started_at
        elif recruitment.optimization_start_date and now >= recruitment.optimization_start_date:
            cycle_start_time = recruitment.optimization_start_date
            
        if cycle_start_time and cycle_duration > 0:
             time_in_cycle = (now - cycle_start_time).total_seconds()
             current_job_estimated_time_progress = max(0.0, min(1.0, time_in_cycle / cycle_duration))
             current_job_estimated_to_next_job_start = max(0.0, cycle_duration - time_in_cycle)
        
        response_data['current_job_estimated_time_progress'] = current_job_estimated_time_progress
        response_data['current_job_estimated_to_next_job_start'] = current_job_estimated_to_next_job_start

        # 2. Estimated iterations
        current_job_number = jobs.count()
        
        if recruitment.optimization_start_date and recruitment.optimization_end_date:
            # Calculate remaining time
            remaining_time = 0
            if now < recruitment.optimization_end_date:
                remaining_time = (recruitment.optimization_end_date - now).total_seconds()
            
            # Optimistic Estimate:
            # How many max_round_execution_time intervals fit in remaining time
            # Always calculated the same way regardless of history
            optimistic_remaining_jobs = 0
            if recruitment.max_round_execution_time > 0:
                optimistic_remaining_jobs = math.ceil(remaining_time / recruitment.max_round_execution_time)
            
            estimated_total_jobs_optimistic = current_job_number + optimistic_remaining_jobs
            
            # Pessimistic Estimate:
            # Based on history: avg execution time + avg gap time
            # avg_execution_time is already calculated above
            
            cycle_time_pessimistic = avg_execution_time + avg_gap_time
            
            pessimistic_remaining_jobs = 0
            if cycle_time_pessimistic > 0:
                pessimistic_remaining_jobs = math.floor(remaining_time / cycle_time_pessimistic)
            
            estimated_total_jobs_pessimistic = current_job_number + pessimistic_remaining_jobs
            
            response_data['estimation'] = {
                'optimistic_total': estimated_total_jobs_optimistic,
                'pessimistic_total': estimated_total_jobs_pessimistic,
                'avg_job_duration': avg_execution_time,
                'avg_wait_time': avg_gap_time
            }
            
            # Progress text using pessimistic estimate (realistic view)
            # If we are past end date, show actual/actual
            if now > recruitment.optimization_end_date:
                response_data['pessimistic_progress_text'] = f"{current_job_number}/{current_job_number}"
            else:
                response_data['pessimistic_progress_text'] = f"{current_job_number}/{estimated_total_jobs_pessimistic}"

            # Progress text using optimistic estimate (best case)
            if now > recruitment.optimization_end_date:
                response_data['optimistic_progress_text'] = f"{current_job_number}/{current_job_number}"
            else:
                response_data['optimistic_progress_text'] = f"{current_job_number}/{estimated_total_jobs_optimistic}"
        
        return Response(response_data)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get recruitment optimization status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
