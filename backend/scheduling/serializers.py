from rest_framework import serializers
from .models import Subject, SubjectGroup, Recruitment, Room, Tag, RoomTag, Meeting, RoomRecruitment, SubjectTag
from preferences.models import Constraints
from preferences.views import DEFAULT_CONSTRAINTS


class SubjectSerializer(serializers.ModelSerializer):
    duration_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = Subject
        fields = '__all__'


class SubjectGroupSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    host_user_username = serializers.CharField(source='host_user.username', read_only=True)
    recruitment_name = serializers.CharField(source='recruitment.recruitment_name', read_only=True)
    
    class Meta:
        model = SubjectGroup
        fields = '__all__'


class RecruitmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recruitment
        fields = '__all__'
    
    def create(self, validated_data):
        recruitment = super().create(validated_data)
        # Create associated Constraints
        Constraints.objects.create(
            recruitment=recruitment,
            constraints_data=DEFAULT_CONSTRAINTS.copy()
        )
        return recruitment


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'


class RoomTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomTag
        fields = '__all__'


class MeetingSerializer(serializers.ModelSerializer):
    end_hour = serializers.ReadOnlyField()
    host_user = serializers.ReadOnlyField(source='subject_group.host_user.id')
    host_user_username = serializers.ReadOnlyField(source='subject_group.host_user.username')
    subject_name = serializers.CharField(source='subject_group.subject.subject_name', read_only=True)

    class Meta:
        model = Meeting
        fields = '__all__'


class RoomRecruitmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomRecruitment
        fields = '__all__'


class SubjectTagSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    tag_name = serializers.CharField(source='tag.tag_name', read_only=True)

    class Meta:
        model = SubjectTag
        fields = '__all__'



# DODANE: szczegółowe serializery do pełnego widoku spotkań
try:
    from identity.serializers import UserSerializer, GroupSerializer
except Exception:
    # W przypadku migracji / problemów z importem zapewniamy placeholdery
    class UserSerializer(serializers.Serializer):
        id = serializers.CharField(read_only=True)
        username = serializers.CharField(read_only=True)
    class GroupSerializer(serializers.Serializer):
        group_id = serializers.CharField(read_only=True)
        group_name = serializers.CharField(read_only=True)

class SubjectGroupDetailSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    host_user = UserSerializer(read_only=True)
    recruitment = RecruitmentSerializer(read_only=True)

    class Meta:
        model = SubjectGroup
        fields = ['subject_group_id', 'subject', 'host_user', 'recruitment']

class MeetingDetailSerializer(serializers.ModelSerializer):
    recruitment = RecruitmentSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    group = GroupSerializer(read_only=True)
    subject_group = SubjectGroupDetailSerializer(read_only=True)
    end_hour = serializers.ReadOnlyField()

    class Meta:
        model = Meeting
        fields = [
            'meeting_id', 'recruitment', 'subject_group', 'group', 'room',
            'start_timeslot', 'day_of_week', 'day_of_cycle', 'end_hour', 'start_time', 'end_time', 'duration'
        ]
