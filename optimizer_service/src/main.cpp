#include "event/EventReceiver.hpp"
#include "event/EventSender.hpp"
#include "optimization/Evaluator.hpp"
#include "optimization/IGeneticAlgorithm.hpp"
#include "optimization/ExampleGeneticAlgorithm.hpp"
#include "optimization/ZawodevGeneticAlgorithm.hpp"
#include "utils/JsonParser.hpp"
#include "utils/Logger.hpp"
#include "utils/TestCaseGenerator.hpp"
#include <iostream>
#include <memory>
#include <chrono>
#include <thread>
#include <cstdlib>

void processJob(EventReceiver& receiver, EventSender& sender) {
    RawJobData jobData = receiver.receive();
    Logger::info("Received job: " + jobData.recruitment_id + ", with max execution time: " + std::to_string(jobData.max_execution_time) + " seconds");

    ProblemData data(jobData.problem_data);
    if (!data.isFeasible()) {
        Logger::error("Problem is not solvable for job: " + jobData.recruitment_id);
        return;
    }

    std::string debugMsg = "New job from Recruitment: " + jobData.recruitment_id + " - ProblemData with " + 
                           std::to_string(data.getStudentsNum()) + " students, " +
                           std::to_string(data.getGroupsNum()) + " groups, " +
                           std::to_string(data.getSubjectsNum()) + " subjects, " +
                           std::to_string(data.getRoomsNum()) + " rooms, " +
                           std::to_string(data.getTeachersNum()) + " teachers, and " +
                           std::to_string(data.totalTimeslots()) + " total timeslots.";
    Logger::info(debugMsg);

    Evaluator evaluator(data);
    std::unique_ptr<IGeneticAlgorithm> geneticAlgorithm = std::make_unique<ExampleGeneticAlgorithm>();
    Logger::info("Using genetic algorithm: " + std::string(typeid(*geneticAlgorithm).name()));
    
    //int seed = 42;
    int seed = std::random_device{}();
    Logger::info("Initializing genetic algorithm with seed: " + std::to_string(seed));
    geneticAlgorithm->Init(data, evaluator, seed);
    Logger::info("Genetic algorithm initialization complete. Starting iterations...");

    // track exec time
    auto startTime = std::chrono::steady_clock::now();
    auto maxDuration = std::chrono::seconds(jobData.max_execution_time);

    Individual bestIndividual;
    for (int iterNum = 0; true; ++iterNum) {
        bool shouldBreak = false;
        bestIndividual = geneticAlgorithm->RunIteration(iterNum);
        Logger::info("Iteration " + std::to_string(iterNum) + ", best fitness: " + std::to_string(bestIndividual.fitness));
 
        // check for cancel event
        if (receiver.checkForCancellation()) {
            Logger::warn("Job " + jobData.recruitment_id + " cancelled at iteration " + std::to_string(iterNum));
            shouldBreak = true;
        }
        
        // check max time limit
        auto currentTime = std::chrono::steady_clock::now();
        if (currentTime - startTime >= maxDuration) {
            Logger::warn("Job " + jobData.recruitment_id + " reached maximum execution time at iteration " + std::to_string(iterNum));
            shouldBreak = true;
        }

        // send progress update
        RawSolutionData solutionData(bestIndividual, data, evaluator);
        RawProgressData progressData(jobData.recruitment_id, shouldBreak ? -1 : iterNum, solutionData);
        sender.sendProgress(progressData);

        if (shouldBreak) break;
    }

    Logger::info("Optimization complete for job: " + jobData.recruitment_id);
}


void testGenerateAndSave() {
    TestCaseGenerator generator;
    int numStudents = 200;
    int numGroups = 40;
    int numSubjects = 16;
    int numRooms = 12;
    int numTeachers = 10;
    int numTimeslots = 56;
    int extraCapacity = 100; // extra seats distributed randomly across groups (0 = exactly enough capacity)
    int executionTime = 600;

    RawJobData testJob = generator.generateJob(numStudents, numGroups, numSubjects, numRooms, numTeachers, numTimeslots, extraCapacity, executionTime);
    
    std::string filename = "data/input/test_job_1.json";
    JsonParser::writeJobInput(filename, testJob);
    Logger::info("Generated test job saved to " + filename);
}

int main() {
    try {
        //testGenerateAndSave(); return 0;
        Logger::info("Starting Optimizer Service...");

        // we use redis if REDIS_HOST environment variable is set (in docker), otherwise use file-based
        const char* redisHost = std::getenv("REDIS_HOST");
        std::unique_ptr<EventReceiver> receiver;
        std::unique_ptr<EventSender> sender;

        if (redisHost) {
            std::string redisUrl = std::string("redis://") + redisHost + ":6379";
            Logger::info("Using Redis connection: " + redisUrl);
            receiver = std::make_unique<RedisEventReceiver>(redisUrl);
            sender = std::make_unique<RedisEventSender>(redisUrl);
        } else {
            Logger::info("Using file-based event system");
            receiver = std::make_unique<FileEventReceiver>("data/input");
            sender = std::make_unique<FileEventSender>("data/output");
        }

        Logger::info("Optimizer service started. Waiting for jobs...");

        // main service loop
        while (true) {
            try {
                if (receiver->hasMoreJobs()) {
                    processJob(*receiver, *sender);
                } else {
                    Logger::info("No more jobs available. Waiting...");
                    std::this_thread::sleep_for(std::chrono::seconds(5));
                }
            } catch (const std::exception& e) {
                Logger::error("Error processing job: " + std::string(e.what()));
                // we should probably continue with next job instead of terminating
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        }
    } 
    catch (const std::exception& e) {
        Logger::error("Fatal error in optimizer service: " + std::string(e.what()));
        return 1;
    }
    return 0;
}
