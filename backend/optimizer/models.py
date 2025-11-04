from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
import json
import uuid


class OptimizationJob(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recruitment = models.ForeignKey('scheduling.Recruitment', on_delete=models.CASCADE, related_name='optimization_jobs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    max_execution_time = models.IntegerField(help_text="Maximum execution time in seconds")
    problem_data = models.JSONField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    error_message = models.TextField(blank=True, null=True)
    final_solution = models.JSONField(null=True, blank=True)
    
    current_iteration = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Job {self.id} - {self.status}"


class OptimizationProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(OptimizationJob, on_delete=models.CASCADE, related_name='progress_updates')
    iteration = models.IntegerField()
    # is_final_iteration = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # best solution data (includes fitness and all solution details such as genotype)
    best_solution = models.JSONField()
    
    class Meta:
        ordering = ['-timestamp']
        unique_together = ['job', 'iteration']
    
    def __str__(self):
        return f"Progress for Job {self.job.id} - Iteration {self.iteration}"


