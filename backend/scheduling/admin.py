from django.contrib import admin
from .models import Subject, SubjectGroup, Recruitment, Room, Tag, RoomTag, Meeting


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('subject_id', 'subject_name', 'duration_blocks', 'duration_minutes')
    search_fields = ('subject_name',)


@admin.register(SubjectGroup)
class SubjectGroupAdmin(admin.ModelAdmin):
    list_display = ('subject_group_id', 'subject', 'group', 'host_user', 'recruitment')
    list_filter = ('recruitment', 'subject', 'host_user')
    search_fields = ('subject__subject_name', 'group__group_name', 'host_user__username', 'recruitment__recruitment_name')
    raw_id_fields = ('subject', 'recruitment', 'group', 'host_user')


@admin.register(Recruitment)
class RecruitmentAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Recruitment._meta.fields]
    list_filter = ('cycle_type', 'plan_status')
    search_fields = ('recruitment_name',)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('room_id', 'building_name', 'room_number', 'capacity')
    list_filter = ('building_name',)
    search_fields = ('building_name', 'room_number')


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('tag_id', 'tag_name')
    search_fields = ('tag_name',)


@admin.register(RoomTag)
class RoomTagAdmin(admin.ModelAdmin):
    list_display = ('room', 'tag')
    list_filter = ('tag',)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = (
        'meeting_id',
        'get_subject',
        'get_group',
        'get_host_user',
        'room',
        'recruitment',
        'day_of_week',
        'start_hour',
        'get_end_hour',
    )
    list_filter = ('day_of_week', 'recruitment')
    search_fields = (
        'subject_group__subject__subject_name',
        'subject_group__group__group_name',
        'subject_group__host_user__first_name',
        'subject_group__host_user__last_name',
    )
    raw_id_fields = ('recruitment', 'subject_group', 'room', 'required_tag')
    
    def get_subject(self, obj):
        return obj.subject_group.subject.subject_name
    get_subject.short_description = 'Subject'
    get_subject.admin_order_field = 'subject_group__subject__subject_name'
    
    def get_group(self, obj):
        return obj.subject_group.group.group_name
    get_group.short_description = 'Group'
    get_group.admin_order_field = 'subject_group__group__group_name'
    
    def get_host_user(self, obj):
        return obj.subject_group.host_user.username
    get_host_user.short_description = 'Host User'
    get_host_user.admin_order_field = 'subject_group__host_user__username'
    
    def get_end_hour(self, obj):
        return obj.end_hour
    get_end_hour.short_description = 'End Hour'
