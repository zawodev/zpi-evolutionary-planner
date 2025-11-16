#pragma once
#include "model/Individual.hpp"
#include "model/ProblemData.hpp"
#include "optimization/Evaluator.hpp"
#include "optimization/IGeneticAlgorithm.hpp"

class ZawodevGeneticAlgorithm : public IGeneticAlgorithm {
public:
    void Init(const ProblemData& data, const Evaluator& evaluator, int seed = std::random_device{}()) override;
    Individual RunIteration(int currentIteration) override;
private:
    // system variables
    const ProblemData* problemData = nullptr;
    const Evaluator* evaluator = nullptr;
    mutable std::mt19937 rng;
    bool initialized = false;
    int INNER_LOOP_COUNT = 10;

    // algorithm variables
    Individual bestIndividual;
    std::vector<Individual> population;
    int populationSize = 128;
    int fihcSize = 4;
    int crossSize = 64;
    
    // functions
    void UpdateBestIndividual(Individual& contesterInd);
    void RunInnerIteration(int currentInnerIteration);
    void InitRandomInd(Individual& individual) const;
    void FihcInd(Individual& individual);
    void SortSelection();
    void Cross(Individual& parent1, Individual& parent2, Individual& child);
    void MutateInd(Individual& individual);
};