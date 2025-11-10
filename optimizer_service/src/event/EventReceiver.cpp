#include "event/EventReceiver.hpp"
#include "utils/JsonParser.hpp"
#include "utils/Logger.hpp"
#include <fstream>
#include <filesystem>
#include <nlohmann/json.hpp>
#include <sw/redis++/redis++.h>
#include <thread>
#include <chrono>

using json = nlohmann::json;



// -------------------------- File Event Receiver --------------------------



FileEventReceiver::FileEventReceiver(const std::string& directoryPath)
    : directoryPath_(directoryPath), currentJobIndex_(0) {
    loadJobFiles();
}

void FileEventReceiver::loadJobFiles() {
    Logger::info("Loading job files from directory: " + directoryPath_);
    
    if (!std::filesystem::exists(directoryPath_)) {
        throw std::runtime_error("Directory does not exist: " + directoryPath_);
    }
    
    for (const auto& entry : std::filesystem::directory_iterator(directoryPath_)) {
        if (entry.is_regular_file() && entry.path().extension() == ".json") {
            jobFiles_.push_back(entry.path().string());
        }
    }
    
    Logger::info("Found " + std::to_string(jobFiles_.size()) + " job files");
}

RawJobData FileEventReceiver::receive() {
    if (currentJobIndex_ >= jobFiles_.size()) {
        throw std::runtime_error("No more jobs available in file queue");
    }
    
    std::string filename = jobFiles_[currentJobIndex_];
    currentJobIndex_++;
    
    Logger::info("Processing job file: " + filename);
    
    std::ifstream in(filename);
    if (!in) {
        throw std::runtime_error("Cannot open file: " + filename);
    }
    
    json j;
    in >> j;
    
    RawJobData jobData = JsonParser::toRawJobData(j);
    
    currentJobId_ = jobData.recruitment_id;
    return jobData;
}

bool FileEventReceiver::checkForCancellation() {
    // for file-based input, no cancellation mechanism (never will be)
    return false;
}

std::string FileEventReceiver::getCurrentJobId() const {
    return currentJobId_;
}

bool FileEventReceiver::hasMoreJobs() {
    return currentJobIndex_ < jobFiles_.size();
}



// ------------------------ Redis Event Receiver ------------------------

RedisEventReceiver::RedisEventReceiver(const std::string& connectionString,
                                     const std::string& jobQueue,
                                     const std::string& cancelKeyPrefix)
    : connectionString_(connectionString), jobQueue_(jobQueue), cancelKeyPrefix_(cancelKeyPrefix),
      redisConnection_(nullptr), cancelRequested_(false) {
    parseConnectionString();
    connect();
}

RedisEventReceiver::~RedisEventReceiver() {
    disconnect();
}

void RedisEventReceiver::parseConnectionString() {
    // parse connection string: "redis://host:port" or "host:port"
    std::string connStr = connectionString_;
    if (connStr.find("redis://") == 0) {
        connStr = connStr.substr(8); // remove "redis://"
    }
    
    size_t colonPos = connStr.find(':');
    if (colonPos != std::string::npos) {
        host_ = connStr.substr(0, colonPos);
        port_ = connStr.substr(colonPos + 1);
    } else {
        host_ = connStr.empty() ? "localhost" : connStr;
        port_ = "6379";
    }
    
    if (host_.empty()) {
        host_ = "localhost";
    }
}

void RedisEventReceiver::connect() {
    Logger::info("Connecting to Redis for receiving: " + connectionString_);
    Logger::info("Redis host: " + host_ + ", port: " + port_);
    
    try {
        // create redis connection using redis-plus-plus
        sw::redis::ConnectionOptions connection_options;
        connection_options.host = host_;
        connection_options.port = std::stoi(port_);
        // no socket_timeout to allow BRPOP to wait infinitely
        // connection_options.socket_timeout = std::chrono::milliseconds(1000);
        
        auto* redis = new sw::redis::Redis(connection_options);
        redisConnection_ = redis;
        
        // test connection
        redis->ping();
        
        Logger::info("Successfully connected to Redis");
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to connect to Redis: " + std::string(e.what()));
    }
}

void RedisEventReceiver::disconnect() {
    if (redisConnection_) {
        Logger::info("Disconnecting from Redis receiver");
        delete static_cast<sw::redis::Redis*>(redisConnection_);
        redisConnection_ = nullptr;
    }
}

RawJobData RedisEventReceiver::receive() {
    Logger::info("Waiting for job data from Redis queue: " + jobQueue_);
    
    if (!redisConnection_) {
        throw std::runtime_error("Redis connection not established");
    }
    
    auto* redis = static_cast<sw::redis::Redis*>(redisConnection_);
    
    try {
        // use BRPOP with short timeout in a loop to allow cancellation checking
        while (true) {
            auto result = redis->brpop(jobQueue_, std::chrono::seconds(1)); // timout 1s
            
            if (result) {
                std::string messageBody = result->second;
                Logger::info("Received job message from Redis: " + messageBody.substr(0, 200) + "...");
                
                // parse JSON message
                json j = json::parse(messageBody);
                RawJobData jobData = JsonParser::toRawJobData(j);
                currentJobId_ = jobData.recruitment_id;
                
                Logger::info("Successfully received job: " + jobData.recruitment_id);
                return jobData;
            }
            
            // no job received within timeout, check for cancellation and continue waiting
            if (cancelRequested_.load()) {
                throw std::runtime_error("Job receiving cancelled");
            }
        }
        
    } catch (const std::exception& e) {
        throw std::runtime_error("Redis BRPOP failed: " + std::string(e.what()));
    }
}

bool RedisEventReceiver::checkForCancellation() {
    if (cancelRequested_.load()) {
        Logger::info("Cancellation requested for job: " + currentJobId_);
        return true;
    }
    
    return checkCancelFlag();
}

bool RedisEventReceiver::checkCancelFlag() {
    if (!redisConnection_ || currentJobId_.empty()) {
        return false;
    }
    
    auto* redis = static_cast<sw::redis::Redis*>(redisConnection_);
    std::string cancelKey = cancelKeyPrefix_ + currentJobId_;
    
    try {
        auto result = redis->get(cancelKey);
        if (result) {
            std::string value = *result;
            if (value == "true" || value == "1") {
                Logger::warn("Cancel flag found for job: " + currentJobId_);
                cancelRequested_.store(true);
                return true;
            }
        }
    } catch (const std::exception& e) {
        Logger::error("Failed to check cancel flag: " + std::string(e.what()));
    }
    
    return false;
}

std::string RedisEventReceiver::getCurrentJobId() const {
    return currentJobId_;
}

bool RedisEventReceiver::hasMoreJobs() {
    // For Redis, we always assume there might be more jobs
    // The actual waiting happens in receive()
    return true;
}
