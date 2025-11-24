#pragma once
#include "model/Individual.hpp"
#include "model/ProblemData.hpp"
#include <random>

class Evaluator {
public:
    Evaluator(const ProblemData& data);
    double evaluate(Individual& individual) const;
    int getMaxGeneValue(int geneIdx) const { return maxValues[geneIdx]; }
    int getTotalGenes() const { return (int)maxValues.size(); }
    const std::vector<double>& getLastStudentFitnesses() const { return lastStudentFitnesses; }
    const std::vector<double>& getLastTeacherFitnesses() const { return lastTeacherFitnesses; }
    const std::vector<std::vector<std::pair<double, double>>>& getLastStudentDetailedFitnesses() const { return lastStudentDetailedFitnesses; }
    const std::vector<std::vector<std::pair<double, double>>>& getLastTeacherDetailedFitnesses() const { return lastTeacherDetailedFitnesses; }
    const std::vector<double>& getLastStudentWeightedFitnesses() const { return lastStudentWeightedFitnesses; }
    const std::vector<double>& getLastTeacherWeightedFitnesses() const { return lastTeacherWeightedFitnesses; }
    double getLastTotalStudentWeight() const { return lastTotalStudentWeight; }
    double getLastTotalTeacherWeight() const { return lastTotalTeacherWeight; }

private:
    bool repair(Individual& individual) const;
    void buildMaxValues();
    const ProblemData& problemData;
    std::vector<int> maxValues; // ACTUAL max values for each gene, if gene i can be 0..k (including k), maxValues[i] = k
    mutable std::vector<double> lastStudentFitnesses;
    mutable std::vector<double> lastTeacherFitnesses;
    mutable std::vector<std::vector<std::pair<double, double>>> lastStudentDetailedFitnesses;
    mutable std::vector<std::vector<std::pair<double, double>>> lastTeacherDetailedFitnesses;
    mutable std::vector<double> lastStudentWeightedFitnesses;
    mutable std::vector<double> lastTeacherWeightedFitnesses;
    mutable double lastTotalStudentWeight = 0.0;
    mutable double lastTotalTeacherWeight = 0.0;
};
