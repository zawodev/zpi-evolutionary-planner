#include "model/EventModels.hpp"
#include "optimization/Evaluator.hpp"
#include "model/ProblemData.hpp"
#include "utils/Logger.hpp"
#include <stdexcept>

RawSolutionData::RawSolutionData(const Individual& individual, const ProblemData& data, const Evaluator& evaluator) {
    // we copy basic data
    genotype = individual.genotype;
    fitness = evaluator.evaluate(individual);
    
    int studentsNum = data.getStudentsNum();
    int groupsNum = data.getGroupsNum();
    
    // validate genotype size
    int expected_size = evaluator.getTotalGenes();
    if (genotype.size() != expected_size) {
        throw std::runtime_error("Invalid genotype size: " + std::to_string(genotype.size()) + 
                                ", expected: " + std::to_string(expected_size));
    }
    
    // by_student data
    by_student.clear();
    int idx = 0;
    for (int s = 0; s < studentsNum; ++s) {
        std::vector<int> student_groups;
        int num_groups_for_student = data.getGroupsForStudent(s);
        for (int g = 0; g < num_groups_for_student; ++g) {
            student_groups.push_back(genotype[idx++]);
        }
        by_student.push_back(student_groups);
    }
    
    // by_group data
    by_group.clear();
    for (int g = 0; g < groupsNum; ++g) {
        int timeslot = genotype[idx++];
        int room = genotype[idx++];
        by_group.push_back({timeslot, room});
    }
    
    // get last fitness data from evaluator
    student_fitnesses = evaluator.getLastStudentFitnesses();
    teacher_fitnesses = evaluator.getLastTeacherFitnesses();
    
    Logger::debug("RawSolutionData created with fitness: " + std::to_string(fitness));
}
