from django.contrib import admin
from .models import OptimizationJob, OptimizationProgress


@admin.register(OptimizationJob)
class OptimizationJobAdmin(admin.ModelAdmin):
    list_display = [field.name for field in OptimizationJob._meta.fields if field.name != 'problem_data' and field.name != 'final_solution']
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'recruitment__recruitment_name']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'started_at', 'completed_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'recruitment', 'status', 'max_execution_time')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at')
        }),
        ('Progress', {
            'fields': ('current_iteration',)
        }),
        ('Results', {
            'fields': ('final_solution', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Problem Data', {
            'fields': ('problem_data',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recruitment')


@admin.register(OptimizationProgress)
class OptimizationProgressAdmin(admin.ModelAdmin):
    list_display = [field.name for field in OptimizationProgress._meta.fields if field.name != 'best_solution']
    list_filter = ['timestamp', 'job__status']
    search_fields = ['job__id']
    readonly_fields = ['timestamp']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('job', 'iteration', 'timestamp')
        }),
        ('Solution Data', {
            'fields': ('best_solution',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('job')
