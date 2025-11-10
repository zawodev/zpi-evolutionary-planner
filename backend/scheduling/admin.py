from django.contrib import admin
from .models import Subject, SubjectGroup, Recruitment, Room, Tag, RoomTag, Meeting


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Subject._meta.fields]
    search_fields = ('subject_name',)


@admin.register(SubjectGroup)
class SubjectGroupAdmin(admin.ModelAdmin):
    list_display = [field.name for field in SubjectGroup._meta.fields]
    list_filter = ('recruitment', 'subject', 'host_user')
    search_fields = ('subject__subject_name', 'host_user__username', 'recruitment__recruitment_name')
    raw_id_fields = ('subject', 'recruitment', 'host_user')


@admin.register(Recruitment)
class RecruitmentAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Recruitment._meta.fields]
    list_filter = ('cycle_type', 'plan_status')
    search_fields = ('recruitment_name',)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Room._meta.fields]
    list_filter = ('building_name',)
    search_fields = ('building_name', 'room_number')


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Tag._meta.fields]
    search_fields = ('tag_name',)


@admin.register(RoomTag)
class RoomTagAdmin(admin.ModelAdmin):
    list_display = [field.name for field in RoomTag._meta.fields]
    list_filter = ('tag',)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Meeting._meta.fields]
    list_filter = ('day_of_week', 'recruitment')
    search_fields = (
        'subject_group__subject__subject_name',
        'group__group_name',
        'subject_group__host_user__first_name',
        'subject_group__host_user__last_name',
    )
    raw_id_fields = ('recruitment', 'subject_group', 'group', 'room', 'required_tag')
