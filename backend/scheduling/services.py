from typing import Union, Optional
from django.db.models import QuerySet, Q
from django.utils import timezone
from django.db import transaction, models
from .models import Meeting, Room, Recruitment, Subject, SubjectGroup, RoomTag, Tag, SubjectTag
from optimizer.logger import logger
from django.contrib.auth import get_user_model
from preferences.models import Constraints
from identity.models import UserGroup, UserSubjects
User = get_user_model()


def get_active_meetings_for_room(room_or_id: Union[Room, str, int], start_date: Optional[timezone.datetime] = None, end_date: Optional[timezone.datetime] = None) -> QuerySet:
    """
    Return a QuerySet of Meeting objects for the given room (instance or PK)
    where the related recruitment has plan_status == 'active' and overlaps the provided time window.

    Time window overlap rules (same as identity.services.get_active_meetings_for_user):
    - Include recruitment if (plan_start_date <= end_date OR plan_start_date is NULL) AND
      (expiration_date >= start_date OR expiration_date is NULL).
    - If no start/end provided, return all active meetings without date limitation.

    Parameters:
    - room_or_id: Room instance or primary key
    - start_date, end_date: optional date/datetime bounds

    Notes:
    - Sorted by recruitment name, day_of_cycle, start_timeslot for consistency.
    - select_related includes recruitment, room, subject_group (with subject and host_user), and group.
    """
    room_id = room_or_id.pk if hasattr(room_or_id, 'pk') else room_or_id

    base_filter = Q(room_id=room_id) & Q(recruitment__plan_status='active')

    if start_date and end_date:
        date_overlap = (
            (Q(recruitment__plan_start_date__lte=end_date) | Q(recruitment__plan_start_date__isnull=True)) &
            (Q(recruitment__expiration_date__gte=start_date) | Q(recruitment__expiration_date__isnull=True))
        )
        base_filter &= date_overlap
    elif start_date and not end_date:
        date_overlap = Q(recruitment__expiration_date__gte=start_date) | Q(recruitment__expiration_date__isnull=True)
        base_filter &= date_overlap
    elif end_date and not start_date:
        date_overlap = Q(recruitment__plan_start_date__lte=end_date) | Q(recruitment__plan_start_date__isnull=True)
        base_filter &= date_overlap

    qs = (
        Meeting.objects
        .filter(base_filter)
        .select_related(
            'recruitment',
            'room',
            'group',
            'subject_group',
            'subject_group__subject',
            'subject_group__host_user',
        )
        .order_by('recruitment__recruitment_name','day_of_cycle', 'start_timeslot')
        .distinct()
    )
    return qs


def should_start_optimization(recruitment):
    """check if optimization should start based on conditions"""
    if recruitment.plan_status != 'draft':
        return False

    now = timezone.now()

    # condition 1: optimization_start_date reached
    if recruitment.optimization_start_date and now >= recruitment.optimization_start_date:
        return True

    # condition 2: threshold reached between user_prefs_start_date and optimization_start_date
    if (recruitment.user_prefs_start_date and
        recruitment.optimization_start_date and
        recruitment.user_prefs_start_date <= now < recruitment.optimization_start_date):

        # get total users in recruitment
        total_users = get_users_for_recruitment(recruitment).count()

        if total_users > 0:
            threshold_count = int(total_users * recruitment.preference_threshold)
            if recruitment.users_submitted_count >= threshold_count:
                return True

    return False


def trigger_optimization(recruitment):
    """trigger optimization for recruitment"""
    from optimizer.services import OptimizerService, convert_preferences_to_problem_data

    with transaction.atomic():
        recruitment.plan_status = 'optimizing'
        recruitment.save()
        logger.info(f"started optimization for recruitment {recruitment.recruitment_id}")

        # Convert preferences to problem_data
        try:
            problem_data = convert_preferences_to_problem_data(str(recruitment.recruitment_id))
            logger.info(f"converted preferences to problem_data for recruitment {recruitment.recruitment_id}")
        except NotImplementedError:
            logger.warning(f"convert_preferences_to_problem_data not yet implemented, using empty problem_data")
            problem_data = {}
        except Exception as e:
            logger.error(f"failed to convert preferences to problem_data: {e}")
            recruitment.plan_status = 'draft'
            recruitment.save()
            raise

        try:
            optimizer_service = OptimizerService()
            job = optimizer_service.submit_job({
                'recruitment_id': str(recruitment.recruitment_id),
                'max_execution_time': recruitment.max_round_execution_time,
                'problem_data': problem_data
            })
            logger.info(f"created optimization job {job.id} for recruitment {recruitment.recruitment_id}")
        except Exception as e:
            logger.error(f"failed to create optimization job: {e}")
            recruitment.plan_status = 'draft'
            recruitment.save()
            raise


