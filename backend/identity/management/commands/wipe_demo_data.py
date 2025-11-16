from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from identity.models import Organization, Group, UserGroup, UserRecruitment, UserSubjects
from scheduling.models import Subject, Recruitment, SubjectGroup, Room, Tag, Meeting, RoomTag
from preferences.models import UserPreferences, Constraints, HeatmapCache
from optimizer.models import OptimizationJob, OptimizationProgress


class Command(BaseCommand):
    help = "Wipe demo/application data from the database in a safe order. By default keeps superusers."

    def add_arguments(self, parser):
        parser.add_argument('--remove-superusers', action='store_true', help='Also remove superusers (dangerous).')

    @transaction.atomic
    def handle(self, *args, **options):
        keep_superusers = not options['remove_superusers']
        User = get_user_model()

        self.stdout.write(self.style.NOTICE('Wiping data...'))

        # 1) Optimizer
        OptimizationProgress.objects.all().delete()
        OptimizationJob.objects.all().delete()

        # 2) Preferences
        HeatmapCache.objects.all().delete()
        Constraints.objects.all().delete()
        UserPreferences.objects.all().delete()

        # 3) Scheduling — meetings must be deleted instance-by-instance to trigger custom delete()
        for m in Meeting.objects.all():
            m.delete()
        SubjectGroup.objects.all().delete()
        Recruitment.objects.all().delete()
        RoomTag.objects.all().delete()
        Room.objects.all().delete()
        Tag.objects.all().delete()

        # 4) Identity relations
        UserRecruitment.objects.all().delete()
        UserSubjects.objects.all().delete()
        UserGroup.objects.all().delete()

        # 5) Identity core
        Group.objects.all().delete()
        Organization.objects.all().delete()

        # 6) Users
        if keep_superusers:
            User.objects.filter(is_superuser=False).delete()
        else:
            User.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Data wipe complete.'))

