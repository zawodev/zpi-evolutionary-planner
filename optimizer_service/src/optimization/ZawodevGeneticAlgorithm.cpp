#include "optimization/ZawodevGeneticAlgorithm.hpp"
#include "utils/Logger.hpp"
#include <random>
#include <algorithm>
#include <numeric>

void ZawodevGeneticAlgorithm::Init(const ProblemData& data, const Evaluator& evaluator, int seed) {
    this->problemData = &data;
    this->evaluator = &evaluator;
    bestIndividual = Individual{};
    initialized = true;

    // inicjalizacja RNG z seed
    rng.seed(seed);

    // inicjalizacja genotypu (rozmiar na evaluator.getTotalGenes() oraz wartości na rng() % evaluator.getMaxGeneValue(i))
    InitRandomInd(bestIndividual);

    //init population
    population.clear();
    for (int i = 0; i < populationSize; ++i) {
        Individual ind;
        InitRandomInd(ind);
        population.push_back(ind);
    }

    // debug info
    Logger::debug("Start fitness: " + std::to_string(bestIndividual.fitness));
}

Individual ZawodevGeneticAlgorithm::RunIteration(int currentIteration) {
    if (!initialized || !problemData || !evaluator) {
        Logger::error("zawodev-ga not initialized properly or sth");
    }

    for (int i = 0; i < INNER_LOOP_COUNT; ++i) { //inner loop
        RunInnerIteration(i);
    }

    return bestIndividual;
}

void ZawodevGeneticAlgorithm::UpdateBestIndividual(Individual &contesterInd) {
    if (contesterInd.fitness > bestIndividual.fitness) {
        bestIndividual = contesterInd;
        Logger::debug("New best fitness: " + std::to_string(bestIndividual.fitness));
    }
}

void ZawodevGeneticAlgorithm::RunInnerIteration(int currentInnerIteration) {
    for (int i = 0; i < crossSize; ++i) {
        int idx_parent1 = rand() % populationSize;
        int idx_parent2 = rand() % populationSize;
        int idx_child = rand() % populationSize;
        Cross(population[idx_parent1], population[idx_parent2], population[idx_child]);
    }
    Logger::debug("1/3 Crossover done.");
    for (int i = 0; i < populationSize; ++i) {
        MutateInd(population[i]);
    }
    Logger::debug("2/3 Mutation done.");
    for (int i = 0; i < fihcSize; ++i) {
        int idx = rand() % populationSize;
        FihcInd(population[idx]);
    }
    Logger::debug("3/3 FIHC done.");

    SortSelection();
    UpdateBestIndividual(population[0]);

    // no fstrings in cpp??? me saddy :c
    Logger::debug("Iteration: " + std::to_string(currentInnerIteration) + "/" + std::to_string(INNER_LOOP_COUNT) + ", Best fitness: " + std::to_string(bestIndividual.fitness));
    //population[0].printDebugInfo();

    //idk above need to be fixed looks ugly but i gotta go
}

void ZawodevGeneticAlgorithm::InitRandomInd(Individual &individual) const
{
    individual.genotype.clear();
    for (int i = 0; i < evaluator->getTotalGenes(); ++i) {
        std::uniform_int_distribution<int> dist(0, evaluator->getMaxGeneValue(i));
        individual.genotype.push_back(dist(rng));
    }

    bool wasRepaired = evaluator->repair(individual);
    if (wasRepaired) {
        //Logger::debug("Individual's genotype was repaired. Now solution is valid.");
    }

    // still debating myself if we should evaluate here or not
    individual.fitness = evaluator->evaluate(individual);
}

void ZawodevGeneticAlgorithm::FihcInd(Individual &individual) {
    // to be improved, very basic very bad definition of FIHC
    // now with random order of genes
    //Logger::debug("Before FIHC: ");
    //individual.printDebugInfo();

    // Create a vector of gene indices and shuffle it for random order
    std::vector<size_t> geneIndices(individual.genotype.size());
    std::iota(geneIndices.begin(), geneIndices.end(), 0);
    std::shuffle(geneIndices.begin(), geneIndices.end(), rng);

    for (size_t geneIdx : geneIndices) {
        int originalValue = individual.genotype[geneIdx];
        double originalFitness = individual.fitness;

        int bestVal = originalValue;
        double bestFitness = originalFitness;

        for (int val = 0; val <= evaluator->getMaxGeneValue((int)geneIdx); ++val) {
            if (val == originalValue) continue;

            individual.genotype[geneIdx] = val;
            double newFitness = evaluator->evaluate(individual);
            if (newFitness > bestFitness) {
                bestFitness = newFitness;
                bestVal = val;
            }
        }

        // Set to the best found value
        individual.genotype[geneIdx] = bestVal;
        individual.fitness = bestFitness;
    }
    //Logger::debug("After FIHC: ");
    //individual.printDebugInfo();
}

void ZawodevGeneticAlgorithm::SortSelection() {
    // sort population by fitness descending
    std::sort(population.begin(), population.end(), [](const Individual& a, const Individual& b) {
        return a.fitness > b.fitness;
    });

    // keep only the top crossSize individuals, initialize the rest randomly
    population.resize(crossSize);
    while ((int)population.size() < populationSize) {
        Individual ind;
        this->InitRandomInd(ind);
        population.push_back(ind);
    }
}

void ZawodevGeneticAlgorithm::Cross(Individual &parent1, Individual &parent2, Individual &child) {
    for(int i = 0; i < evaluator->getTotalGenes(); i++){
        child.genotype[i] = rng() % 2 ? parent1.genotype[i] : parent2.genotype[i];
    }
    child.fitness = evaluator->evaluate(child);
}

void ZawodevGeneticAlgorithm::MutateInd(Individual &individual) {
    int mutations = 3;
    float mutationChance = 0.03f;
    if (rand() > mutationChance) return;

    for (int i = 0; i < mutations; i++){
        int idx = rand() % evaluator->getTotalGenes();
        int val = rand() % evaluator->getMaxGeneValue(idx);
        individual.genotype[idx] = val;
    }
}
