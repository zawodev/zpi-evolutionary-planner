from django.db import models
from identity.models import User
from scheduling.models import Recruitment
import uuid


class UserPreferences(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='userid',
        related_name='user_preferences'
    )
    recruitment = models.ForeignKey(
        Recruitment,
        on_delete=models.CASCADE,
        db_column='recruitmentid',
        related_name='user_preferences'
    )
    preferences_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'preferences_user_preferences'
        unique_together = ['user', 'recruitment']

    def __str__(self):
        return f"UserPreferences for {self.user} in {self.recruitment}"


class Constraints(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recruitment = models.OneToOneField(
        Recruitment,
        on_delete=models.CASCADE,
        db_column='recruitmentid',
        related_name='constraints'
    )
    constraints_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'preferences_constraints'

    def __str__(self):
        return f"Constraints for {self.recruitment}"


class ManagementPreferences(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recruitment = models.OneToOneField(
        Recruitment,
        on_delete=models.CASCADE,
        db_column='recruitmentid',
        related_name='management_preferences'
    )
    preferences_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'preferences_management_preferences'

    def __str__(self):
        return f"ManagementPreferences for {self.recruitment}"