def prepare_optimization_constraints(recruitment: Recruitment):
    """
    Zbiera dane z modeli i aktualizuje Constraints.constraints_data dla danego recruitment.
    Patrz docstring oryginalny dla szczegółów pól.
    """
    try:
        constraints = Constraints.objects.select_for_update().get(recruitment=recruitment)
    except Constraints.DoesNotExist:
        logger.warning(f"Constraints for recruitment {recruitment.recruitment_id} not found; creating empty.")
        constraints = Constraints.objects.create(recruitment=recruitment, constraints_data={})

    data = constraints.constraints_data or {}

    # a) TimeslotsDaily
    def compute_timeslots_daily():
        start = recruitment.day_start_time
        end = recruitment.day_end_time
        if start and end:
            delta_minutes = (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute)
            if delta_minutes > 0:
                blocks = delta_minutes // 15
                return max(blocks, 1)
        # fallback – użyj istniejącej wartości lub default 32 (8h *4 *1?)
        return data.get('TimeslotsDaily', 32)

    timeslots_daily = compute_timeslots_daily()

    # b) DaysInCycle
    cycle_map = {
        'weekly': 7,
        'biweekly': 14,
        'monthly': 28,  # zgodnie z docstringiem (Meeting day_of_cycle może mieć większy zakres; tu przyjmujemy 28)
    }
    days_in_cycle = cycle_map.get(recruitment.cycle_type, 7)

    # Pobieramy użytkowników powiązanych z rekrutacją
    linked_users_qs = User.objects.filter(user_recruitments__recruitment=recruitment).distinct().order_by('id')
    students = list(linked_users_qs.filter(role='participant'))
    teachers = list(linked_users_qs.filter(role='host'))

    # c) MinStudentsPerGroup i GroupsCapacity w kontekście SubjectGroup (dla każdej kombinacji subject-host)
    subject_groups_qs = SubjectGroup.objects.filter(subject__recruitment=recruitment).select_related('subject', 'host_user')
    subject_groups = list(subject_groups_qs)
    min_students_per_group = [sg.subject.min_students for sg in subject_groups]
    groups_capacity = [sg.subject.capacity for sg in subject_groups]
    subject_group_index_map = {sg.subject_group_id: idx for idx, sg in enumerate(subject_groups)}

    # d) SubjectsDuration, GroupsPerSubject
    subjects = Subject.objects.filter(recruitment=recruitment).distinct()
    subjects_duration = [s.duration_blocks for s in subjects]
    groups_per_subject = [SubjectGroup.objects.filter(subject=s).count() for s in subjects]
    subject_index_map = {s.subject_id: i for i, s in enumerate(subjects)}
    num_subjects = len(subjects)

    # f) RoomTags, RoomCapacity
    rooms = Room.objects.filter(room_recruitments__recruitment=recruitment).distinct()
    rooms_capacity = [r.capacity for r in rooms]
    room_index_map = {r.room_id: i for i, r in enumerate(rooms)}

    # Subject tags zmapowane na SubjectGroup -> Tag (GroupTags = para indeksów [subjectGroupIndex, tagIndex])
    # Budujemy tag_index_map jak wcześniej
    all_tags = Tag.objects.filter(
        models.Q(tagged_rooms__room__in=rooms) | models.Q(tagged_subjects__subject__in=subjects)
    ).distinct().order_by('tag_name')
    tag_index_map = {t.tag_id: i for i, t in enumerate(all_tags)}

    room_tags_pairs = []
    for rt in RoomTag.objects.filter(room__in=rooms).select_related('room', 'tag'):
        if rt.tag_id in tag_index_map and rt.room_id in room_index_map:
            room_tags_pairs.append([room_index_map[rt.room_id], tag_index_map[rt.tag_id]])

    group_tags_pairs = []
    # dla każdej subjectGroup bierzemy tagi jej subjectu
    for sg in subject_groups:
        for st in SubjectTag.objects.filter(subject=sg.subject).select_related('tag'):
            tag_idx = tag_index_map.get(st.tag_id)
            if tag_idx is not None:
                group_tags_pairs.append([subject_group_index_map[sg.subject_group_id], tag_idx])

    # g) StudentSubjects & TeacherGroups (na bazie SubjectGroup)
    students_subjects = []
    for stu in students:
        subj_ids = list(UserSubjects.objects.filter(user=stu).values_list('subject__subject_id', flat=True))
        mapped = [subject_index_map[sid] for sid in subj_ids if sid in subject_index_map]
        students_subjects.append(mapped)

    teacher_groups = []
    for t in teachers:
        sg_indices = [subject_group_index_map[sg.subject_group_id] for sg in subject_groups if sg.host_user_id == t.id]
        # unikalność i sortowanie
        sg_indices = sorted(set(sg_indices))
        teacher_groups.append(sg_indices)

    # i) Liczebności (NumGroups jako liczba SubjectGroup w rekrutacji)
    num_groups = len(subject_groups)
    num_teachers = len(teachers)
    num_students = len(students)
    num_rooms = len(rooms)
    num_tags = len(all_tags)

    # j) Wagi użytkowników (domyślnie 1 jeśli brak pola weight)
    student_weights = [getattr(stu, 'weight', 1) for stu in students]
    teacher_weights = [getattr(t, 'weight', 1) for t in teachers]

    # h) Unavailability – teraz wypełniamy realnymi timeslotami:
    # start_timeslot jest już globalnym indeksem timeslota w całym cyklu (0.. DaysInCycle*TimeslotsDaily-1)
    # więc wystarczy wziąć start_timeslot oraz kolejne bloki według duration_blocks.
    def meeting_block_indices(m: Meeting):
        start_idx = getattr(m, 'start_timeslot', None)
        if start_idx is None:
            return []

        duration_blocks = getattr(m.subject_group.subject, 'duration_blocks', None) or 1
        break_before = getattr(m.subject_group.subject, 'break_before_blocks', 0) or 0
        break_after = getattr(m.subject_group.subject, 'break_after_blocks', 0) or 0

        first_idx = max(0, start_idx - break_before)
        last_idx = start_idx + duration_blocks - 1 + break_after
        if last_idx < first_idx:
            return []
        return [i for i in range(first_idx, last_idx + 1)]

    # Zbierz wszystkie spotkania w oknie czasowym bieżącej rekrutacji, dla całej organizacji
    window_start = getattr(recruitment, 'plan_start_date', None)
    window_end = getattr(recruitment, 'expiration_date', None)

    meetings_filter = {
        'recruitment__organization': recruitment.organization,
    }
    # jeśli mamy zdefiniowane okno czasowe, uwzględniamy rekrutacje, które z nim się przecinają
    if window_start and window_end:
        meetings_filter.update({
            'recruitment__plan_start_date__lte': window_end,
            'recruitment__expiration_date__gte': window_start,
        })
    elif window_start and not window_end:
        meetings_filter.update({
            'recruitment__expiration_date__gte': window_start,
        })
    elif window_end and not window_start:
        meetings_filter.update({
            'recruitment__plan_start_date__lte': window_end,
        })
    # pobieramy spotkania niezależnie od tego, czy należą do bieżącej rekrutacji – liczy się nachodzenie w czasie
    all_meetings = Meeting.objects.filter(**meetings_filter).select_related(
        'room', 'group', 'subject_group__subject', 'subject_group__host_user', 'recruitment'
    )

    # Preindeksowanie
    room_unavail_map = {r.room_id: set() for r in rooms}
    teacher_unavail_map = {t.id: set() for t in teachers}
    student_unavail_map = {s.id: set() for s in students}

    # Grupy uczestników per user oraz grupy -> studenci (niezależnie od rekrutacji)
    user_groups_map = {}
    group_students_map = {}
    for ug in UserGroup.objects.filter(user__in=students).select_related('user', 'group'):
        user_groups_map.setdefault(ug.user_id, set()).add(ug.group_id)
        group_students_map.setdefault(ug.group_id, set()).add(ug.user_id)

    for m in all_meetings:
        m_indices = meeting_block_indices(m)
        # room – tylko jeśli to pokój z listy rooms (tej organizacji)
        if m.room_id in room_unavail_map:
            room_unavail_map[m.room_id].update(m_indices)
        # teacher (host) – jeśli host jest w naszym zbiorze teachers
        host_id = m.subject_group.host_user_id
        if host_id in teacher_unavail_map:
            teacher_unavail_map[host_id].update(m_indices)
        # students: wszyscy należący do grupy – jeśli są w naszym zbiorze students
        group_id = m.group_id
        for stu_id in group_students_map.get(group_id, ()):  # szybkie rozwinięcie bez iteracji po wszystkich studentach
            student_unavail_map[stu_id].update(m_indices)

    rooms_unavailability = [sorted(room_unavail_map[r.room_id]) for r in rooms]
    students_unavailability = [sorted(student_unavail_map[s.id]) for s in students]
    teachers_unavailability = [sorted(teacher_unavail_map[t.id]) for t in teachers]

    # Aktualizacja constraints_data – zachowujemy stare pola jeśli nie nadpisujemy
    data.update({
        'TimeslotsDaily': timeslots_daily,
        'DaysInCycle': days_in_cycle,
        'MinStudentsPerGroup': min_students_per_group,
        'SubjectsDuration': subjects_duration,
        'GroupsPerSubject': groups_per_subject,
        'GroupsCapacity': groups_capacity,
        'GroupsTags': group_tags_pairs,
        'RoomsCapacity': rooms_capacity,
        'RoomsTags': room_tags_pairs,
        'StudentsSubjects': students_subjects,
        'TeachersGroups': teacher_groups,
        'RoomsUnavailabilityTimeslots': rooms_unavailability,
        'StudentsUnavailabilityTimeslots': students_unavailability,
        'TeachersUnavailabilityTimeslots': teachers_unavailability,
        'NumGroups': num_groups,
        'NumTeachers': num_teachers,
        'NumStudents': num_students,
        'NumRooms': num_rooms,
        'NumTags': num_tags,
        'NumSubjects': num_subjects,
        'StudentWeights': student_weights,
        'TeacherWeights': teacher_weights,
    })

    constraints.constraints_data = data
    constraints.save(update_fields=['constraints_data'])
    logger.info(f"Constraints updated for recruitment {recruitment.recruitment_id}")
    return constraints


