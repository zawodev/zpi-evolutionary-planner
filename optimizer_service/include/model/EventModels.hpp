#pragma once
#include "ProblemData.hpp"
#include "Individual.hpp"
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

// job data
struct RawJobData {
    std::string recruitment_id;
    RawProblemData problem_data;
    int max_execution_time = 300;
    
    RawJobData() = default;
    RawJobData(const std::string& recruitmentId, const RawProblemData& data, int maxTime = 300)
        : recruitment_id(recruitmentId), problem_data(data), max_execution_time(maxTime) {}
};

// control data
struct RawControlData {
    std::string job_id;
    std::string action;  // "cancel", etc.
    nlohmann::json data;
    
    RawControlData() = default;
    RawControlData(const std::string& jobId, const std::string& act)
        : job_id(jobId), action(act) {}
};

// solution data
struct RawSolutionData {
    std::vector<int> genotype;
    double fitness = 0.0;
    std::vector<std::vector<int>> by_student;
    std::vector<std::vector<int>> by_group;
    std::vector<double> student_fitnesses;
    std::vector<double> teacher_fitnesses;
    double management_fitness = 0.0;
    
    RawSolutionData() = default;
    
    // this constructor processes individual and extracts all solution data
    RawSolutionData(const Individual& individual, const ProblemData& data, const class Evaluator& evaluator);
};

// progress data
struct RawProgressData {
    std::string job_id;
    int iteration;
    RawSolutionData best_solution;
    
    RawProgressData() = default;
    RawProgressData(const std::string& jobId, int iter, const RawSolutionData& solution)
        : job_id(jobId), iteration(iter), best_solution(solution) {}
};
