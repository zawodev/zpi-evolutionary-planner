from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Organization, Group, UserGroup, UserRecruitment
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, UserSerializer, OrganizationSerializer, GroupSerializer, UserGroupSerializer,
    UserRecruitmentSerializer, OfficeCreateUserSerializer, PasswordChangeSerializer
)
from .services import get_active_meetings_for_user, get_recruitments_for_user
from .permissions import IsAdminUser, IsOfficeUser
import secrets
from django.conf import settings
import json

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

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

        payload = {
            'user': user_data,
        }

        # build response body (still include tokens in body for clients that don't use cookies)
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
        """
        Dodaj użytkownika do grupy.
        """
        serializer = UserGroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserGroupDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def delete(self, request):
        """
        Usuń użytkownika z grupy (wymaga user i group w body).
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
            # include plaintext password in response so caller can distribute it
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
    """Return all meetings where the given user is host_user and the recruitment is active."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_pk):
        get_object_or_404(User, pk=user_pk)
        from scheduling.serializers import MeetingSerializer
        qs = get_active_meetings_for_user(user_pk)
        serializer = MeetingSerializer(qs, many=True)
        return Response(serializer.data)


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
        from scheduling.serializers import RecruitmentSerializer
        qs = get_recruitments_for_user(user_pk, active_only=active_only)
        serializer = RecruitmentSerializer(qs, many=True)
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

