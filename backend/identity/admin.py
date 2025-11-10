from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Organization, Group, UserGroup, UserRecruitment, UserSubjects


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'organization')}),
    )


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Organization._meta.fields]
    search_fields = ('organization_name',)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Group._meta.fields]
    list_filter = ('category', 'organization')
    search_fields = ('group_name', 'category')


@admin.register(UserGroup)
class UserGroupAdmin(admin.ModelAdmin):
    list_display = [field.name for field in UserGroup._meta.fields]
    list_filter = ('group',)
    search_fields = ('user__username', 'group__group_name')
    raw_id_fields = ('user', 'group')


@admin.register(UserRecruitment)
class UserRecruitmentAdmin(admin.ModelAdmin):
    list_display = [field.name for field in UserRecruitment._meta.fields]
    list_filter = ('recruitment',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'recruitment__recruitment_name')
    raw_id_fields = ('user', 'recruitment')


@admin.register(UserSubjects)
class UserSubjectsAdmin(admin.ModelAdmin):
    list_display = [field.name for field in UserSubjects._meta.fields]
    list_filter = ('subject',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'subject__subject_name')
    raw_id_fields = ('user', 'subject')