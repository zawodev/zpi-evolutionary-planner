from rest_framework import serializers
from .models import UserPreferences, Constraints, ManagementPreferences


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ['id', 'user', 'recruitment', 'preferences_data']
        read_only_fields = ['id']


class ConstraintsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Constraints
        fields = ['id', 'recruitment', 'constraints_data']
        read_only_fields = ['id']


class ManagementPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagementPreferences
        fields = ['id', 'recruitment', 'preferences_data']
        read_only_fields = ['id']