def check_and_trigger_optimizations():
    """check all draft recruitments and trigger optimization if needed"""
    recruitments = Recruitment.objects.filter(plan_status='draft')
    logger.debug(f"checking {recruitments.count()} draft recruitments for optimization triggers")
    for recruitment in recruitments:
        if should_start_optimization(recruitment):
            logger.info(f"preparing optimization constraints for recruitment {recruitment.recruitment_id}")
            prepare_optimization_constraints(recruitment)
            logger.info(f"triggering optimization for recruitment {recruitment.recruitment_id}")
            trigger_optimization(recruitment)


def archive_expired_recruitments():
    """archive recruitments that passed expiration_date"""
    now = timezone.now()

    expired = Recruitment.objects.filter(
        plan_status='active',
        expiration_date__lt=now
    )

    for recruitment in expired:
        recruitment.plan_status = 'archived'
        recruitment.save()
        logger.info(f"archived recruitment {recruitment.recruitment_id}")


def get_users_for_recruitment(recruitment_or_id: Union[Recruitment, str, int], active_only: bool = False) -> QuerySet:
    """
    Return a QuerySet of all users who are linked to the specified Recruitment via the
    UserRecruitment table (related_name='user_recruitments'). This replaces the previous
    implementation which traversed user_groups.

    Parameters:
    - recruitment_or_id: a Recruitment instance or the recruitment's primary key (recruitment_id).
    - active_only: if True, include only users whose linked recruitment has plan_status == 'active'.

    Usage examples:
    get_users_for_recruitment(recruitment_instance)
    get_users_for_recruitment(recruitment_id, active_only=True)
    """
    recruitment_id = recruitment_or_id.recruitment_id if hasattr(recruitment_or_id, 'recruitment_id') else recruitment_or_id

    filters = {
        'user_recruitments__recruitment__recruitment_id': recruitment_id
    }
    if active_only:
        filters['user_recruitments__recruitment__plan_status'] = 'active'

    qs = (
        User.objects
        .filter(**filters)
        .select_related('organization')
        .prefetch_related('user_groups', 'user_groups__group')
        .order_by('username')
        .distinct()
    )
    return qs