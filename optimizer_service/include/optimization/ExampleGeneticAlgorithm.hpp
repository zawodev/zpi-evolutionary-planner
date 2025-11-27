#pragma once
#include "model/Individual.hpp"
#include "model/ProblemData.hpp"
#include "optimization/Evaluator.hpp"
#include "optimization/IGeneticAlgorithm.hpp"

class ExampleGeneticAlgorithm : public IGeneticAlgorithm {
public:
    Individual Init(const ProblemData& data, const Evaluator& evaluator, int seed = std::random_device{}()) override;
    Individual RunIteration(int currentIteration) override;
private:
    // system variables
    const ProblemData* problemData = nullptr;
    const Evaluator* evaluator = nullptr;
    mutable std::mt19937 rng;
    bool initialized = false;

    // algorithm variables
    Individual bestIndividual;

    // functions
    void initRandom(Individual& individual) const;

    // --- example extension of this class: ---
    // vector<Individual> population;
    // int populationSize = 50;
    // double mutationRate = 0.01;
    // double crossoverRate = 0.7;
    // void mutate(Individual& individual);
    // Individual crossover(const Individual& parent1, const Individual& parent2);
    // Individual tournamentSelection(const std::vector<Individual>& population);
    // etc...
};