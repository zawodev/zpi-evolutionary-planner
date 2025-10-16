from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404

from identity.permissions import IsOfficeUser
from .models import Subject, Recruitment, Plan, Room, Tag, RoomTag, Meeting
from .serializers import (
    SubjectSerializer,
    RecruitmentSerializer,
    PlanSerializer,
    RoomSerializer,
    TagSerializer,
    RoomTagSerializer,
    MeetingSerializer
)


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


class RecruitmentView(BaseCrudView):
    model = Recruitment
    serializer_class = RecruitmentSerializer
    lookup_field = 'recruitment_id'


class PlanView(BaseCrudView):
    model = Plan
    serializer_class = PlanSerializer
    lookup_field = 'plan_id'


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
