#include "event/EventSender.hpp"
#include "utils/JsonParser.hpp"
#include "utils/Logger.hpp"
#include <fstream>
#include <iostream>
#include <iomanip>
#include <ctime>
#include <filesystem>
#include <sstream>
#include <sw/redis++/redis++.h>

using json = nlohmann::json;



// -------------------------- File Event Sender -------------------------- 



FileEventSender::FileEventSender(const std::string& directoryPath)
    : directoryPath_(directoryPath) {
    
    // create directory if not exists
    if (!std::filesystem::exists(directoryPath_)) {
        std::filesystem::create_directories(directoryPath_);
    }
    
    Logger::info("FileEventSender initialized with directory: " + directoryPath_);
}

void FileEventSender::sendProgress(const RawProgressData& progress) {
    Logger::info("Sending progress to file for job " + progress.job_id + 
                ", iteration " + std::to_string(progress.iteration));
    
    std::string filename = directoryPath_ + "/" + progress.job_id + "_iter_" + std::to_string(progress.iteration) + ".json";
    writeToFile(progress, filename);
}

void FileEventSender::writeToFile(const RawProgressData& message, const std::string& filename) {
    try {
        std::ofstream file(filename);
        
        if (!file) {
            throw std::runtime_error("Cannot open file for writing: " + filename);
        }
        
        json output = JsonParser::toJson(message);
        file << output.dump(2) << std::endl;
        file.close();
        
        Logger::info("Progress written to file: " + filename);
        
    } catch (const std::exception& e) {
        Logger::error("Failed to write to file: " + std::string(e.what()));
        throw;
    }
}


// ------------------------ Redis Event Sender ------------------------

RedisEventSender::RedisEventSender(const std::string& connectionString,
                                 const std::string& progressKeyPrefix,
                                 const std::string& progressChannel)
    : connectionString_(connectionString), progressKeyPrefix_(progressKeyPrefix), 
      progressChannel_(progressChannel), redisConnection_(nullptr) {
    Logger::info("RedisEventSender initialized with prefix: " + progressKeyPrefix_ + 
                ", channel: " + progressChannel_);
    parseConnectionString();
    connect();
}

RedisEventSender::~RedisEventSender() {
    disconnect();
}

void RedisEventSender::parseConnectionString() {
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

void RedisEventSender::connect() {
    Logger::info("Connecting to Redis for sending: " + connectionString_);
    Logger::info("Redis host: " + host_ + ", port: " + port_);
    
    try {
        // create Redis connection using redis-plus-plus
        sw::redis::ConnectionOptions connection_options;
        connection_options.host = host_;
        connection_options.port = std::stoi(port_);
        connection_options.socket_timeout = std::chrono::milliseconds(1000);
        
        auto* redis = new sw::redis::Redis(connection_options);
        redisConnection_ = redis;
        
        // test connection
        redis->ping();
        
        Logger::info("Successfully connected to Redis");
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to connect to Redis: " + std::string(e.what()));
    }
}

void RedisEventSender::disconnect() {
    if (redisConnection_) {
        Logger::info("Disconnecting from Redis sender");
        delete static_cast<sw::redis::Redis*>(redisConnection_);
        redisConnection_ = nullptr;
    }
}

void RedisEventSender::sendProgress(const RawProgressData& progress) {
    Logger::info("Sending progress to Redis for job " + progress.job_id + 
                ", iteration " + std::to_string(progress.iteration));
    
    if (!redisConnection_) {
        throw std::runtime_error("Redis connection not established");
    }
    
    auto* redis = static_cast<sw::redis::Redis*>(redisConnection_);
    
    try {
        // convert progress to JSON
        json progressJson = JsonParser::toJson(progress);
        std::string messageBody = progressJson.dump();
        
        // store progress in redis key (optimizer:progress:{id})
        std::string progressKey = progressKeyPrefix_ + progress.job_id;
        redis->set(progressKey, messageBody);
        
        // publish progress update notification (optimizer:progress:updates)
        auto subscribers = redis->publish(progressChannel_, messageBody);
        
        Logger::info("Successfully sent progress for job: " + progress.job_id + 
                    " (notified " + std::to_string(subscribers) + " subscribers)");
        Logger::info("Progress message: " + messageBody);
                    
    } catch (const std::exception& e) {
        throw std::runtime_error("Redis operation failed: " + std::string(e.what()));
    }
}
