from typing import Union, Optional
from datetime import date
from django.db.models import QuerySet, Q
from .models import User, Group


def get_active_meetings_for_user(user_or_id: Union[User, int, str], start_date: Optional[date] = None, end_date: Optional[date] = None) -> QuerySet:
    """
    Zwraca QuerySet Meeting dla użytkownika (host lub participant) ze wszystkich rekrutacji ze statusem 'active'
    które nachodzą na podany zakres czasowy.

    Zakres czasowy:
    - Rekrutacja uwzględniona jeśli (plan_start_date <= end_date lub plan_start_date jest NULL) AND
      (expiration_date >= start_date lub expiration_date jest NULL).
    - Jeśli start_date / end_date nie są podane, zwraca wszystkie aktywne meetingi bez ograniczenia datami.

    Parametry:
    - user_or_id: User albo jego PK
    - start_date, end_date: obiekty date (opcjonalne)
    """
    from scheduling.models import Meeting
    user_id = user_or_id.pk if hasattr(user_or_id, 'pk') else user_or_id

    user_groups = Group.objects.filter(group_users__user_id=user_id)

    base_filter = Q(recruitment__plan_status='active') & (
        Q(subject_group__host_user_id=user_id) | Q(group__in=user_groups)
    )

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
            'recruitment', 'subject_group__subject', 'subject_group__host_user', 'room', 'group'
        )
        .order_by('recruitment__recruitment_name','day_of_cycle','start_timeslot')
        .distinct()
    )
    return qs


def get_recruitments_for_user(user_or_id: Union[User, int, str], active_only: bool = False) -> QuerySet:
    """
    Return a QuerySet of Recruitment objects in which the given user is a participant.

    Uses the `UserRecruitment` table (reverse relation `recruitment_users`) to determine
    membership: a user is a participant if there exists a UserRecruitment row linking them
    to the Recruitment.

    Parameters:
    - user_or_id: User instance or primary key (UUID/string).
    - active_only: when True, filter only recruitments with plan_status == 'active'.

    Returns: QuerySet[Recruitment] containing unique Recruitment records.
    """
    from scheduling.models import Recruitment
    user_id = user_or_id.pk if hasattr(user_or_id, 'pk') else user_or_id

    filters = {
        'recruitment_users__user_id': user_id
    }
    if active_only:
        filters['plan_status'] = 'active'

    qs = (
        Recruitment.objects
        .filter(**filters)
        .prefetch_related('meetings', 'recruitment_users', 'recruitment_users__user')
        .order_by('recruitment_name')
        .distinct()
    )
    return qs


def get_groups_for_user(user_or_id: Union[User, int, str]) -> QuerySet:
    """
    Return a QuerySet of Group objects that the given user belongs to via UserGroup relations.

    Parameters:
    - user_or_id: User instance or primary key (UUID/string).

    Returns: QuerySet[Group] containing unique Group records ordered by group_name.
    """
    user_id = user_or_id.pk if hasattr(user_or_id, 'pk') else user_or_id

    qs = (
        Group.objects
        .filter(group_users__user_id=user_id)
        .select_related('organization')
        .order_by('group_name')
        .distinct()
    )
    return qs
