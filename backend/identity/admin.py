from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Organization, Group, UserGroup, UserRecruitment, UserSubjects


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role',)}),
    )


@admin.register(UserRecruitment)
class UserRecruitmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'recruitment')
    list_filter = ('recruitment',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'recruitment__recruitment_name')
    raw_id_fields = ('user', 'recruitment')


@admin.register(UserSubjects)
class UserSubjectsAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'subject')
    list_filter = ('subject',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'subject__subject_name')
    raw_id_fields = ('user', 'subject')


admin.site.register(Organization)
admin.site.register(Group)
admin.site.register(UserGroup)