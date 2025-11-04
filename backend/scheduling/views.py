from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Subject, SubjectGroup, Recruitment, Room, Tag, RoomTag, Meeting
from identity.permissions import IsOfficeUser

from .serializers import (
    SubjectSerializer,
    SubjectGroupSerializer,
    RecruitmentSerializer,
    RoomSerializer,
    TagSerializer,
    RoomTagSerializer,
    MeetingSerializer
)
from .services import get_active_meetings_for_room, get_users_for_recruitment


class BaseCrudView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]
    model = None
    serializer_class = None
    lookup_field = None

    def get(self, request, pk=None):
        if pk:
            instance = get_object_or_404(self.model, **{self.lookup_field: pk})
            serializer = self.serializer_class(instance)
            return Response(serializer.data)
        instances = self.model.objects.all()
        serializer = self.serializer_class(instances, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        instance = get_object_or_404(self.model, **{self.lookup_field: pk})
        serializer = self.serializer_class(instance, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        instance = get_object_or_404(self.model, **{self.lookup_field: pk})
        serializer = self.serializer_class(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        instance = get_object_or_404(self.model, **{self.lookup_field: pk})
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectView(BaseCrudView):
    model = Subject
    serializer_class = SubjectSerializer
    lookup_field = 'subject_id'


class SubjectGroupView(BaseCrudView):
    model = SubjectGroup
    serializer_class = SubjectGroupSerializer
    lookup_field = 'subject_group_id'


class RecruitmentView(BaseCrudView):
    model = Recruitment
    serializer_class = RecruitmentSerializer
    lookup_field = 'recruitment_id'


class RoomView(BaseCrudView):
    model = Room
    serializer_class = RoomSerializer
    lookup_field = 'room_id'


class TagView(BaseCrudView):
    model = Tag
    serializer_class = TagSerializer
    lookup_field = 'tag_id'


class RoomTagView(BaseCrudView):
    model = RoomTag
    serializer_class = RoomTagSerializer
    lookup_field = 'id'


class MeetingView(BaseCrudView):
    model = Meeting
    serializer_class = MeetingSerializer
    lookup_field = 'meeting_id'


User = get_user_model()

class ActiveMeetingsByRoomView(APIView):
    """Return all meetings for a room whose recruitment has plan_status == 'active'."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_pk):
        get_object_or_404(Room, **{'room_id': room_pk})
        qs = get_active_meetings_for_room(room_pk)
        serializer = MeetingSerializer(qs, many=True)
        return Response(serializer.data)


class UsersByRecruitmentView(APIView):
    """Return all users who belong to groups that have meetings in the given recruitment.

    Optional query parameter:
    - active=true|false (default false) — when true, only users from recruitments with plan_status='active' are returned.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, recruitment_pk):
        get_object_or_404(Recruitment, **{'recruitment_id': recruitment_pk})
        active_q = request.query_params.get('active', 'false').lower()
        active_only = active_q in ('1', 'true', 'yes')
        qs = get_users_for_recruitment(recruitment_pk, active_only=active_only)
        from identity.serializers import UserSerializer
        serializer = UserSerializer(qs, many=True)
        return Response(serializer.data)
