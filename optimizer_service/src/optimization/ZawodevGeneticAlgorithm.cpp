#include "optimization/ZawodevGeneticAlgorithm.hpp"
#include "utils/Logger.hpp"
#include <random>
#include <algorithm>
#include <numeric>

Individual ZawodevGeneticAlgorithm::Init(const ProblemData& data, const Evaluator& evaluator, int seed) {
    this->problemData = &data;
    this->evaluator = &evaluator;
    bestIndividual = Individual{};
    initialized = true;

    // fihc initialization (from 1 to populationSize based on difficulty)
    int maxFihcs = populationSize * 1000;
    int totalGenes = evaluator.getTotalGenes();
    int maxVal = 0;
    for (int i = 0; i < totalGenes; ++i) {
        int v = evaluator.getMaxGeneValue(i);
        if (v > maxVal) {
            maxVal = v;
        }
    }
    long long diff = (long long)maxVal * (long long)totalGenes;
    long long rawSize = maxFihcs / (1 + diff);
    if (rawSize < 1) rawSize = 1;
    fihcSize = (int)rawSize;

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
        //std::cout << i << ": " << ind.fitness << "\n";
    }

    // debug info
    Logger::debug("Start fitness: " + std::to_string(bestIndividual.fitness));
    // exit(1);

    return bestIndividual;
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

void ZawodevGeneticAlgorithm::UpdateBestIndividual(Individual& contesterInd) {
    if (contesterInd.fitness > bestIndividual.fitness) {
        bestIndividual = contesterInd;
        Logger::debug("New best fitness: " + std::to_string(bestIndividual.fitness));
    }
}

void ZawodevGeneticAlgorithm::RunInnerIteration(int currentInnerIteration) {
    for (int i = 0; i < crossSize; ++i) {
        //rand idx from rng obj in class (from 0 inclusive to populationSize-1 inclusive)
        int idx_parent1 = std::uniform_int_distribution<int>(0, populationSize - 1)(rng);
        int idx_parent2 = std::uniform_int_distribution<int>(0, populationSize - 1)(rng);
        int idx_child = std::uniform_int_distribution<int>(0, populationSize - 1)(rng);
        Cross(population[idx_parent1], population[idx_parent2], population[idx_child]);
    }
    //Logger::debug("1/3 Crossover done.");
    for (int i = 0; i < mutationSize; ++i) {
        int idx = std::uniform_int_distribution<int>(0, populationSize - 1)(rng);
        MutateInd(population[idx]);
    }
    //Logger::debug("2/3 Mutation done.");
    for (int i = 0; i < fihcSize; ++i) {
        int idx = std::uniform_int_distribution<int>(0, populationSize - 1)(rng);
        FihcInd(population[idx]);
    }
    //Logger::debug("3/3 FIHC done.");

    //SortSelection();
    UpdateBestIndividual(population[0]);

    // no fstrings in cpp??? me saddy :c
    Logger::debug("Iteration: " + std::to_string(currentInnerIteration) + "/" + std::to_string(INNER_LOOP_COUNT));
    //population[0].printDebugInfo();

    //idk above need to be fixed looks ugly but i gotta go
}

void ZawodevGeneticAlgorithm::InitRandomInd(Individual& individual) {
    int count = 0;
    individual.fitness = -1.0;
    while (individual.fitness < 0) {
        individual.genotype.clear();
        for (int i = 0; i < evaluator->getTotalGenes(); ++i) {
            std::uniform_int_distribution<int> dist(0, evaluator->getMaxGeneValue(i));
            individual.genotype.push_back(dist(rng));
        }
        individual.fitness = evaluator->evaluate(individual);
        UpdateBestIndividual(individual);
        count++;
        if (count > 1000) {
            Logger::error("Failed to initialize a valid individual after 1000 attempts.");
            break;
        }
    }
    // Logger::debug("Initialized random individual after " + std::to_string(count) + " attempts with fitness: " + std::to_string(individual.fitness));
    // exit(1);
}

void ZawodevGeneticAlgorithm::FihcInd(Individual &individual) {
    // to be improved, very basic very bad definition of FIHC
    // now with random order of genes
    //Logger::debug("Before FIHC: ");
    //individual.printDebugInfo();
    InitRandomInd(individual); // re-initialize to random valid individual

    // Create a vector of gene indices and shuffle it for random order
    std::vector<size_t> geneIndices(individual.genotype.size());
    std::iota(geneIndices.begin(), geneIndices.end(), 0);
    std::shuffle(geneIndices.begin(), geneIndices.end(), rng);

    for (size_t geneIdx : geneIndices) {
        int originalValue = individual.genotype[geneIdx];
        // double originalFitness = individual.fitness; // unused

        Individual bestInd = individual;
        double bestFitness = individual.fitness;

        for (int val = 0; val <= evaluator->getMaxGeneValue((int)geneIdx); ++val) {
            if (val == originalValue) continue;

            Individual tempInd = individual;
            tempInd.genotype[geneIdx] = val;
            double newFitness = evaluator->evaluate(tempInd);
            UpdateBestIndividual(tempInd);
            
            if (newFitness > bestFitness) {
                bestFitness = newFitness;
                bestInd = tempInd;
            }
        }

        // Set to the best found individual (which might be repaired)
        individual = bestInd;
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
        int choice = std::uniform_int_distribution<int>(0, 1)(rng);
        child.genotype[i] = choice ? parent1.genotype[i] : parent2.genotype[i];
    }
    child.fitness = evaluator->evaluate(child);
    UpdateBestIndividual(child);
}

void ZawodevGeneticAlgorithm::MutateInd(Individual &individual) {
    int minMutations = 1;
    int maxMutations = 5;
    int mutations = std::uniform_int_distribution<int>(minMutations, maxMutations)(rng);

    float mutationChance = 0.03f;
    if (std::uniform_real_distribution<float>(0.0f, 1.0f)(rng) > mutationChance) return;

    for (int i = 0; i < mutations; i++){
        int idx = std::uniform_int_distribution<int>(0, evaluator->getTotalGenes() - 1)(rng);
        int val = std::uniform_int_distribution<int>(0, evaluator->getMaxGeneValue(idx))(rng);
        individual.genotype[idx] = val;
    }
    individual.fitness = evaluator->evaluate(individual);
    UpdateBestIndividual(individual);
}
