#pragma once
#include "model/Individual.hpp"
#include "model/ProblemData.hpp"
#include "optimization/Evaluator.hpp"

class IGeneticAlgorithm {
public:
    virtual ~IGeneticAlgorithm() = default;
    virtual Individual Init(const ProblemData& data, const Evaluator& evaluator, int seed = 42) = 0;
    virtual Individual RunIteration(int currentIteration) = 0;
};

