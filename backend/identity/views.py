from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Organization, Group, UserGroup, UserRecruitment, UserSubjects
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, UserSerializer, OrganizationSerializer, GroupSerializer, UserGroupSerializer,
    UserRecruitmentSerializer, OfficeCreateUserSerializer, PasswordChangeSerializer, UserSubjectsSerializer
)
from .services import get_active_meetings_for_user, get_recruitments_for_user, get_groups_for_user
from .permissions import IsAdminUser, IsOfficeUser
import secrets
from django.conf import settings
import json
from scheduling.serializers import MeetingDetailSerializer, RecruitmentSerializer
from datetime import datetime

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        from django.contrib.auth import authenticate

        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)

        if not user:
            return Response({"detail": "Invalid logging credentials"}, status=400)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        user_data = UserSerializer(user).data

        response = Response({
            'refresh': refresh_token,
            'access': access_token,
            'user': user_data
        })

        secure_flag = not getattr(settings, 'DEBUG', True)

        response.set_cookie(
            key='refresh',
            value=refresh_token,
            httponly=True,
            secure=secure_flag,
            samesite='Lax',
            path='/'
        )
        response.set_cookie(
            key='access',
            value=access_token,
            httponly=True,
            secure=secure_flag,
            samesite='Lax',
            path='/'
        )
        response.set_cookie(
            key='user',
            value=json.dumps(user_data),
            httponly=False,
            secure=secure_flag,
            samesite='Lax',
            path='/'
        )

        return response


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh')
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception:
                    pass

            response = Response({"detail": "Logged out"})
            response.delete_cookie('refresh', path='/')
            response.delete_cookie('access', path='/')
            response.delete_cookie('user', path='/')
            return response
        except Exception:
            response = Response({"detail": "Error logging out"}, status=400)
            response.delete_cookie('refresh', path='/')
            response.delete_cookie('access', path='/')
            response.delete_cookie('user', path='/')
            return response


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class OrganizationAddView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrganizationDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)
        organization.delete()
        return Response({"detail": "Organization deleted"}, status=status.HTTP_204_NO_CONTENT)


