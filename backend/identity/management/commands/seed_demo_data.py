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

        # Ensure superuser 'admin' with password 'admin' exists for demo access
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True,
                'role': 'admin' if hasattr(User, 'role') else None,
            }
        )
        # Guarantee flags and password regardless of prior existence (demo convenience)
        needs_save = False
        if not getattr(admin_user, 'is_staff', False):
            admin_user.is_staff = True; needs_save = True
        if not getattr(admin_user, 'is_superuser', False):
            admin_user.is_superuser = True; needs_save = True
        if hasattr(admin_user, 'role') and getattr(admin_user, 'role', None) != 'admin':
            admin_user.role = 'admin'; needs_save = True
        # Always set the demo password
        admin_user.set_password('admin'); needs_save = True
        if needs_save:
            admin_user.save()
        self.stdout.write(self.style.SUCCESS("Superuser ensured: username='admin', password='admin'"))

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
                # losowa waga 1-10 dla demo (uczestnicy/hostowie); admin/office stała 5
                if role in ['host', 'participant']:
                    user.weight = random.randint(1, 10)
                user.save(update_fields=['password', 'weight'])
            # keep role/org in sync if changed later
            changed = False
            if user.role != role:
                user.role = role; changed = True
            if user.organization != org:
                user.organization = org; changed = True
            # jeśli rola host/participant i waga domyślna, ustaw pseudo-losową dla spójności
            if role in ['host', 'participant'] and user.weight == 5:
                user.weight = random.randint(1, 10); changed = True
            if changed:
                user.save(update_fields=['role', 'organization', 'weight'])
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

        rec_alpha_active = ensure_recruitment(org_alpha, 'Alpha Spring Recruitment', 'archived')
        rec_alpha_draft = ensure_recruitment(org_alpha, 'Alpha Draft Recruitment', 'archived')
        rec_beta_active = ensure_recruitment(org_beta, 'Beta Spring Recruitment', 'archived')

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

        # 7) Tags per organization (Tag ma teraz FK do Organization).
        # org_tags = {}
        # for org in [org_alpha, org_beta]:
        #     t_proj, _ = Tag.objects.get_or_create(tag_name=f'projector-{org.organization_name.lower().replace(" ", "-")}', organization=org)
        #     t_lab, _ = Tag.objects.get_or_create(tag_name=f'lab-{org.organization_name.lower().replace(" ", "-")}', organization=org)
        #     org_tags[org] = {'projector': t_proj, 'lab': t_lab}

        # 8) Subjects per recruitment (Subject wymaga recruitment)
        def ensure_subject(recruitment, name, duration_blocks=4, capacity=30, min_students=1):
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
            ensure_subject(rec_alpha_active, 'Math Alpha 101'),
            ensure_subject(rec_alpha_active, 'Physics Alpha 101'),
            ensure_subject(rec_alpha_active, 'Chemistry Alpha 101'),
            ensure_subject(rec_alpha_active, 'Biology Alpha 101'),
            ensure_subject(rec_alpha_active, 'History Alpha 101'),
            ensure_subject(rec_alpha_active, 'Literature Alpha 101'),
            ensure_subject(rec_alpha_active, 'Computer Science Alpha 101'),
            ensure_subject(rec_alpha_active, 'Philosophy Alpha 101'),
        ]
        subjects_alpha_draft = [
            ensure_subject(rec_alpha_draft, 'Math 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'Physics 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'Chemistry 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'Biology 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'History 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'Literature 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'Computer Science 101 Alpha Draft'),
            ensure_subject(rec_alpha_draft, 'Philosophy 101 Alpha Draft'),
        ]
        subjects_beta_active = [
            ensure_subject(rec_beta_active, 'Biology Beta 101'),
            ensure_subject(rec_beta_active, 'History Beta 101'),
            ensure_subject(rec_beta_active, 'Literature Beta 101'),
            ensure_subject(rec_beta_active, 'Math Beta 101'),
            ensure_subject(rec_beta_active, 'Physics Beta 101'),
            ensure_subject(rec_beta_active, 'Chemistry Beta 101'),
            ensure_subject(rec_beta_active, 'Computer Science Beta 101'),
            ensure_subject(rec_beta_active, 'Philosophy Beta 101'),
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

        # 11) RoomRecruitment relacje (powiązanie pomieszczeń z rekrutacjami w organizacji)
        for room in rooms_alpha:
            for rec in [rec_alpha_active, rec_alpha_draft]:
                RoomRecruitment.objects.get_or_create(room=room, recruitment=rec)
        for room in rooms_beta:
            RoomRecruitment.objects.get_or_create(room=room, recruitment=rec_beta_active)

        # 11b) RoomTag powiązane per organization
        # Każdemu pokojowi w organizacji dodaj dwa tagi tej organizacji.
        # for room in rooms_alpha:
        #     tags_for_org = org_tags[org_alpha]
        #     RoomTag.objects.get_or_create(room=room, tag=tags_for_org['projector'])
        #     if hash(str(room.room_id)) % 2 == 0:
        #         RoomTag.objects.get_or_create(room=room, tag=tags_for_org['lab'])
        # for room in rooms_beta:
        #     tags_for_org = org_tags[org_beta]
        #     RoomTag.objects.get_or_create(room=room, tag=tags_for_org['projector'])
        #     if hash(str(room.room_id)) % 2 == 0:
        #         RoomTag.objects.get_or_create(room=room, tag=tags_for_org['lab'])

        # 12) Link users to recruitments (participants + hosts)
        def attach_users_to_recruitment(users, recruitment):
            for u in users:
                UserRecruitment.objects.get_or_create(user=u, recruitment=recruitment)

        attach_users_to_recruitment(participants_alpha + hosts_alpha, rec_alpha_active)
        attach_users_to_recruitment(participants_alpha[:10], rec_alpha_draft)
        attach_users_to_recruitment(participants_beta + hosts_beta, rec_beta_active)

        # 13) Preferences (nowy format DEFAULT_*_PREFERENCES)
        def subject_groups_for_recruitment(recruitment):
            return list(SubjectGroup.objects.filter(subject__recruitment=recruitment))

        def default_user_preferences(recruitment):
            # Zachowaj strukturę, ale wypełnij losowymi, sensownymi wartościami
            timeslots_in_cycle = 7  # zgodnie z dotychczasowym wzorcem (liczba pozycji w PreferredTimeslots)
            groups_count = len(subject_groups_for_recruitment(recruitment))

            # Helpery do losowania
            def rand_pair(a_min, a_max, b_min=None, b_max=None):
                b_min = a_min if b_min is None else b_min
                b_max = a_max if b_max is None else b_max
                return [random.randint(a_min, a_max), random.randint(b_min, b_max)]

            def rand_list(length, lo=-3, hi=8):
                return [random.randint(lo, hi) for _ in range(length)]

            return {
                'FreeDays': random.randint(0, 5),
                'ShortDays': random.randint(0, 3),
                'UniformDays': random.randint(0, 3),
                'ConcentratedDays': random.randint(0, 3),
                'MinGapsLength': rand_pair(0, 2),
                'MaxGapsLength': rand_pair(0, 6, 0, 6),
                'MinDayLength': rand_pair(0, 4),
                'MaxDayLength': rand_pair(6, 10),
                'PreferredDayStartTimeslot': rand_pair(0, 8),
                'PreferredDayEndTimeslot': rand_pair(8, 16),
                'TagOrder': [[]],
                'PreferredTimeslots': rand_list(timeslots_in_cycle, -3, 8),
                'PreferredGroups': rand_list(groups_count, -5, 8),
            }

        def default_host_preferences(recruitment):
            # Zachowaj strukturę, ale wypełnij losowymi, sensownymi wartościami
            timeslots_in_cycle = 7  # zgodnie z dotychczasowym wzorcem (liczba pozycji w PreferredTimeslots)

            def rand_pair(a_min, a_max, b_min=None, b_max=None):
                b_min = a_min if b_min is None else b_min
                b_max = a_max if b_max is None else b_max
                return [random.randint(a_min, a_max), random.randint(b_min, b_max)]

            def rand_list(length, lo=-3, hi=8):
                return [random.randint(lo, hi) for _ in range(length)]

            return {
                'FreeDays': random.randint(0, 5),
                'ShortDays': random.randint(0, 3),
                'UniformDays': random.randint(0, 3),
                'ConcentratedDays': random.randint(0, 3),
                'MinGapsLength': rand_pair(0, 2),
                'MaxGapsLength': rand_pair(0, 6, 0, 6),
                'MinDayLength': rand_pair(0, 4),
                'MaxDayLength': rand_pair(6, 10),
                'PreferredDayStartTimeslot': rand_pair(0, 8),
                'PreferredDayEndTimeslot': rand_pair(8, 16),
                'TagOrder': [[]],
                'PreferredTimeslots': rand_list(timeslots_in_cycle, -3, 8),
            }

        for u in participants_alpha[:10]:
            UserPreferences.objects.get_or_create(
                user=u, recruitment=rec_alpha_active,
                defaults={'preferences_data': default_user_preferences(rec_alpha_active)}
            )
        for u in participants_beta[:10]:
            UserPreferences.objects.get_or_create(
                user=u, recruitment=rec_beta_active,
                defaults={'preferences_data': default_user_preferences(rec_beta_active)}
            )
        for h in hosts_alpha[:2]:
            UserPreferences.objects.get_or_create(
                user=h, recruitment=rec_alpha_active,
                defaults={'preferences_data': default_host_preferences(rec_alpha_active)}
            )
        for h in hosts_beta[:2]:
            UserPreferences.objects.get_or_create(
                user=h, recruitment=rec_beta_active,
                defaults={'preferences_data': default_host_preferences(rec_beta_active)}
            )

        # 14) Constraints & HeatmapCache
        def build_constraints_for_recruitment(recruitment, groups_for_rec, rooms_for_rec, subjects_for_rec, students_for_rec, teachers_for_rec):
            """
            Buduje strukturę constraints zgodnie z najnowszymi wymaganiami (z uwzględnieniem Tag.recruitment):
            - NumSubjects, NumGroups (SubjectGroups), NumTeachers, NumStudents, NumRooms, NumTags
            - SubjectsDuration (dla każdego subject), GroupsPerSubject (liczba SubjectGroup na subject)
            - GroupsTags: pary [subject_group_index, tag_index] z tagów powiązanych przez SubjectTag (tagi subjectu)
            - RoomsTags: pary [room_index, tag_index]
            - StudentsSubjects: lista list indeksów subjectów przypisanych do studenta (UserSubjects)
            - TeachersGroups: lista list indeksów subject_group dla każdego nauczyciela (host)
            - Rooms/Students/Teachers UnavailabilityTimeslots: listy indeksów zajętych timeslotów w całym cyklu
            - StudentWeights, TeacherWeights (z pola weight użytkownika)
            - MinStudentsPerGroup, GroupsCapacity, RoomsCapacity
            """
            # Indeksy bazowe
            subjects_list = list(subjects_for_rec)
            subject_index = {s.subject_id: idx for idx, s in enumerate(subjects_list)}
            # Wszystkie SubjectGroup należące do tych subjectów
            subject_groups_qs = SubjectGroup.objects.filter(subject__in=subjects_list).select_related('subject', 'host_user')
            subject_groups_list = list(subject_groups_qs)
            subject_group_index = {sg.subject_group_id: idx for idx, sg in enumerate(subject_groups_list)}

            rooms_list = list(rooms_for_rec)
            room_index = {r.room_id: idx for idx, r in enumerate(rooms_list)}
            students_list = list(students_for_rec)
            student_index = {u.id: idx for idx, u in enumerate(students_list)}
            teachers_list = list(teachers_for_rec)
            teacher_index = {u.id: idx for idx, u in enumerate(teachers_list)}

            # Tag lista: tylko tagi z organizacji rekrutacji
            subject_tag_ids = list(SubjectTag.objects.filter(subject__in=subjects_list, tag__organization=recruitment.organization).values_list('tag_id', flat=True))
            room_tag_ids = list(RoomTag.objects.filter(room__in=rooms_list, tag__organization=recruitment.organization).values_list('tag_id', flat=True))
            all_tag_ids = sorted(set(subject_tag_ids + room_tag_ids))
            tag_list = list(Tag.objects.filter(tag_id__in=all_tag_ids, organization=recruitment.organization).order_by('tag_name'))
            tag_index = {t.tag_id: idx for idx, t in enumerate(tag_list)}

            # Pola podstawowe
            subjects_duration = [s.duration_blocks for s in subjects_list]
            groups_per_subject = [s.subject_groups.filter(subject=s).count() for s in subjects_list]
            min_students_per_group = [sg.subject.min_students for sg in subject_groups_list]
            groups_capacity = [sg.subject.capacity for sg in subject_groups_list]
            rooms_capacity = [r.capacity for r in rooms_list]

            # GroupsTags: pary (SubjectGroup, Tag) z tagów powiązanych z subjectem w organizacji rekrutacji
            group_tags_pairs = []
            for sg in subject_groups_list:
                subj_tags = SubjectTag.objects.filter(subject=sg.subject, tag__organization=recruitment.organization).select_related('tag')
                for st in subj_tags:
                    tid = st.tag.tag_id
                    if tid in tag_index:
                        group_tags_pairs.append([subject_group_index[sg.subject_group_id], tag_index[tid]])

            # RoomsTags: pary (Room, Tag) w organizacji rekrutacji
            rooms_tags_pairs = []
            for r in rooms_list:
                for rt in r.room_tags.select_related('tag').filter(tag__organization=recruitment.organization):
                    tid = rt.tag.tag_id
                    if tid in tag_index:
                        rooms_tags_pairs.append([room_index[r.room_id], tag_index[tid]])

            # StudentsSubjects: listy indeksów subjectów wymaganych przez każdego studenta
            students_subjects = []
            for stu in students_list:
                subject_ids = list(UserSubjects.objects.filter(user=stu, subject__in=subjects_list).values_list('subject_id', flat=True))
                idxs = [subject_index[sid] for sid in subject_ids if sid in subject_index]
                students_subjects.append(idxs)

            # TeachersGroups: dla każdego hosta lista indeksów SubjectGroup które prowadzi
            teachers_groups = [[] for _ in teachers_list]
            for sg in subject_groups_list:
                host = sg.host_user
                if host.id in teacher_index:
                    teachers_groups[teacher_index[host.id]].append(subject_group_index[sg.subject_group_id])

            # Unavailability timeslots
            rooms_unavailability = [[] for _ in rooms_list]
            students_unavailability = [[] for _ in students_list]
            teachers_unavailability = [[] for _ in teachers_list]

            meetings = Meeting.objects.filter(recruitment=recruitment).select_related('subject_group__subject', 'room', 'group', 'subject_group__host_user')
            for mtg in meetings:
                sg = mtg.subject_group
                subj = sg.subject
                duration_blocks = subj.duration_blocks
                start = mtg.start_timeslot
                occupied_range = list(range(start, start + duration_blocks))
                # room
                r_idx = room_index.get(mtg.room.room_id)
                if r_idx is not None:
                    rooms_unavailability[r_idx].extend(occupied_range)
                # teacher (host)
                host = sg.host_user
                t_idx = teacher_index.get(host.id)
                if t_idx is not None:
                    teachers_unavailability[t_idx].extend(occupied_range)
                # students: wszyscy z grupy identity.Group
                user_ids = list(UserGroup.objects.filter(group=mtg.group).values_list('user_id', flat=True))
                for uid in user_ids:
                    s_idx = student_index.get(uid)
                    if s_idx is not None:
                        students_unavailability[s_idx].extend(occupied_range)

            # deduplikacja i sortowanie
            rooms_unavailability = [sorted(set(lst)) for lst in rooms_unavailability]
            students_unavailability = [sorted(set(lst)) for lst in students_unavailability]
            teachers_unavailability = [sorted(set(lst)) for lst in teachers_unavailability]

            # Wagi
            student_weights = [u.weight for u in students_list]
            teacher_weights = [u.weight for u in teachers_list]

            # Liczby
            num_subjects = len(subjects_list)
            num_groups = len(subject_groups_list)
            num_teachers = len(teachers_list)
            num_students = len(students_list)
            num_rooms = len(rooms_list)
            num_tags = len(tag_list)

            # TimeslotsDaily & DaysInCycle na razie demo (32, 7) - mogą być pobrane z Recruitment w przyszłości
            timeslots_daily = 32
            days_in_cycle = 7

            return {
                'TimeslotsDaily': timeslots_daily,
                'DaysInCycle': days_in_cycle,
                'NumSubjects': num_subjects,
                'NumGroups': num_groups,
                'NumTeachers': num_teachers,
                'NumStudents': num_students,
                'NumRooms': num_rooms,
                'NumTags': num_tags,
                'SubjectsDuration': subjects_duration,
                'GroupsPerSubject': groups_per_subject,
                'MinStudentsPerGroup': min_students_per_group,
                'GroupsCapacity': groups_capacity,
                'RoomsCapacity': rooms_capacity,
                'GroupsTags': group_tags_pairs,
                'RoomsTags': rooms_tags_pairs,
                'StudentsSubjects': students_subjects,
                'TeachersGroups': teachers_groups,
                'RoomsUnavailabilityTimeslots': rooms_unavailability,
                'StudentsUnavailabilityTimeslots': students_unavailability,
                'TeachersUnavailabilityTimeslots': teachers_unavailability,
                'StudentWeights': student_weights,
                'TeacherWeights': teacher_weights,
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

        # SubjectTag assignments (po stworzeniu tagów i subjects) — per organization
        # def assign_subject_tags(subjects, tags_dict):
        #     # tags_dict: {'projector': Tag, 'lab': Tag}
        #     for s in subjects:
        #         chosen = [tags_dict['projector'], tags_dict['lab']]
        #         for t in chosen:
        #             SubjectTag.objects.get_or_create(subject=s, tag=t)
        # assign_subject_tags(subjects_alpha_active, org_tags[org_alpha])
        # assign_subject_tags(subjects_alpha_draft, org_tags[org_alpha])
        # assign_subject_tags(subjects_beta_active, org_tags[org_beta])

        self.stdout.write(self.style.SUCCESS('Demo data seeding complete (updated models + preferences + tags per recruitment).'))
