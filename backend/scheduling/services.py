from typing import Union
from django.db.models import QuerySet
from django.utils import timezone
from django.db import transaction
from .models import Meeting, Room, Recruitment
from optimizer.logger import logger
from django.contrib.auth import get_user_model
User = get_user_model()


def get_active_meetings_for_room(room_or_id: Union[Room, str, int]) -> QuerySet:
    """
    Returns a QuerySet of all Meeting objects related to the given Room (instance or PK),
    where recruitment.plan_status == 'active'.
    """
    room_id = room_or_id.pk if hasattr(room_or_id, 'pk') else room_or_id

    qs = (
        Meeting.objects
        .filter(room_id=room_id, recruitment__plan_status='active')
        .select_related('recruitment', 'subject_group__subject', 'subject_group__group', 'subject_group__host_user', 'room', 'required_tag')
        .order_by('day_of_week', 'start_hour')
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


def check_and_trigger_optimizations():
    """check all draft recruitments and trigger optimization if needed"""
    recruitments = Recruitment.objects.filter(plan_status='draft')
    logger.debug(f"checking {recruitments.count()} draft recruitments for optimization triggers")
    for recruitment in recruitments:
        if should_start_optimization(recruitment):
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