class GroupAddView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def delete(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        group.delete()
        return Response({"detail": "Group deleted"}, status=status.HTTP_204_NO_CONTENT)


class UserGroupAddView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        """Add a user to a group.

        Body fields required:
        - user: user PK
        - group: group PK
        """
        serializer = UserGroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserGroupDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def delete(self, request):
        """Remove a user from a group.

        Body must include: user, group.
        Returns 404 if the relation does not exist.
        """
        user_id = request.data.get('user')
        group_id = request.data.get('group')

        if not user_id or not group_id:
            return Response(
                {"detail": "Required fields: user, group"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_group = UserGroup.objects.get(user_id=user_id, group_id=group_id)
            user_group.delete()
            return Response({"detail": "User removed from group"}, status=status.HTTP_204_NO_CONTENT)
        except UserGroup.DoesNotExist:
            return Response(
                {"detail": "Relation user–group does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )


class OfficeUserCreateView(APIView):
    """Create a user within the same organization as the requester.

    - Only users with role 'office' or 'admin' may access this endpoint (enforced by permission).
    - Created user's role must be one of: 'office', 'host', 'participant' (enforced by serializer).
    - Created user's organization is automatically set to the creator's organization.
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        serializer = OfficeCreateUserSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RandomOfficeUserCreateView(APIView):
    """Create a user within the same organization as the requester with random username and password.

    Behavior:
    - Same permission requirements as `OfficeUserCreateView` (office/admin only).
    - The request body must include all user fields except `username` and `password` (e.g., first_name, last_name, email, role).
    - `username` and `password` are generated server-side. The generated password is returned in the response
      so the caller can communicate it to the new user.
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        data = request.data.copy()

        max_attempts = 5
        username = None
        for _ in range(max_attempts):
            candidate = f"user_{secrets.token_hex(6)}"
            if not User.objects.filter(username=candidate).exists():
                username = candidate
                break

        if username is None:
            return Response({"detail": "Failed to generate unique username, try again"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        password = secrets.token_urlsafe(10)

        data['username'] = username
        data['password'] = password
        data['password2'] = password

        serializer = OfficeCreateUserSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            user_data = UserSerializer(user).data
            return Response({
                'user': user_data,
                'password': password
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SetUserPasswordView(APIView):
    """Set password for a given user — only the user themselves may change their password.

    Notes:
    - Only the authenticated user whose PK matches `user_pk` may change the password.
    - If you want admins/offices to be able to change other users' passwords, we can add that exception.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_pk):
        if str(request.user.pk) != str(user_pk):
            return Response({"detail": "You may only change your own password."}, status=status.HTTP_403_FORBIDDEN)

        user = request.user
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user)
            return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActiveMeetingsByUserView(APIView):
    """Zwraca meetingi użytkownika (host lub participant) z aktywnych rekrutacji, w zadanym przedziale dat.

    Query params (wymagane):
    - start_date YYYY-MM-DD
    - end_date YYYY-MM-DD
    Jeśli brak któregoś z parametrów -> 400.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _parse_date(self, value, name):
        if not value:
            raise ValueError(f'Missing {name}')
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            raise ValueError(f'Invalid {name} format, expected YYYY-MM-DD')

    def get(self, request, user_pk):
        user = get_object_or_404(User, pk=user_pk)
        start_raw = request.query_params.get('start_date')
        end_raw = request.query_params.get('end_date')
        try:
            start_date = self._parse_date(start_raw, 'start_date')
            end_date = self._parse_date(end_raw, 'end_date')
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if end_date < start_date:
            return Response({'detail': 'end_date earlier than start_date'}, status=status.HTTP_400_BAD_REQUEST)

        qs = get_active_meetings_for_user(user, start_date=start_date, end_date=end_date)
        serializer = MeetingDetailSerializer(qs, many=True)
        return Response({
            'user_id': str(user.id),
            'role': user.role,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'count': len(serializer.data),
            'results': serializer.data
        })


class UserRecruitmentAddView(APIView):
    """Add a user to a recruitment"""
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        serializer = UserRecruitmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserRecruitmentDeleteView(APIView):
    """Remove a user from a recruitment"""
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def delete(self, request):
        user_id = request.data.get('user')
        recruitment_id = request.data.get('recruitment')

        if not user_id or not recruitment_id:
            return Response(
                {"detail": "Both user and recruitment are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_recruitment = get_object_or_404(
            UserRecruitment,
            user_id=user_id,
            recruitment_id=recruitment_id
        )
        user_recruitment.delete()
        return Response({"detail": "User removed from recruitment"}, status=status.HTTP_204_NO_CONTENT)


class RecruitmentsByUserView(APIView):
    """Return all recruitments where the given user is a participant via groups that have meetings in those recruitments.

    Optional query parameter:
    - active=true|false (default false) — when true, only recruitments with plan_status='active' are returned.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_pk):
        get_object_or_404(User, pk=user_pk)
        active_q = request.query_params.get('active', 'false').lower()
        active_only = active_q in ('1', 'true', 'yes')
        qs = get_recruitments_for_user(user_pk, active_only=active_only)
        serializer = RecruitmentSerializer(qs, many=True)
        return Response(serializer.data)


class GroupsByUserView(APIView):
    """Return all groups the given user belongs to (via UserGroup relations)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_pk):
        get_object_or_404(User, pk=user_pk)
        qs = get_groups_for_user(user_pk)
        serializer = GroupSerializer(qs, many=True)
        return Response(serializer.data)


class OrganizationUsersView(APIView):
    """Return all users that belong to a given organization.

    Access rules:
    - Must be authenticated.
    - Allowed if the requesting user is an admin, OR the requesting user's organization matches the requested organization.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, organization_id):
        from .models import Organization
        org = get_object_or_404(Organization, pk=organization_id)
        requester = request.user
        if not (hasattr(requester, 'role') and requester.role == 'admin'):
            if requester.organization is None or str(requester.organization.organization_id) != str(organization_id):
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        qs = User.objects.filter(organization=org).order_by('username')
        serializer = UserSerializer(qs, many=True)
        return Response(serializer.data)


class OrganizationHostsView(APIView):
    """Return all users with role 'host' that belong to a given organization.

    Access rules:
    - Must be authenticated.
    - Allowed if the requesting user is an admin, OR the requesting user's organization matches the requested organization.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, organization_id):
        from .models import Organization
        org = get_object_or_404(Organization, pk=organization_id)
        requester = request.user
        if not (hasattr(requester, 'role') and requester.role == 'admin'):
            if requester.organization is None or str(requester.organization.organization_id) != str(organization_id):
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        qs = User.objects.filter(organization=org, role='host').order_by('username')
        serializer = UserSerializer(qs, many=True)
        return Response(serializer.data)


class OrganizationGroupsView(APIView):
    """Return all groups that belong to a given organization.

    Access rules:
    - Must be authenticated.
    - Allowed if the requesting user is an admin, OR the requesting user's organization matches the requested organization.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, organization_id):
        org = get_object_or_404(Organization, pk=organization_id)
        requester = request.user
        if not (hasattr(requester, 'role') and requester.role == 'admin'):
            if requester.organization is None or str(requester.organization.organization_id) != str(organization_id):
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        qs = Group.objects.filter(organization=org).order_by('group_name')
        serializer = GroupSerializer(qs, many=True)
        return Response(serializer.data)


class TokenRefreshCookieView(APIView):
    """Refresh access token using refresh token from cookie (or body) and set new access token in cookie.

    - Reads 'refresh' from request.COOKIES or from request.data['refresh'].
    - On success sets 'access' cookie (HttpOnly) and returns access token in body.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh') or request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token not provided'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
        except Exception as e:
            return Response({'detail': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({'access': new_access})
        secure_flag = not getattr(settings, 'DEBUG', True)
        response.set_cookie(
            key='access',
            value=new_access,
            httponly=True,
            secure=secure_flag,
            samesite='Lax',
            path='/'
        )
        return response


class UserUpdateView(APIView):
    """Update user data (no username or password changes).

    Access rules:
    - Only users with role 'admin' or 'office' (IsOfficeUser also allows admin).
    - Admin may edit any user.
    - Office may edit only users within their own organization.

    Payload may include any of: first_name, last_name, email, role, organization_id.
    organization_id: only admin may change/remove (set to null). Office cannot change or remove it.
    Role 'admin' cannot be assigned by an office user.
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def patch(self, request, user_pk):
        return self._update(request, user_pk, partial=True)

    def put(self, request, user_pk):
        return self._update(request, user_pk, partial=False)

    def _update(self, request, user_pk, partial):
        from .serializers import UserUpdateSerializer, UserSerializer
        target_user = get_object_or_404(User, pk=user_pk)
        serializer = UserUpdateSerializer(
            instance=target_user,
            data=request.data,
            partial=partial,
            context={'request': request, 'target_user': target_user}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(target_user).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RemoveUserFromOrganizationView(APIView):
    """Delete a user from the system.

    Behavior:
    - Permanently deletes the user account.
    - Allowed for admin (any user) or office user belonging to the same organization as the target user.

    Responses:
    - 204 on success.
    - 403 if requester lacks permission.
    - 404 if user does not exist.
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def delete(self, request, user_pk):
        target_user = get_object_or_404(User, pk=user_pk)

        requester = request.user
        # Admin always allowed
        if not (hasattr(requester, 'role') and requester.role == 'admin'):
            # Office user must belong to same organization
            if requester.organization is None or requester.organization != target_user.organization:
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # Perform full deletion of the user
        target_user.delete()
        return Response({"detail": "User deleted"}, status=status.HTTP_204_NO_CONTENT)


class UserSubjectsAddView(APIView):
    """Add a user-subject relation"""
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        serializer = UserSubjectsSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserSubjectsDeleteView(APIView):
    """Remove a user-subject relation"""
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def delete(self, request):
        user_id = request.data.get('user')
        subject_id = request.data.get('subject')
        if not user_id or not subject_id:
            return Response({"detail": "Both user and subject are required"}, status=status.HTTP_400_BAD_REQUEST)
        relation = get_object_or_404(UserSubjects, user_id=user_id, subject_id=subject_id)
        relation.delete()
        return Response({"detail": "User removed from subject"}, status=status.HTTP_204_NO_CONTENT)


class SubjectsByUserView(APIView):
    """Return all subject relations (UserSubjects) for a given user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_pk):
        get_object_or_404(User, pk=user_pk)
        relations = UserSubjects.objects.filter(user_id=user_pk).select_related('subject', 'subject__recruitment', 'user')
        serializer = UserSubjectsSerializer(relations, many=True)
        return Response(serializer.data)


class UsersBySubjectView(APIView):
    """Return all user relations (UserSubjects) for a given subject."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, subject_pk):
        from scheduling.models import Subject
        get_object_or_404(Subject, pk=subject_pk)
        relations = UserSubjects.objects.filter(subject_id=subject_pk).select_related('subject', 'subject__recruitment', 'user')
        serializer = UserSubjectsSerializer(relations, many=True)
        return Response(serializer.data)


class BulkAddGroupUsersToRecruitmentView(APIView):
    """Bulk add all users belonging to a given group to a recruitment.

    Request body must include:
    - group: UUID of the group
    - recruitment: UUID of the recruitment

    Rules:
    - Only admin or office (IsOfficeUser) may call this endpoint.
    - Office users may only operate within their own organization.
    - Group.organization must match Recruitment.organization.

    Response JSON:
    {
      "group": <group uuid>,
      "recruitment": <recruitment uuid>,
      "created_count": <number of new relations>,
      "skipped_existing": <number of users already in recruitment>,
      "users_added": [list of user UUIDs added],
      "total_users_in_group": <size of group>
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        from scheduling.models import Recruitment
        group_id = request.data.get('group')
        recruitment_id = request.data.get('recruitment')
        if not group_id or not recruitment_id:
            return Response({"detail": "Required fields: group, recruitment"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            group = Group.objects.select_related('organization').get(pk=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "Group not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            recruitment = Recruitment.objects.select_related('organization').get(pk=recruitment_id)
        except Recruitment.DoesNotExist:
            return Response({"detail": "Recruitment not found"}, status=status.HTTP_404_NOT_FOUND)

        # Organization consistency check
        if group.organization_id != recruitment.organization_id:
            return Response({"detail": "Group and Recruitment must belong to the same organization"}, status=status.HTTP_400_BAD_REQUEST)

        requester = request.user
        if requester.role != 'admin':
            if requester.organization_id != group.organization_id:
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        user_ids_in_group = list(UserGroup.objects.filter(group=group).values_list('user_id', flat=True))
        if not user_ids_in_group:
            return Response({"detail": "Group has no users"}, status=status.HTTP_400_BAD_REQUEST)

        existing_user_ids = set(UserRecruitment.objects.filter(recruitment=recruitment, user_id__in=user_ids_in_group).values_list('user_id', flat=True))
        to_create = [uid for uid in user_ids_in_group if uid not in existing_user_ids]

        new_relations = [UserRecruitment(user_id=uid, recruitment=recruitment) for uid in to_create]
        if new_relations:
            UserRecruitment.objects.bulk_create(new_relations, ignore_conflicts=True)

        return Response({
            "group": str(group.group_id),
            "recruitment": str(recruitment.recruitment_id),
            "created_count": len(to_create),
            "skipped_existing": len(existing_user_ids),
            "users_added": to_create,
            "total_users_in_group": len(user_ids_in_group)
        }, status=status.HTTP_201_CREATED)


class BulkAddGroupUsersToSubjectView(APIView):
    """Bulk add all users belonging to a given group to a subject.

    Request body must include:
    - group: UUID of the group
    - subject: UUID of the subject

    Rules:
    - Only admin or office (IsOfficeUser) may call this endpoint.
    - Office users may only operate within their own organization.
    - Group.organization must match Subject.recruitment.organization.

    Response JSON:
    {
      "group": <group uuid>,
      "subject": <subject uuid>,
      "created_count": <number of new relations>,
      "skipped_existing": <number of users already linked>,
      "users_added": [list of user UUIDs added],
      "total_users_in_group": <size of group>
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        from scheduling.models import Subject
        group_id = request.data.get('group')
        subject_id = request.data.get('subject')
        if not group_id or not subject_id:
            return Response({"detail": "Required fields: group, subject"}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch group
        try:
            group = Group.objects.select_related('organization').get(pk=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        # Fetch subject and its recruitment organization
        try:
            subject = Subject.objects.select_related('recruitment', 'recruitment__organization').get(pk=subject_id)
        except Subject.DoesNotExist:
            return Response({"detail": "Subject not found"}, status=status.HTTP_404_NOT_FOUND)

        subject_org_id = getattr(subject.recruitment.organization, 'organization_id', None)
        if not subject_org_id:
            return Response({"detail": "Subject recruitment lacks organization"}, status=status.HTTP_400_BAD_REQUEST)

        # Organization consistency check
        if group.organization_id != subject_org_id:
            return Response({"detail": "Group and Subject must belong to the same organization"}, status=status.HTTP_400_BAD_REQUEST)

        requester = request.user
        if requester.role != 'admin':
            if requester.organization_id != group.organization_id:
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # Collect users in group
        user_ids_in_group = list(UserGroup.objects.filter(group=group).values_list('user_id', flat=True))
        if not user_ids_in_group:
            return Response({"detail": "Group has no users"}, status=status.HTTP_400_BAD_REQUEST)

        # Existing relations
        existing_user_ids = set(UserSubjects.objects.filter(subject_id=subject_id, user_id__in=user_ids_in_group).values_list('user_id', flat=True))
        to_create = [uid for uid in user_ids_in_group if uid not in existing_user_ids]

        new_relations = [UserSubjects(user_id=uid, subject=subject) for uid in to_create]
        if new_relations:
            UserSubjects.objects.bulk_create(new_relations, ignore_conflicts=True)

        return Response({
            "group": str(group.group_id),
            "subject": str(subject.subject_id),
            "created_count": len(to_create),
            "skipped_existing": len(existing_user_ids),
            "users_added": to_create,
            "total_users_in_group": len(user_ids_in_group)
        }, status=status.HTTP_201_CREATED)