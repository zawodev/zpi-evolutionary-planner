from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserPreferences, Constraints, HeatmapCache
from .serializers import UserPreferencesSerializer, ConstraintsSerializer
from identity.models import User
from scheduling.models import Recruitment
import copy
import uuid
from django.utils import timezone
from datetime import timedelta


DEFAULT_USER_PREFERENCES = {
    "WidthHeightInfo": 0, # weight, positive means prefer wider, negative means prefer taller
    "GapsInfo": [0, 0, 0], # minGaps, maxGaps, weight
    "PreferredTimeslots": [0, 0, 0, 0, 0, 0, 0], # for each timeslot in cycle, weight
    "PreferredGroups": [0, 0, 0, 0, 0] # for each group, weight
}


DEFAULT_CONSTRAINTS = {
    "TimeslotsDaily": 0, # 4 x hours (15min timeslots)
    "DaysInCycle": 0, # 7, 14 or 28
    "MinStudentsPerGroup": 0, # for each group, student count requirement (or group no start)
    "GroupsPerSubject": [0, 0, 0], # for each subject, number of groups
    "GroupsCapacity": [0, 0, 0, 0, 0, 0], # for each group, capacity
    "RoomsCapacity": [0, 0], # for each room, capacity
    "GroupsTags": [
        [0, 0], # groupId, tagId
        [0, 0]
    ],
    "RoomsTags": [
        [0, 0], # roomId, tagId
        [0, 0]
    ],
    "StudentsSubjects": [
        [0, 0, 0], # subjectIds list for student 0
        [0, 0] # subjectIds list for student 1
    ],
    "TeachersGroups": [
        [0, 0, 0, 0], # groupIds list for teacher 0
        [0, 0, 0, 0, 0, 0] # groupIds list for teacher 1
    ],
    "RoomsUnavailabilityTimeslots": [
        [], # roomId 0, list of timeslot ids
        [12], # roomId 1, list of timeslot ids
    ],
    "StudentsUnavailabilityTimeslots": [
        [], # studentId 0, list of timeslot ids
        [5, 6, 7], # studentId 1, list of timeslot ids
    ],
    "TeachersUnavailabilityTimeslots": [
        [], # teacherId 0, list of timeslot ids
        [1, 2, 3], # teacherId 1, list of timeslot ids
    ]
}


def validate_uuid(uuid_string):
    try:
        uuid_obj = uuid.UUID(uuid_string)
        return True, uuid_obj
    except (ValueError, AttributeError):
        return False, None


def update_nested_dict(original, path, value):
    if not path:
        return value
    
    result = copy.deepcopy(original)
    current = result
    
    for key in path[:-1]:
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        
        current = current[key]
    
    current[path[-1]] = value
    return result


