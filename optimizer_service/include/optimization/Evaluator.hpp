#pragma once
#include "model/Individual.hpp"
#include "model/ProblemData.hpp"
#include <random>

class Evaluator {
public:
    Evaluator(const ProblemData& data);
    double evaluate(const Individual& genotype) const;
    bool repair(Individual& individual) const;
    int getMaxGeneValue(int geneIdx) const { return maxValues[geneIdx]; }
    int getTotalGenes() const { return (int)maxValues.size(); }
    const std::vector<double>& getLastStudentFitnesses() const { return lastStudentFitnesses; }
    const std::vector<double>& getLastTeacherFitnesses() const { return lastTeacherFitnesses; }
private:
    void buildMaxValues();
    const ProblemData& problemData;
    std::vector<int> maxValues; // ACTUAL max values for each gene, if gene i can be 0..k (including k), maxValues[i] = k
    mutable std::vector<double> lastStudentFitnesses;
    mutable std::vector<double> lastTeacherFitnesses;
};
