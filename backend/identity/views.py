from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Organization, Group, UserGroup
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, UserSerializer, OrganizationSerializer, GroupSerializer, UserGroupSerializer, OfficeCreateUserSerializer, PasswordChangeSerializer
)
from .services import get_active_meetings_for_user
from .permissions import IsAdminUser, IsOfficeUser

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
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            return Response({"detail": "Logged out"})
        except Exception:
            return Response({"detail": "Error logging out"}, status=400)


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