@api_view(['GET', 'PUT'])
def user_preferences_view(request, recruitment_id, user_id):
    # validate recruitment_id is UUID format
    is_valid_recruitment, recruitment_uuid = validate_uuid(recruitment_id)
    if not is_valid_recruitment:
        return Response(
            {'error': f'Invalid recruitment_id format. Expected UUID, got: {recruitment_id}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # validate user_id is UUID format
    is_valid_user, user_uuid = validate_uuid(user_id)
    if not is_valid_user:
        return Response(
            {'error': f'Invalid user_id format. Expected UUID, got: {user_id}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # check if Recruitment exists
    try:
        recruitment = Recruitment.objects.get(recruitment_id=recruitment_uuid)
    except Recruitment.DoesNotExist:
        return Response(
            {'error': f'Recruitment with id {recruitment_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # check if User exists
    try:
        user = User.objects.get(id=user_uuid)
    except User.DoesNotExist:
        return Response(
            {'error': f'User with id {user_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        if request.method == 'GET':
            # check if UserPreferences exists
            try:
                preferences = UserPreferences.objects.get(
                    recruitment_id=recruitment_uuid,
                    user_id=user_uuid
                )
                serializer = UserPreferencesSerializer(preferences)
                return Response(serializer.data)
            except UserPreferences.DoesNotExist:
                return Response({
                        'error': f'User preferences for user {user_id} and recruitment {recruitment_id} not found',
                        'message': 'Use PUT request to create preferences'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
        
        elif request.method == 'PUT':
            # create or update preferences
            preferences, created = UserPreferences.objects.get_or_create(
                recruitment_id=recruitment_uuid,
                user_id=user_uuid,
                defaults={'preferences_data': DEFAULT_USER_PREFERENCES.copy()}
            )
            
            # increment users_submitted_count if first submission
            if created:
                from scheduling.services import should_start_optimization, trigger_optimization
                recruitment.users_submitted_count += 1
                recruitment.save()
                
                # check if optimization should start
                if should_start_optimization(recruitment):
                    trigger_optimization(recruitment)

            # check if request contains path and value
            if 'path' in request.data and 'value' in request.data:
                path = request.data['path']
                value = request.data['value']
                preferences.preferences_data = update_nested_dict(
                    preferences.preferences_data,
                    path,
                    value
                )
                preferences.save()
            else:
                # full replacement of preferences_data
                if 'preferences_data' in request.data:
                    preferences.preferences_data = request.data['preferences_data']
                else:
                    preferences.preferences_data = request.data
                preferences.save()
            
            serializer = UserPreferencesSerializer(preferences)
            return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PUT'])
def constraints_view(request, recruitment_id):
    # validate recruitment_id is UUID format
    is_valid, recruitment_uuid = validate_uuid(recruitment_id)
    if not is_valid:
        return Response(
            {'error': f'Invalid recruitment_id format. Expected UUID, got: {recruitment_id}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # check if Recruitment exists
    try:
        recruitment = Recruitment.objects.get(recruitment_id=recruitment_uuid)
    except Recruitment.DoesNotExist:
        return Response(
            {'error': f'Recruitment with id {recruitment_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        if request.method == 'GET':
            # check if Constraints exist
            try:
                constraints = Constraints.objects.get(recruitment_id=recruitment_uuid)
                serializer = ConstraintsSerializer(constraints)
                return Response(serializer.data)
            except Constraints.DoesNotExist:
                return Response({
                        'error': f'Constraints for recruitment {recruitment_id} not found',
                        'message': 'Use PUT request to create constraints'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
        
        elif request.method == 'PUT':
            # create or update constraints
            constraints, created = Constraints.objects.get_or_create(
                recruitment_id=recruitment_uuid,
                defaults={'constraints_data': DEFAULT_CONSTRAINTS.copy()}
            )
            # check if request contains path and value
            if 'path' in request.data and 'value' in request.data:
                path = request.data['path']
                value = request.data['value']
                constraints.constraints_data = update_nested_dict(
                    constraints.constraints_data,
                    path,
                    value
                )
                constraints.save()
            else:
                # full replacement of constraints_data
                if 'constraints_data' in request.data:
                    constraints.constraints_data = request.data['constraints_data']
                else:
                    constraints.constraints_data = request.data
                constraints.save()
            
            serializer = ConstraintsSerializer(constraints)
            return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def aggregate_preferred_timeslots_view(request, recruitment_id):
    """
    Aggregate the "PreferredTimeslots" arrays from all UserPreferences for the
    given recruitment and return the element-wise sum as a list.

    Uses HeatmapCache: if a cached value exists and was updated within the last
    hour, returns the cached value. Otherwise recomputes the aggregation, stores
    it in the cache and returns the new value.

    If no preferences exist for the recruitment, returns the default
    PreferredTimeslots from DEFAULT_USER_PREFERENCES.
    """
    is_valid, recruitment_uuid = validate_uuid(recruitment_id)
    if not is_valid:
        return Response(
            {'error': f'Invalid recruitment_id format. Expected UUID, got: {recruitment_id}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        recruitment = Recruitment.objects.get(recruitment_id=recruitment_uuid)
    except Recruitment.DoesNotExist:
        return Response(
            {'error': f'Recruitment with id {recruitment_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        try:
            cache = HeatmapCache.objects.get(recruitment_id=recruitment_uuid)
        except HeatmapCache.DoesNotExist:
            cache = None

        if cache is not None:
            age = timezone.now() - cache.last_updated
            if age <= timedelta(hours=1) and cache.cached_value is not None:
                return Response(cache.cached_value, status=status.HTTP_200_OK)

        prefs_qs = UserPreferences.objects.filter(recruitment_id=recruitment_uuid)

        if not prefs_qs.exists():
            default_pts = DEFAULT_USER_PREFERENCES.get('PreferredTimeslots', [])
            if cache is None:
                HeatmapCache.objects.create(recruitment_id=recruitment_uuid, cached_value=default_pts, last_updated=timezone.now())
            else:
                cache.cached_value = default_pts
                cache.last_updated = timezone.now()
                cache.save()
            return Response(default_pts, status=status.HTTP_200_OK)

        max_len = 0
        for p in prefs_qs:
            pts = p.preferences_data.get('PreferredTimeslots', []) if p.preferences_data else []
            if isinstance(pts, list) and len(pts) > max_len:
                max_len = len(pts)

        sums = [0] * max_len
        for p in prefs_qs:
            pts = p.preferences_data.get('PreferredTimeslots', []) if p.preferences_data else []
            if not isinstance(pts, list):
                continue
            for i, val in enumerate(pts):
                try:
                    num = float(val)
                except (TypeError, ValueError):
                    continue
                sums[i] += num

        if all(float(x).is_integer() for x in sums):
            sums = [int(x) for x in sums]

        if cache is None:
            HeatmapCache.objects.create(recruitment_id=recruitment_uuid, cached_value=sums, last_updated=timezone.now())
        else:
            cache.cached_value = sums
            cache.last_updated = timezone.now()
            cache.save()

        return Response(sums, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
