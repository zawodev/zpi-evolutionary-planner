#include "model/EventModels.hpp"
#include "optimization/Evaluator.hpp"
#include "model/ProblemData.hpp"
#include "utils/Logger.hpp"
#include <stdexcept>

RawSolutionData::RawSolutionData(const Individual& individual, const ProblemData& data, const Evaluator& evaluator) {
    // Make a mutable copy to allow repair during evaluation
    Individual mutableIndividual = individual;
    fitness = evaluator.evaluate(mutableIndividual);
    
    // Use the repaired genotype
    genotype = mutableIndividual.genotype;
    
    int studentsNum = data.getStudentsNum();
    int groupsNum = data.getGroupsNum();
    days_in_cycle = data.getDaysInCycle();
    timeslots_daily = data.getTimeslotsDaily();
    
    // validate genotype size
    int expected_size = evaluator.getTotalGenes();
    if (genotype.size() != expected_size) {
        throw std::runtime_error("Invalid genotype size: " + std::to_string(genotype.size()) + 
                                ", expected: " + std::to_string(expected_size));
    }
    
    // by_student data
    by_student.clear();
    int geneIdx = 0;
    for (int s = 0; s < studentsNum; ++s) {
        std::vector<int> student_groups;
        int num_groups_for_student = data.getGroupsForStudent(s);
        for (int g = 0; g < num_groups_for_student; ++g) {
            int relGroup = genotype[geneIdx];
            int absGroup = data.getAbsoluteGroupIndex(geneIdx, relGroup);
            student_groups.push_back(absGroup);
            geneIdx++;
        }
        by_student.push_back(student_groups);
    }
    
    // by_group data
    by_group.clear();
    for (int g = 0; g < groupsNum; ++g) {
        int timeslot = genotype[geneIdx++];
        int room = genotype[geneIdx++];
        int subject = data.getSubjectFromGroup(g);
        int duration = data.getSubjectsDuration()[subject];
        int end_timeslot = timeslot + duration;
        by_group.push_back({timeslot, end_timeslot, room});
    }
    
    // get last fitness data from evaluator
    student_fitnesses = evaluator.getLastStudentFitnesses();
    teacher_fitnesses = evaluator.getLastTeacherFitnesses();
    student_detailed_fitnesses = evaluator.getLastStudentDetailedFitnesses();
    teacher_detailed_fitnesses = evaluator.getLastTeacherDetailedFitnesses();
    student_weighted_fitnesses = evaluator.getLastStudentWeightedFitnesses();
    teacher_weighted_fitnesses = evaluator.getLastTeacherWeightedFitnesses();
    total_student_weight = evaluator.getLastTotalStudentWeight();
    total_teacher_weight = evaluator.getLastTotalTeacherWeight();
    
    //Logger::debug("RawSolutionData created with fitness: " + std::to_string(fitness));
}
