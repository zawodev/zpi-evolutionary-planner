DEFAULT_USER_PREFERENCES = {
    # INFO:
    # - wagi we wszystkich mogą być dodatnie lub ujemne, 
    # - wielkość wartości bezwglęzdnej określa siłę preferencji

    # --- optional ---

    "FreeDays": 0, # wolne dni (jak bardzo) 
    "ShortDays": 0, # krótkie dni (jak bardzo)
    "UniformDays": 0, # równe dni długością względem innych dni
    "ConcentratedDays": 0, # skupienie roboty obok roboty a wolnego obok wolnego (jako całe dni)
    
    "MinGapsLength": [0, 0], # [value, weight]
    "MaxGapsLength": [0, 0], # [value, weight]

    "MinDayLength": [0, 0], # [value, weight]
    "MaxDayLength": [0, 0], # [value, weight]

    "PreferredDayStartTimeslot": [0, 0], # [value, weight]
    "PreferredDayEndTimeslot": [0, 0], # [value, weight]

    "TagOrder": [0, 0, 0], # chce żeby tag A był od razu po tagu B (albo przynajmniej tego samego dnia) [tagAId, tagBId, weight]

    # --- normal ---
    
    "PreferredTimeslots": [0, 0, 0, 0, 0, 0, 0], # for each timeslot in cycle, weight
    "PreferredGroups": [0, 0, 0, 0, 0] # for each group, weight
}


DEFAULT_HOST_PREFERENCES = {
    # INFO:
    # - wagi we wszystkich mogą być dodatnie lub ujemne, 
    # - wielkość wartości bezwglęzdnej określa siłę preferencji

    # --- optional ---

    "FreeDays": 0, # wolne dni (jak bardzo) 
    "ShortDays": 0, # krótkie dni (jak bardzo)
    "UniformDays": 0, # równe dni długością względem innych dni
    "ConcentratedDays": 0, # skupienie roboty obok roboty a wolnego obok wolnego (jako całe dni)
    
    "MinGapsLength": [0, 0], # [value, weight]
    "MaxGapsLength": [0, 0], # [value, weight]

    "MinDayLength": [0, 0], # [value, weight]
    "MaxDayLength": [0, 0], # [value, weight]

    "PreferredDayStartTimeslot": [0, 0], # [value, weight]
    "PreferredDayEndTimeslot": [0, 0], # [value, weight]

    "TagOrder": [0, 0, 0], # chce żeby tag A był od razu po tagu B (albo przynajmniej tego samego dnia) [tagAId, tagBId, weight]

    # --- normal ---
    
    "PreferredTimeslots": [0, 0, 0, 0, 0, 0, 0], # for each timeslot in cycle, weight
}


DEFAULT_CONSTRAINTS = {
    "TimeslotsDaily": 0, # 4 x hours (15min timeslots)
    "DaysInCycle": 0, # 7, 14 or 28
    "NumSubjects": 0, # number of subjects
    "NumGroups": 0, # number of groups
    "NumTeachers": 0, # number of teachers
    "NumStudents": 0, # number of students
    "NumRooms": 0, # number of rooms
    "NumTags": 0, # number of tags
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


DEFAULT_CONSTRAINTS_WITH_DATA = {
    "TimeslotsDaily": 8, # 4 x hours (15min timeslots)
    "DaysInCycle": 7, # 7, 14 or 28
    "NumSubjects": 4, # number of subjects
    "NumGroups": 14, # number of groups
    "NumTeachers": 3, # number of teachers
    "NumStudents": 3, # number of students
    "NumRooms": 3, # number of rooms
    "NumTags": 3, # number of tags
    "StudentWeights": [1, 1, 1], # for each student, weight
    "TeacherWeights": [5, 5, 5], # for each teacher, weight
    "MinStudentsPerGroup": [ # for each group, student count requirement (or group no start)
        1, 1, 1, 
        1, 1, 1, 1, 1, 
        1, 1, 
        1, 1, 1, 1
    ],
    "SubjectsDuration": [4, 5, 3, 2], # for each subject, duration in timeslots
    "GroupsPerSubject": [3, 5, 2, 4], # for each subject, number of groups
    "GroupsCapacity": [ # for each group, capacity
        2, 2, 2, 
        2, 2, 2, 2, 2, 
        2, 2, 
        2, 2, 2, 2
    ],
    "RoomsCapacity": [2, 2, 2], # for each room, capacity
    "GroupsTags": [ # groupId, tagId
        [0, 1],
        [1, 2],
        [2, 1],
        [13, 0]
    ],
    "RoomsTags": [ # roomId, tagId
        [0, 1],
        [1, 2],
        [2, 0]
    ],
    "StudentsSubjects": [ # subjectIds list for student 0
        [0, 1, 2, 3],
        [0, 1],
        [1, 2, 3]
    ],
    "TeachersGroups": [ # groupIds list for teacher 0
        [0, 1, 2, 13],
        [3, 4, 5, 6, 7, 11, 12],
        [8, 9, 10]
    ],
    "RoomsUnavailabilityTimeslots": [ # roomId 0, list of timeslot ids
        [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55],
        [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55],
        [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]
    ],
    "StudentsUnavailabilityTimeslots": [ # studentId 0, list of timeslot ids
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    ],
    "TeachersUnavailabilityTimeslots": [ # teacherId 0, list of timeslot ids
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    ]
}