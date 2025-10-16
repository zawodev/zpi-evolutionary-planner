from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Allows access only for user with 'admin' role.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsOfficeUser(permissions.BasePermission):
    """
    Allows access only for user with 'office' role.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'office' or request.user.role == 'admin')