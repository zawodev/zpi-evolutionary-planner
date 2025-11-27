import random
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from identity.models import Organization, Group, UserGroup, UserRecruitment, UserSubjects
from scheduling.models import (
    Subject, Recruitment, SubjectGroup, Room, Tag, Meeting, RoomTag, RoomRecruitment, SubjectTag
)
from preferences.models import UserPreferences, Constraints, HeatmapCache
from optimizer.models import OptimizationJob, OptimizationProgress


class Command(BaseCommand):
    help = "Seed the database with demo data across identity, scheduling, preferences, and optimizer apps."

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Proceed even if some demo objects already exist (idempotent).')
        parser.add_argument('--seed', type=int, default=42, help='Random seed for reproducibility.')

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(options['seed'])
        User = get_user_model()

        self.stdout.write(self.style.NOTICE('Seeding demo data...'))

        # 1) Organizations
        org_alpha, _ = Organization.objects.get_or_create(organization_name='Demo Org Alpha')
        org_beta, _ = Organization.objects.get_or_create(organization_name='Demo Org Beta')
        orgs = [org_alpha, org_beta]

        # 2) Users (admin without org, office/host/participant within orgs)
        def ensure_user(username, role, org=None, first='First', last='Last'):
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'email': f'{username}@example.com',
                    'role': role,
                    'organization': org,
                }
            )
            if created:
                user.set_password('Password123!')
                user.save(update_fields=['password'])
            # keep role/org in sync if changed later
            changed = False
            if user.role != role:
                user.role = role
                changed = True
            if user.organization != org:
                user.organization = org
                changed = True
            if changed:
                user.save(update_fields=['role', 'organization'])
            return user

        admin = ensure_user('admin1', 'admin', None, 'Alice', 'Admin')

        office_alpha = ensure_user('alpha_office1', 'office', org_alpha, 'Olivia', 'Office')
        office_beta = ensure_user('beta_office1', 'office', org_beta, 'Oscar', 'Office')

        hosts_alpha = [
            ensure_user(f'alpha_host{i+1}', 'host', org_alpha, 'Helen', f'Alpha{i+1}')
            for i in range(3)
        ]
        hosts_beta = [
            ensure_user(f'beta_host{i+1}', 'host', org_beta, 'Henry', f'Beta{i+1}')
            for i in range(3)
        ]

        participants_alpha = [
            ensure_user(f'alpha_part{i+1}', 'participant', org_alpha, 'Pat', f'Alpha{i+1}')
            for i in range(15)
        ]
        participants_beta = [
            ensure_user(f'beta_part{i+1}', 'participant', org_beta, 'Pat', f'Beta{i+1}')
            for i in range(15)
        ]

        # 3) Groups per organization
        def ensure_group(org, name, category):
            grp, _ = Group.objects.get_or_create(organization=org, group_name=name, defaults={'category': category})
            if grp.category != category:
                grp.category = category
                grp.save(update_fields=['category'])
            return grp

        groups_alpha = [
            ensure_group(org_alpha, f'Alpha Group {i+1}', 'year1') for i in range(3)
        ]
        groups_beta = [
            ensure_group(org_beta, f'Beta Group {i+1}', 'year1') for i in range(3)
        ]

        # 4) Assign participants to groups (round-robin)
        def attach_users_to_groups(users, groups):
            for idx, user in enumerate(users):
                grp = groups[idx % len(groups)]
                UserGroup.objects.get_or_create(user=user, group=grp)

        attach_users_to_groups(participants_alpha, groups_alpha)
        attach_users_to_groups(participants_beta, groups_beta)

        # 5) Recruitments per organization (tworzymy przed Subject, bo Subject ma FK recruitment)
        def ensure_recruitment(org, name, status='active'):
            rec, _ = Recruitment.objects.get_or_create(
                organization=org,
                recruitment_name=name,
                defaults={
                    'cycle_type': 'weekly',
                    'plan_status': status,
                    'default_token_count': 3,
                    'max_round_execution_time': 300,
                }
            )
            if rec.plan_status != status:
                rec.plan_status = status
                rec.save(update_fields=['plan_status'])
            return rec

        rec_alpha_active = ensure_recruitment(org_alpha, 'Alpha Spring Recruitment', 'active')
        rec_alpha_draft = ensure_recruitment(org_alpha, 'Alpha Draft Recruitment', 'draft')
        rec_beta_active = ensure_recruitment(org_beta, 'Beta Spring Recruitment', 'active')

        # 6) Rooms (wymagają organization FK)
        def ensure_room(org, building, number, capacity):
            room, _ = Room.objects.get_or_create(
                organization=org,
                building_name=building,
                room_number=number,
                defaults={'capacity': capacity}
            )
            if room.capacity != capacity:
                room.capacity = capacity
                room.save(update_fields=['capacity'])
            return room

        rooms_alpha = [
            ensure_room(org_alpha, 'Alpha Building', 'A101', 20),
            ensure_room(org_alpha, 'Alpha Building', 'A102', 15),
        ]
        rooms_beta = [
            ensure_room(org_beta, 'Beta Building', 'B201', 25),
            ensure_room(org_beta, 'Beta Building', 'B202', 18),
        ]

        # 7) Tags
        tag_project, _ = Tag.objects.get_or_create(tag_name='projector')
        tag_lab, _ = Tag.objects.get_or_create(tag_name='lab')

        # RoomTag relations (a few examples per building)
        for room in rooms_alpha + rooms_beta:
            RoomTag.objects.get_or_create(room=room, tag=tag_project)
        for room in (rooms_alpha + rooms_beta)[::2]:
            RoomTag.objects.get_or_create(room=room, tag=tag_lab)

        # 8) Subjects per recruitment (Subject wymaga recruitment)
        def ensure_subject(recruitment, name, duration_blocks=4, capacity=3, min_students=1):
            sub, _ = Subject.objects.get_or_create(
                recruitment=recruitment,
                subject_name=name,
                defaults={
                    'duration_blocks': duration_blocks,
                    'capacity': capacity,
                    'min_students': min_students,
                }
            )
            # aktualizacja wartości jeśli się zmieniły
            changed = False
            if sub.duration_blocks != duration_blocks:
                sub.duration_blocks = duration_blocks; changed = True
            if sub.capacity != capacity:
                sub.capacity = capacity; changed = True
            if sub.min_students != min_students:
                sub.min_students = min_students; changed = True
            if changed:
                sub.save(update_fields=['duration_blocks', 'capacity', 'min_students'])
            return sub

        subjects_alpha_active = [
            ensure_subject(rec_alpha_active, 'Math 101'),
            ensure_subject(rec_alpha_active, 'Physics 101'),
            ensure_subject(rec_alpha_active, 'Chemistry 101'),
        ]
        subjects_alpha_draft = [
            ensure_subject(rec_alpha_draft, 'Math 101 Draft'),
            ensure_subject(rec_alpha_draft, 'Physics 101 Draft'),
        ]
        subjects_beta_active = [
            ensure_subject(rec_beta_active, 'Biology 101'),
            ensure_subject(rec_beta_active, 'History 101'),
            ensure_subject(rec_beta_active, 'Literature 101'),
        ]

        # 9) SubjectGroups (model już nie zawiera recruitment FK; relacja przez Subject.recruitment)
        def ensure_subject_groups(subjects, hosts):
            sgroups = []
            for i, sub in enumerate(subjects):
                host = hosts[i % len(hosts)]
                sg, _ = SubjectGroup.objects.get_or_create(
                    subject=sub,
                    host_user=host
                )
                sgroups.append(sg)
            return sgroups

        sgroups_alpha_active = ensure_subject_groups(subjects_alpha_active, hosts_alpha)
        sgroups_alpha_draft = ensure_subject_groups(subjects_alpha_draft, hosts_alpha)
        sgroups_beta_active = ensure_subject_groups(subjects_beta_active, hosts_beta)

        # 10) Meetings
        def ensure_meetings(recruitment, sgroups, groups, rooms, base_day_start=9):
            meetings = []
            for i, sg in enumerate(sgroups):
                for j, grp in enumerate(groups):
                    room = rooms[(i + j) % len(rooms)]
                    mtg, _ = Meeting.objects.get_or_create(
                        recruitment=recruitment,
                        subject_group=sg,
                        group=grp,
                        room=room,
                        start_timeslot=base_day_start + j,
                        day_of_week=(i + j) % 5,
                        day_of_cycle=(i + j) % 7,
                    )
                    meetings.append(mtg)
            return meetings

        meetings_alpha_active = ensure_meetings(rec_alpha_active, sgroups_alpha_active, groups_alpha, rooms_alpha)
        meetings_alpha_draft = ensure_meetings(rec_alpha_draft, sgroups_alpha_draft, groups_alpha, rooms_alpha)
        meetings_beta_active = ensure_meetings(rec_beta_active, sgroups_beta_active, groups_beta, rooms_beta)

        # 11) RoomRecruitment relacje (powiązanie pomieszczeń z rekrutacjami w organizacji)
        for room in rooms_alpha:
            for rec in [rec_alpha_active, rec_alpha_draft]:
                RoomRecruitment.objects.get_or_create(room=room, recruitment=rec)
        for room in rooms_beta:
            RoomRecruitment.objects.get_or_create(room=room, recruitment=rec_beta_active)

        # 12) Link users to recruitments (participants + hosts)
        def attach_users_to_recruitment(users, recruitment):
            for u in users:
                UserRecruitment.objects.get_or_create(user=u, recruitment=recruitment)

        attach_users_to_recruitment(participants_alpha + hosts_alpha, rec_alpha_active)
        attach_users_to_recruitment(participants_alpha[:10], rec_alpha_draft)
        attach_users_to_recruitment(participants_beta + hosts_beta, rec_beta_active)

        # 13) Preferences (sample structures)
        def sample_user_preferences(user, recruitment, groups_for_rec):
            timeslots_in_cycle = 7
            preferred_timeslots = [0 for _ in range(timeslots_in_cycle)]
            preferred_groups = [0 for _ in range(len(groups_for_rec))]
            return {
                'WidthHeightInfo': 0,
                'GapsInfo': [0, 0, 0],
                'PreferredTimeslots': preferred_timeslots,
                'PreferredGroups': preferred_groups,
            }

        def sample_host_preferences(host, recruitment):
            timeslots_in_cycle = 7
            preferred_timeslots = [0 for _ in range(timeslots_in_cycle)]
            return {
                'WidthHeightInfo': 0,
                'GapsInfo': [0, 0, 0],
                'PreferredTimeslots': preferred_timeslots,
            }

        for u in participants_alpha[:5]:
            UserPreferences.objects.get_or_create(
                user=u, recruitment=rec_alpha_active,
                defaults={'preferences_data': sample_user_preferences(u, rec_alpha_active, groups_alpha)}
            )
        for u in participants_beta[:5]:
            UserPreferences.objects.get_or_create(
                user=u, recruitment=rec_beta_active,
                defaults={'preferences_data': sample_user_preferences(u, rec_beta_active, groups_beta)}
            )
        for h in hosts_alpha[:2]:
            UserPreferences.objects.get_or_create(
                user=h, recruitment=rec_alpha_active,
                defaults={'preferences_data': sample_host_preferences(h, rec_alpha_active)}
            )
        for h in hosts_beta[:2]:
            UserPreferences.objects.get_or_create(
                user=h, recruitment=rec_beta_active,
                defaults={'preferences_data': sample_host_preferences(h, rec_beta_active)}
            )

        # 14) Constraints & HeatmapCache
        def build_constraints_for_recruitment(recruitment, groups_for_rec, rooms_for_rec, subjects_for_rec, students_for_rec, teachers_for_rec):
            timeslots_daily = 32
            days_in_cycle = 7
            subj_index = {s.subject_id: idx for idx, s in enumerate(subjects_for_rec)}
            room_index = {r.room_id: idx for idx, r in enumerate(rooms_for_rec)}
            group_index = {g.group_id: idx for idx, g in enumerate(groups_for_rec)}

            subjects_duration = [s.duration_blocks for s in subjects_for_rec]
            groups_per_subject = [len(groups_for_rec) for _ in subjects_for_rec]
            groups_capacity = [20 for _ in groups_for_rec]
            rooms_capacity = [r.capacity for r in rooms_for_rec]

            tag_list = list(Tag.objects.filter(tag_name__in=['projector', 'lab']).order_by('tag_name'))
            tag_index = {t.tag_id: idx for idx, t in enumerate(tag_list)}

            rooms_tags_pairs = []
            for r in rooms_for_rec:
                for rt in r.room_tags.select_related('tag').all():
                    if rt.tag_id in tag_index:
                        rooms_tags_pairs.append([room_index[r.room_id], tag_index[rt.tag.tag_id]])

            groups_tags_pairs = []

            students_subjects = []
            for stu in students_for_rec:
                subject_ids = list(UserSubjects.objects.filter(user=stu).values_list('subject__subject_id', flat=True))
                idxs = [subj_index[sid] for sid in subject_ids if sid in subj_index]
                students_subjects.append(idxs)

            teachers_groups = [[i for i in range(len(groups_for_rec))] for _ in teachers_for_rec]
            rooms_unavailability = [[] for _ in rooms_for_rec]
            students_unavailability = [[] for _ in students_for_rec]
            teachers_unavailability = [[] for _ in teachers_for_rec]

            return {
                'TimeslotsDaily': timeslots_daily,
                'DaysInCycle': days_in_cycle,
                'MinStudentsPerGroup': groups_capacity,
                'SubjectsDuration': subjects_duration,
                'GroupsPerSubject': groups_per_subject,
                'GroupsCapacity': groups_capacity,
                'RoomsCapacity': rooms_capacity,
                'GroupsTags': groups_tags_pairs,
                'RoomsTags': rooms_tags_pairs,
                'StudentsSubjects': students_subjects,
                'TeachersGroups': teachers_groups,
                'RoomsUnavailabilityTimeslots': rooms_unavailability,
                'StudentsUnavailabilityTimeslots': students_unavailability,
                'TeachersUnavailabilityTimeslots': teachers_unavailability,
            }

        recruitment_subject_map = {
            rec_alpha_active: subjects_alpha_active,
            rec_alpha_draft: subjects_alpha_draft,
            rec_beta_active: subjects_beta_active,
        }
        for rec, groups_for_rec, rooms_for_rec, students_for_rec, teachers_for_rec in [
            (rec_alpha_active, groups_alpha, rooms_alpha, participants_alpha, hosts_alpha),
            (rec_beta_active, groups_beta, rooms_beta, participants_beta, hosts_beta),
            (rec_alpha_draft, groups_alpha, rooms_alpha, participants_alpha, hosts_alpha),
        ]:
            subjects_for_rec = recruitment_subject_map[rec]
            Constraints.objects.get_or_create(
                recruitment=rec,
                defaults={'constraints_data': build_constraints_for_recruitment(
                    rec, groups_for_rec, rooms_for_rec, subjects_for_rec, students_for_rec[:10], teachers_for_rec[:3]
                )}
            )
            HeatmapCache.objects.get_or_create(
                recruitment=rec,
                defaults={
                    'last_updated': timezone.now(),
                    'cached_value': [
                        {'day_of_week': d, 'hour': 9 + d % 3, 'score': round(0.5 + d * 0.1, 2)}
                        for d in range(5)
                    ]
                }
            )

        # 15) Optimizer jobs (tylko aktywne rekrutacje)
        for rec in [rec_alpha_active, rec_beta_active]:
            subjects_for_rec = recruitment_subject_map[rec]
            job, _ = OptimizationJob.objects.get_or_create(
                recruitment=rec,
                status='queued',
                defaults={
                    'max_execution_time': 1200,
                    'problem_data': {
                        'recruitment_id': str(rec.recruitment_id),
                        'subjects': [s.subject_name for s in subjects_for_rec],
                        'groups': [g.group_name for g in (groups_alpha if rec.organization == org_alpha else groups_beta)],
                    },
                }
            )
            OptimizationProgress.objects.get_or_create(
                job=job,
                iteration=0,
                defaults={'best_solution': {'fitness': 0.0, 'details': 'initial'}}
            )

        # 16) UserSubjects: przypisz 2 losowe przedmioty z aktywnej rekrutacji organizacji
        for user in participants_alpha[:10]:
            subs = random.sample(subjects_alpha_active, k=min(2, len(subjects_alpha_active)))
            for sub in subs:
                UserSubjects.objects.get_or_create(user=user, subject=sub)
        for user in participants_beta[:10]:
            subs = random.sample(subjects_beta_active, k=min(2, len(subjects_beta_active)))
            for sub in subs:
                UserSubjects.objects.get_or_create(user=user, subject=sub)

        # SubjectTag assignments (po stworzeniu tagów i subjects)
        def assign_subject_tags(subjects, tags):
            for s in subjects:
                chosen = random.sample(tags, k=min(2, len(tags)))
                for t in chosen:
                    SubjectTag.objects.get_or_create(subject=s, tag=t)
        assign_subject_tags(subjects_alpha_active, [tag_project, tag_lab])
        assign_subject_tags(subjects_beta_active, [tag_project, tag_lab])

        self.stdout.write(self.style.SUCCESS('Demo data seeding complete (updated models).'))
