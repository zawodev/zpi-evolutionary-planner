#pragma once
#include "model/ProblemData.hpp"
#include "model/EventModels.hpp"

class TestCaseGenerator {
public:
    RawJobData generateJob(int numStudents, int numGroups, int numSubjects, int numRooms, int numTeachers, int numTimeslots, int extraCapacity, int maxExecutionTime = 300);
    RawProblemData generate(int numStudents, int numGroups, int numSubjects, int numRooms, int numTeachers, int numTimeslots, int extraCapacity);
};
