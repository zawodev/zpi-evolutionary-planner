from django.urls import path, include
from . import views

app_name = 'optimizer'

urlpatterns = [
    # jobs
    path('jobs/', views.OptimizationJobListCreateView.as_view(), name='job-list-create'),
    path('jobs/latest/', views.LatestOptimizationJobView.as_view(), name='job-latest'),
    path('jobs/recruitment/<uuid:recruitment_id>/latest/', views.LatestOptimizationJobView.as_view(), name='job-latest-recruitment'),
    path('jobs/<uuid:id>/', views.OptimizationJobDetailView.as_view(), name='job-detail'),
    path('jobs/<uuid:job_id>/cancel/', views.cancel_job, name='job-cancel'),
    path('jobs/<uuid:job_id>/status/', views.job_status, name='job-status'),
    path('jobs/<uuid:job_id>/progress/', views.OptimizationProgressListView.as_view(), name='job-progress'),
    
    # health check
    path('health/', views.health_check, name='health-check'),
]
