#include "optimization/ExampleGeneticAlgorithm.hpp"
#include "utils/Logger.hpp"
#include <random>
#include <thread>
#include <chrono>

void ExampleGeneticAlgorithm::Init(const ProblemData& data, const Evaluator& evaluator, int seed) {
    this->problemData = &data;
    this->evaluator = &evaluator;
    bestIndividual = Individual{};
    initialized = true;

    // inicjalizacja RNG z seed
    rng.seed(seed);

    // inicjalizacja genotypu
    this->initRandom(bestIndividual);

    // debug info
    Logger::debug("Start fitness: " + std::to_string(bestIndividual.fitness));
}

Individual ExampleGeneticAlgorithm::RunIteration(int currentIteration) {
    if (!initialized || !problemData || !evaluator) {
        throw std::runtime_error("SimpleGeneticAlgorithm not initialized properly");
    }
    
    // Przykładowa logika: fitness losowy, można dodać mutacje/cross cokolwiek takiego genetycznego później
    Individual individual;
    for (int i = 0; i < 1; ++i) {
        this->initRandom(individual);
        //Logger::debug("Generated individual fitness: " + std::to_string(individual.fitness));

        if (individual.fitness > bestIndividual.fitness) {
            bestIndividual = individual;
        }
    }

    // wait for a second
    std::this_thread::sleep_for(std::chrono::seconds(1));

    return bestIndividual;
}

void ExampleGeneticAlgorithm::initRandom(Individual& individual) const {
    // losowa inicjalizacja genotypu
    individual.genotype.clear();
    for (int i = 0; i < evaluator->getTotalGenes(); ++i) {
        std::uniform_int_distribution<int> dist(0, evaluator->getMaxGeneValue(i));
        individual.genotype.push_back(dist(rng));
    }

    // naprawa genotypu, żeby nie łamał ograniczeń
    bool wasRepaired = evaluator->repair(individual);
    if (wasRepaired) {
        //Logger::debug("Individual's genotype was repaired. Now solution is valid.");
    }

    // obliczanie fitnessu
    individual.fitness = evaluator->evaluate(individual);
}
