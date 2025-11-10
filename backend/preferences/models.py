from django.db import models
from identity.models import User
from scheduling.models import Recruitment
import uuid
from django.utils import timezone


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
    # preferences_data structure can be viewed in views.py
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
    # constraints_data structure can be viewed in views.py
    constraints_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'preferences_constraints'

    def __str__(self):
        return f"Constraints for {self.recruitment}"


class HeatmapCache(models.Model):
    """Cache for aggregated preferred timeslots per recruitment.

    Fields:
    - recruitment: FK to Recruitment (unique) - which recruitment the cache is for
    - last_updated: DateTime of last calculation
    - cached_value: JSONField storing the aggregated PreferredTimeslots (list)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recruitment = models.OneToOneField(
        Recruitment,
        on_delete=models.CASCADE,
        db_column='recruitmentid',
        related_name='heatmap_cache'
    )
    last_updated = models.DateTimeField(default=timezone.now)
    cached_value = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'preferences_heatmap_cache'

    def __str__(self):
        return f"HeatmapCache for {self.recruitment} (updated: {self.last_updated})"
