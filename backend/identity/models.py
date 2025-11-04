import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('office', 'Office'),
        ('host', 'Host'),
        ('participant', 'Participant')
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant', null=False)
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='organizationid',
        related_name='users'
    )

    class Meta:
        db_table = 'identity_users'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


class Organization(models.Model):
    organization_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_name = models.CharField(max_length=255)

    class Meta:
        db_table = 'identity_organizations'

    def __str__(self):
        return self.organization_name


class Group(models.Model):
    group_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        db_column='organizationid',
        related_name='groups'
    )

    class Meta:
        db_table = 'identity_groups'

    def __str__(self):
        return self.group_name


class UserGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='userid',
        related_name='user_groups'
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        db_column='groupid',
        related_name='group_users'
    )

    class Meta:
        db_table = 'identity_usergroups'
        unique_together = ('user', 'group')

    def __str__(self):
        return f"{self.user} -> {self.group}"


class UserRecruitment(models.Model):
    """
    Many to many relationship between Users and Recruitments.
    Defines which users are participating in which recruitments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='userid',
        related_name='user_recruitments'
    )
    recruitment = models.ForeignKey(
        'scheduling.Recruitment',
        on_delete=models.CASCADE,
        db_column='recruitmentid',
        related_name='recruitment_users'
    )

    class Meta:
        db_table = 'identity_userrecruitments'
        unique_together = ('user', 'recruitment')

    def __str__(self):
        return f"{self.user} -> {self.recruitment.recruitment_name}"


class UserSubjects(models.Model):
    """
    Many to many relationship between Users and Subjects.
    Defines which subjects each user must complete.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='userid',
        related_name='user_subjects'
    )
    subject = models.ForeignKey(
        'scheduling.Subject',
        on_delete=models.CASCADE,
        db_column='subjectid',
        related_name='subject_users'
    )

    class Meta:
        db_table = 'identity_usersubjects'
        unique_together = ('user', 'subject')

    def __str__(self):
        return f"{self.user} -> {self.subject.subject_name}"
