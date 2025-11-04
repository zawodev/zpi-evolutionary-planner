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
