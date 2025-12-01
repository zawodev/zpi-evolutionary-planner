from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Subject, SubjectGroup, Recruitment, Room, Tag, RoomTag, Meeting, RoomRecruitment, SubjectTag
from identity.permissions import IsOfficeUser

from .serializers import (
    SubjectSerializer,
    SubjectGroupSerializer,
    RecruitmentSerializer,
    RoomSerializer,
    TagSerializer,
    RoomTagSerializer,
    MeetingSerializer,
    RoomRecruitmentSerializer,
    MeetingDetailSerializer,
    SubjectTagSerializer,
)
from .services import get_active_meetings_for_room, get_users_for_recruitment
from identity.models import UserRecruitment
from identity.serializers import UserSerializer


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


class SubjectGroupCreateWithRecruitmentView(APIView):
    """Create SubjectGroup and automatically link the host user to the subject's recruitment.

    Request body must include:
    - subject (UUID) — existing Subject ID
    - host_user (UUID) — existing User ID

    Side effects:
    - Creates UserRecruitment(user=host_user, recruitment=subject.recruitment) if missing.
    """
    permission_classes = [permissions.IsAuthenticated, IsOfficeUser]

    def post(self, request):
        serializer = SubjectGroupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        subject_id = serializer.validated_data.get('subject').subject_id if serializer.validated_data.get('subject') else request.data.get('subject')
        host_user = serializer.validated_data.get('host_user')

        subject = get_object_or_404(Subject, subject_id=subject_id)
        recruitment = subject.recruitment

        subject_group = serializer.save()

        UserRecruitment.objects.get_or_create(user=host_user, recruitment=recruitment)

        out_serializer = SubjectGroupSerializer(subject_group)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)


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


class RoomRecruitmentView(BaseCrudView):
    model = RoomRecruitment
    serializer_class = RoomRecruitmentSerializer
    lookup_field = 'id'


class SubjectTagView(BaseCrudView):
    model = SubjectTag
    serializer_class = SubjectTagSerializer
    lookup_field = 'id'


User = get_user_model()

class ActiveMeetingsByRoomView(APIView):
    """Zwraca meetingi pokoju z aktywnych rekrutacji, w zadanym przedziale dat (format jak w ActiveMeetingsByUserView).

    Query params (wymagane):
    - start_date YYYY-MM-DD
    - end_date YYYY-MM-DD
    Jeśli brak któregoś z parametrów -> 400.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _parse_date(self, value, name):
        from datetime import datetime
        if not value:
            raise ValueError(f'Missing {name}')
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            raise ValueError(f'Invalid {name} format, expected YYYY-MM-DD')

    def get(self, request, room_pk):
        room = get_object_or_404(Room, **{'room_id': room_pk})
        start_raw = request.query_params.get('start_date')
        end_raw = request.query_params.get('end_date')
        try:
            start_date = self._parse_date(start_raw, 'start_date')
            end_date = self._parse_date(end_raw, 'end_date')
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if end_date < start_date:
            return Response({'detail': 'end_date earlier than start_date'}, status=status.HTTP_400_BAD_REQUEST)

        qs = get_active_meetings_for_room(room_pk, start_date=start_date, end_date=end_date)
        serializer = MeetingDetailSerializer(qs, many=True)
        return Response({
            'room_id': str(room.room_id),
            'room_name': getattr(room, 'room_name', None),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'count': len(serializer.data),
            'results': serializer.data
        })


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


class TagsByRoomView(APIView):
    """Return all tags assigned to a given room via RoomTag relations."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_pk):
        get_object_or_404(Room, **{'room_id': room_pk})
        tags_qs = Tag.objects.filter(tagged_rooms__room_id=room_pk).distinct().order_by('tag_name')
        serializer = TagSerializer(tags_qs, many=True)
        return Response(serializer.data)


class TagsBySubjectView(APIView):
    """Return all tags assigned to a given subject via SubjectTag relations."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, subject_pk):
        get_object_or_404(Subject, **{'subject_id': subject_pk})
        tags_qs = Tag.objects.filter(tagged_subjects__subject_id=subject_pk).distinct().order_by('tag_name')
        serializer = TagSerializer(tags_qs, many=True)
        return Response(serializer.data)
