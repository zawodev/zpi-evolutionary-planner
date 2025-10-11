from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserPreferences, Constraints, ManagementPreferences
from .serializers import UserPreferencesSerializer, ConstraintsSerializer, ManagementPreferencesSerializer
import copy


def update_nested_dict(original, path, value):
    """
    Update a nested dictionary from path
    - path: list of keys, example: ['FreeDays', 'Monday'] # /freedays/monday/<val> in json
    - value: new value to set at the specified path, example: False
    
    Example:
    original = {'FreeDays': {'Monday': True, 'Tuesday': False}}
    path = ['FreeDays', 'Monday']
    value = False
    result = update_nested_dict(original, path, value)
    # result = {'FreeDays': {'Monday': False, 'Tuesday': False}}
    """
    if not path:
        return value
    
    result = copy.deepcopy(original)
    current = result
    
    for key in path[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[path[-1]] = value
    return result


@api_view(['GET', 'PUT'])
def user_preferences_view(request, recruitment_id, user_id):
    try:
        if request.method == 'GET':
            try:
                preferences = UserPreferences.objects.get(
                    recruitment_id=recruitment_id,
                    user_id=user_id
                )
                serializer = UserPreferencesSerializer(preferences)
                return Response(serializer.data)
            except UserPreferences.DoesNotExist:
                default_data = {
                    "FreeDays": [],
                    "BusyDays": [],
                    "NoGaps": 0,
                    "PreferredGroups": [],
                    "AvoidGroups": [],
                    "PreferredTimeslots": [],
                    "AvoidTimeslots": []
                }
                return Response({
                    "id": None,
                    "user": user_id,
                    "recruitment": recruitment_id,
                    "preferences_data": default_data
                })
        
        elif request.method == 'PUT':
            preferences, created = UserPreferences.objects.get_or_create(
                recruitment_id=recruitment_id,
                user_id=user_id,
                defaults={
                    'preferences_data': {
                        "FreeDays": [],
                        "BusyDays": [],
                        "NoGaps": 0,
                        "PreferredGroups": [],
                        "AvoidGroups": [],
                        "PreferredTimeslots": [],
                        "AvoidTimeslots": []
                    }
                }
            )
            
            # check if request contains path update
            if 'path' in request.data and 'value' in request.data:
                path = request.data['path']
                value = request.data['value']
                preferences.preferences_data = update_nested_dict(
                    preferences.preferences_data,
                    path,
                    value
                )
                preferences.save()
            else: # full update
                serializer = UserPreferencesSerializer(
                    preferences,
                    data=request.data,
                    partial=True
                )
                if serializer.is_valid():
                    serializer.save()
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = UserPreferencesSerializer(preferences)
            return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PUT'])
def constraints_view(request, recruitment_id):
    try:
        if request.method == 'GET':
            try:
                constraints = Constraints.objects.get(recruitment_id=recruitment_id)
                serializer = ConstraintsSerializer(constraints)
                return Response(serializer.data)
            except Constraints.DoesNotExist:
                default_data = {
                    "TimeslotsPerDay": {},
                    "GroupsPerSubject": {},
                    "GroupsSoftCapacity": {},
                    "StudentsSubjects": {},
                    "TeachersGroups": {},
                    "RoomsUnavailabilityTimeslots": {}
                }
                return Response({
                    "id": None,
                    "recruitment": recruitment_id,
                    "constraints_data": default_data
                })
        
        elif request.method == 'PUT':
            constraints, created = Constraints.objects.get_or_create(
                recruitment_id=recruitment_id,
                defaults={
                    'constraints_data': {
                        "TimeslotsPerDay": {},
                        "GroupsPerSubject": {},
                        "GroupsSoftCapacity": {},
                        "StudentsSubjects": {},
                        "TeachersGroups": {},
                        "RoomsUnavailabilityTimeslots": {}
                    }
                }
            )
            
            # check if request contains path-based update
            if 'path' in request.data and 'value' in request.data:
                path = request.data['path']
                value = request.data['value']
                constraints.constraints_data = update_nested_dict(
                    constraints.constraints_data,
                    path,
                    value
                )
                constraints.save()
            else: # full update
                serializer = ConstraintsSerializer(
                    constraints,
                    data=request.data,
                    partial=True
                )
                if serializer.is_valid():
                    serializer.save()
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = ConstraintsSerializer(constraints)
            return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PUT'])
def management_preferences_view(request, recruitment_id):
    try:
        if request.method == 'GET':
            try:
                preferences = ManagementPreferences.objects.get(recruitment_id=recruitment_id)
                serializer = ManagementPreferencesSerializer(preferences)
                return Response(serializer.data)
            except ManagementPreferences.DoesNotExist:
                default_data = {
                    "PreferredRoomTimeslots": {},
                    "AvoidRoomTimeslots": {},
                    "GroupMaxOverflow": {}
                }
                return Response({
                    "id": None,
                    "recruitment": recruitment_id,
                    "preferences_data": default_data
                })
        
        elif request.method == 'PUT':
            preferences, created = ManagementPreferences.objects.get_or_create(
                recruitment_id=recruitment_id,
                defaults={
                    'preferences_data': {
                        "PreferredRoomTimeslots": {},
                        "AvoidRoomTimeslots": {},
                        "GroupMaxOverflow": {}
                    }
                }
            )
            
            # check if request contains path-based update
            if 'path' in request.data and 'value' in request.data:
                path = request.data['path']
                value = request.data['value']
                preferences.preferences_data = update_nested_dict(
                    preferences.preferences_data,
                    path,
                    value
                )
                preferences.save()
            else: # full update
                serializer = ManagementPreferencesSerializer(
                    preferences,
                    data=request.data,
                    partial=True
                )
                if serializer.is_valid():
                    serializer.save()
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = ManagementPreferencesSerializer(preferences)
            return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
