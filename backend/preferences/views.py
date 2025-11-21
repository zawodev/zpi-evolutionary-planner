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
    "FreeDayPreference": 0, # weight, positive means want as much free days as possible, negative means prefer no free days
    "ShortDayPreference": 0, # weight, positive means want as much short days as possible, negative means prefer no short days
    "UniformityPreference": 0, # weight, positive means want uniform distribution of workload (every day similar amount of timeslots), negative means prefer concentrated workload (few busy days, few free days)
    
    "MinDayLength": 0, # minimal amount of timeslots every day should have
    "MaxDayLength": 0, # maximal amount of timeslots every day should have
    "PreferredDayStartTimeslot": 0, # exact day start timeslot when you want to start day work
    "PreferredDayEndTimeslot": 0, # exact day end timeslot when you want to end day work
    "GapsInfo": [0, 0, 0], # minGaps, maxGaps, weight

# pokazac zbiorcze statystyki dla grupy jak fituje dla kazdego usera
# fitness calc type typu 01 do wyboru
# porównać do optymalizacji planowej zachłannej (trudne) - albo random searchem + repair??? chyba sie da 

    # --- ABOVE IS ABOUT TO CHANGE ---
    
    "PreferredTimeslots": [0, 0, 0, 0, 0, 0, 0], # for each timeslot in cycle, weight
    "PreferredGroups": [0, 0, 0, 0, 0] # for each group, weight
}


IDEAS_FOR_PREFERENCES = {
    "FreeDay": {
      "Value": 2, # preferowana liczba dni wolnych
      "Weight": 5, # jak bardzo chcemy akurat to mieć
      "MinAcceptable": 0, # minimalna akceptowalna liczba dni wolnych
      "MaxAcceptable": 7 # maksymalna akceptowalna liczba dni wolnych (alternatywnie do Value?)
    },

    "ShortDay": {
      "Value": 2, # preferowana liczba dni traktowanych jako "short" (<= ShortDayThreshold)
      "Weight": 3,
      "ShortDayThresholdHours": 2
    },

    "Evenness": {
      "Value": 8, # skala 0..10 (10 = maksymalnie równe długością dni, 0 = wcale nie równe)
      "Weight": 6
    },

    "Concentration": {
      "Value": 3, # skala 0..10 (10 = maksymalnie skupione obok siebie dni wolnych/krótkich, 0 = wcale nie)
      "Weight": 4
    },

    "MaxDayLength": {
      "Value": 10, # preferowana maksymalna liczba godzin w dniu (per dzień? każdego dnia tak samo?)
      "Weight": 5
    },

    "MinDayLength": {
      "Value": 0, # analogicznie minimalna
      "Weight": 2
    },

    "PreferredStartTime": {
      "Value": 9.0, # godzina gdzie co do zasady chcemy zaczynać zajęcia
      "Weight": 2,
      "ToleranceHours": 1.5 # dopuszczalne odchylenie
    },

    "PreferredEndTime": {
      "Value": 17.0, # analogicznie kończenie zajęć
      "Weight": 2,
      "ToleranceHours": 1.5
    },

    "BlockPreference": {
      "Value": 5, # 0..10, dodatnie = wolę długie bloki, ujemne (0..5) = wolę rozproszone krótkie sloty
      "Weight": 2
    },

    "TransitionCost": {
      "Value": 5, # 0..10, im większe tym mniej lubię zmiany pomiędzy typami zajęć (np chce mieć ćwiczenia po wykładzie od razu)
      "Weight": 1
    },

    "PreferredTimeslots": {
      "Values": [0,0,0,0,0,0,0], # tutaj nasz faktyczny wektor na podstawie kalendarza tygodnia
      "Weights": [1,1,1,1,1,1,1]
    },

    "PreferredGroups": {
      "Values": [0,0,0,0,0], # tutaj per grupa informacje jakieś
      "Weights": [1,1,1,1,1]
    }
}




DEFAULT_CONSTRAINTS = {
    "TimeslotsDaily": 0, # 4 x hours (15min timeslots)
    "DaysInCycle": 7, # 7, 14 or 28
    "NumSubjects": 0,
    "NumGroups": 0,
    "NumTeachers": 0,
    "NumStudents": 0,
    "NumRooms": 0,
    "NumTags": 0,
    "StudentWeights": [], # for each student, weight
    "TeacherWeights": [], # for each teacher, weight
    "MinStudentsPerGroup": [], # for each group, student count requirement (or group no start)
    "SubjectsDuration": [], # for each subject, duration in timeslots
    "GroupsPerSubject": [], # for each subject, number of groups
    "GroupsCapacity": [], # for each group, capacity
    "RoomsCapacity": [], # for each room, capacity
    "GroupsTags": [], # groupId, tagId
    "RoomsTags": [], # roomId, tagId
    "StudentsSubjects": [], # subjectIds list for student 0
    "TeachersGroups": [], # groupIds list for teacher 0
    "RoomsUnavailabilityTimeslots": [], # roomId 0, list of timeslot ids
    "StudentsUnavailabilityTimeslots": [], # studentId 0, list of timeslot ids
    "TeachersUnavailabilityTimeslots": [] # teacherId 0, list of timeslot ids
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
