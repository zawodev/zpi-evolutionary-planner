#include "utils/JsonParser.hpp"
#include "model/EventModels.hpp"
#include <fstream>
#include <nlohmann/json.hpp>
#include <iostream>
#include <stdexcept>
#include <filesystem>
#include "utils/Logger.hpp"
#include "optimization/Evaluator.hpp"

using json = nlohmann::json;
namespace fs = std::filesystem;

static std::string formatVectorOfVectors(const json& arr, int indent_level = 6) {
    std::string indent_inner = std::string(indent_level, ' ');
    std::string indent_close = std::string(indent_level - 2, ' ');
    std::string result = "[\n";
    for (size_t i = 0; i < arr.size(); ++i) {
        result += indent_inner + arr[i].dump();
        if (i < arr.size() - 1) result += ",";
        result += "\n";
    }
    result += indent_close + "]";
    return result;
}




// --------------- input and output json data conversion functions ---------------




RawProblemData JsonParser::toRawProblemData(const nlohmann::json& j) {
    try {
        RawProblemData data;
        // constraints
        const auto& c = j.at("constraints");
        data.timeslots_daily = c.at("TimeslotsDaily").get<int>();
        data.days_in_cycle = c.at("DaysInCycle").get<int>();
        data.min_students_per_group = c.at("MinStudentsPerGroup").get<int>();
        data.groups_per_subject = c.at("GroupsPerSubject").get<std::vector<int>>();
        data.groups_capacity = c.at("GroupsCapacity").get<std::vector<int>>();
        data.rooms_capacity = c.at("RoomsCapacity").get<std::vector<int>>();
        data.groups_tags = c.at("GroupsTags").get<std::vector<std::vector<int>>>();
        data.rooms_tags = c.at("RoomsTags").get<std::vector<std::vector<int>>>();
        data.students_subjects = c.at("StudentsSubjects").get<std::vector<std::vector<int>>>();
        data.teachers_groups = c.at("TeachersGroups").get<std::vector<std::vector<int>>>();
        data.rooms_unavailability_timeslots = c.at("RoomsUnavailabilityTimeslots").get<std::vector<std::vector<int>>>();
        data.students_unavailability_timeslots = c.at("StudentsUnavailabilityTimeslots").get<std::vector<std::vector<int>>>();
        data.teachers_unavailability_timeslots = c.at("TeachersUnavailabilityTimeslots").get<std::vector<std::vector<int>>>();
        
        // preferences
        const auto& p = j.at("preferences");
        
        // students preferences - array format: [WidthHeightInfo, [minGaps, maxGaps, weight], [timeslot_weights...], [group_weights...]]
        if (p.contains("students")) {
            for (const auto& s : p.at("students")) {
                StudentPreference sp;
                sp.width_height_info = s[0].get<int>();
                sp.gaps_info = s[1].get<std::vector<int>>();
                sp.preferred_timeslots = s[2].get<std::vector<int>>();
                sp.preferred_groups = s[3].get<std::vector<int>>();
                data.students_preferences.push_back(sp);
            }
        }
        
        // teachers preferences - array format: [WidthHeightInfo, [minGaps, maxGaps, weight], [timeslot_weights...]]
        if (p.contains("teachers")) {
            for (const auto& t : p.at("teachers")) {
                TeacherPreference tp;
                tp.width_height_info = t[0].get<int>();
                tp.gaps_info = t[1].get<std::vector<int>>();
                tp.preferred_timeslots = t[2].get<std::vector<int>>();
                data.teachers_preferences.push_back(tp);
            }
        }
        
        return data;
    } catch (const nlohmann::json::exception& e) {
        throw std::runtime_error(std::string("JSON structure error: ") + e.what());
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("JSON parse error: ") + e.what());
    }
}

nlohmann::json JsonParser::toJson(const RawProblemData& data) {
    json j;
    // constraints
    j["constraints"]["TimeslotsDaily"] = data.timeslots_daily;
    j["constraints"]["DaysInCycle"] = data.days_in_cycle;
    j["constraints"]["MinStudentsPerGroup"] = data.min_students_per_group;
    j["constraints"]["GroupsPerSubject"] = data.groups_per_subject;
    j["constraints"]["GroupsCapacity"] = data.groups_capacity;
    j["constraints"]["RoomsCapacity"] = data.rooms_capacity;
    j["constraints"]["GroupsTags"] = data.groups_tags;
    j["constraints"]["RoomsTags"] = data.rooms_tags;
    j["constraints"]["StudentsSubjects"] = data.students_subjects;
    j["constraints"]["TeachersGroups"] = data.teachers_groups;
    j["constraints"]["RoomsUnavailabilityTimeslots"] = data.rooms_unavailability_timeslots;
    j["constraints"]["StudentsUnavailabilityTimeslots"] = data.students_unavailability_timeslots;
    j["constraints"]["TeachersUnavailabilityTimeslots"] = data.teachers_unavailability_timeslots;
    
    // preferences
    if (!data.students_preferences.empty()) {
        for (const auto& sp : data.students_preferences) {
            json s = json::array();
            s.push_back(sp.width_height_info);
            s.push_back(sp.gaps_info);
            s.push_back(sp.preferred_timeslots);
            s.push_back(sp.preferred_groups);
            j["preferences"]["students"].push_back(s);
        }
    }
    
    if (!data.teachers_preferences.empty()) {
        for (const auto& tp : data.teachers_preferences) {
            json t = json::array();
            t.push_back(tp.width_height_info);
            t.push_back(tp.gaps_info);
            t.push_back(tp.preferred_timeslots);
            j["preferences"]["teachers"].push_back(t);
        }
    }
    
    return j;
}

RawSolutionData JsonParser::toRawSolutionData(const nlohmann::json& jsonData) {
    try {
        RawSolutionData solutionData;
        solutionData.genotype = jsonData.at("genotype").get<std::vector<int>>();
        solutionData.fitness = jsonData.at("fitness").get<double>();
        solutionData.by_student = jsonData.at("by_student").get<std::vector<std::vector<int>>>();
        solutionData.by_group = jsonData.at("by_group").get<std::vector<std::vector<int>>>();
        solutionData.student_fitnesses = jsonData.at("student_fitnesses").get<std::vector<double>>();
        solutionData.teacher_fitnesses = jsonData.at("teacher_fitnesses").get<std::vector<double>>();
        solutionData.management_fitness = jsonData.at("management_fitness").get<double>();
        return solutionData;
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to parse solution data: " + std::string(e.what()));
    }
}

nlohmann::json JsonParser::toJson(const RawSolutionData& data) {
    json j;
    j["genotype"] = data.genotype;
    j["fitness"] = data.fitness;
    j["by_student"] = data.by_student;
    j["by_group"] = data.by_group;
    j["student_fitnesses"] = data.student_fitnesses;
    j["teacher_fitnesses"] = data.teacher_fitnesses;
    j["management_fitness"] = data.management_fitness;
    return j;
}




// --------------- event based json data conversion functions ---------------




RawJobData JsonParser::toRawJobData(const nlohmann::json& jsonData) {
    try {
        RawJobData jobData;
        jobData.recruitment_id = jsonData.at("recruitment_id").get<std::string>();
        jobData.max_execution_time = jsonData.value("max_execution_time", 300);
        jobData.problem_data = toRawProblemData(jsonData.at("problem_data"));
        return jobData;
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to parse job data: " + std::string(e.what()));
    }
}

nlohmann::json JsonParser::toJson(const RawJobData& jobData) {
    json j;
    j["recruitment_id"] = jobData.recruitment_id;
    j["max_execution_time"] = jobData.max_execution_time;
    j["problem_data"] = toJson(jobData.problem_data);
    return j;
}

RawControlData JsonParser::toRawControlData(const nlohmann::json& jsonData) {
    try {
        RawControlData controlData;
        controlData.job_id = jsonData.at("job_id").get<std::string>();
        controlData.action = jsonData.at("action").get<std::string>();
        controlData.data = jsonData.value("data", json::object());
        return controlData;
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to parse control data: " + std::string(e.what()));
    }
}

nlohmann::json JsonParser::toJson(const RawControlData& controlData) {
    json j;
    j["job_id"] = controlData.job_id;
    j["action"] = controlData.action;
    j["data"] = controlData.data;
    return j;
}

RawProgressData JsonParser::toRawProgressData(const nlohmann::json& jsonData) {
    try {
        RawProgressData progressData;
        progressData.job_id = jsonData.at("job_id").get<std::string>();
        progressData.iteration = jsonData.at("iteration").get<int>();
        progressData.best_solution = toRawSolutionData(jsonData.at("best_solution"));
        return progressData;
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to parse progress data: " + std::string(e.what()));
    }
}

nlohmann::json JsonParser::toJson(const RawProgressData& progressData) {
    json j;
    j["job_id"] = progressData.job_id;
    j["iteration"] = progressData.iteration;
    j["best_solution"] = toJson(progressData.best_solution);
    return j;
}




// --------------- below to be removed ---------------




void JsonParser::writeInput(const std::string& filename, const RawProblemData& data) {
    try {
        fs::path outPath(filename);
        if (!outPath.parent_path().empty() && !fs::exists(outPath.parent_path())) {
            fs::create_directories(outPath.parent_path());
        }
        std::ofstream out(filename);
        if (!out) {
            throw std::runtime_error("Cannot open file for writing: " + filename);
        }
        
        json j = toJson(data);
        
        //manual pretty print to avoid issues with large arrays in one line
        std::string json_str = "{\n";
        json_str += "  \"constraints\": {\n";
        json_str += "    \"TimeslotsDaily\": " + std::to_string(j["constraints"]["TimeslotsDaily"].get<int>()) + ",\n";
        json_str += "    \"DaysInCycle\": " + std::to_string(j["constraints"]["DaysInCycle"].get<int>()) + ",\n";
        json_str += "    \"MinStudentsPerGroup\": " + std::to_string(j["constraints"]["MinStudentsPerGroup"].get<int>()) + ",\n";
        json_str += "    \"GroupsPerSubject\": " + j["constraints"]["GroupsPerSubject"].dump() + ",\n";
        json_str += "    \"GroupsCapacity\": " + j["constraints"]["GroupsCapacity"].dump() + ",\n";
        json_str += "    \"RoomsCapacity\": " + j["constraints"]["RoomsCapacity"].dump() + ",\n";
        json_str += "    \"GroupsTags\": " + formatVectorOfVectors(j["constraints"]["GroupsTags"]) + ",\n";
        json_str += "    \"RoomsTags\": " + formatVectorOfVectors(j["constraints"]["RoomsTags"]) + ",\n";
        json_str += "    \"StudentsSubjects\": " + formatVectorOfVectors(j["constraints"]["StudentsSubjects"]) + ",\n";
        json_str += "    \"TeachersGroups\": " + formatVectorOfVectors(j["constraints"]["TeachersGroups"]) + ",\n";
        json_str += "    \"RoomsUnavailabilityTimeslots\": " + formatVectorOfVectors(j["constraints"]["RoomsUnavailabilityTimeslots"]) + ",\n";
        json_str += "    \"StudentsUnavailabilityTimeslots\": " + formatVectorOfVectors(j["constraints"]["StudentsUnavailabilityTimeslots"]) + ",\n";
        json_str += "    \"TeachersUnavailabilityTimeslots\": " + formatVectorOfVectors(j["constraints"]["TeachersUnavailabilityTimeslots"]) + "\n";
        json_str += "  }";
        if (j.contains("preferences")) {
            json_str += ",\n  \"preferences\": " + j["preferences"].dump(2);
        }
        json_str += "\n}\n";
        out << json_str;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("JSON write error: ") + e.what());
    }
}

void JsonParser::writeJobInput(const std::string& filename, const RawJobData& jobData) {
    try {
        fs::path outPath(filename);
        if (!outPath.parent_path().empty() && !fs::exists(outPath.parent_path())) {
            fs::create_directories(outPath.parent_path());
        }
        std::ofstream out(filename);
        if (!out) {
            throw std::runtime_error("Cannot open file for writing: " + filename);
        }
        
        json j = toJson(jobData);
        out << j.dump(2);
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("JSON write error: ") + e.what());
    }
}

void JsonParser::writeOutput(const std::string& filename, const Individual& individual, const ProblemData& data, const Evaluator& evaluator) {
    try {
        // Create RawSolutionData from Individual
        RawSolutionData solutionData(individual, data, evaluator);
        
        fs::path outPath(filename);
        if (!outPath.parent_path().empty() && !fs::exists(outPath.parent_path())) {
            fs::create_directories(outPath.parent_path());
        }
        std::ofstream out(filename);
        if (!out) {
            throw std::runtime_error("Cannot open file for writing: " + filename);
        }

        json j = toJson(solutionData);

        //manual pretty print to avoid issues with large arrays in one line
        std::string json_str = "{\n";
        json_str += "  \"genotype\": " + j["genotype"].dump() + ",\n";
        json_str += "  \"fitness\": " + std::to_string(j["fitness"].get<double>()) + ",\n";
        json_str += "  \"by_student\": " + formatVectorOfVectors(j["by_student"], 4) + ",\n";
        json_str += "  \"by_group\": " + formatVectorOfVectors(j["by_group"], 4) + ",\n";
        json_str += "  \"student_fitnesses\": " + j["student_fitnesses"].dump() + ",\n";
        json_str += "  \"teacher_fitnesses\": " + j["teacher_fitnesses"].dump() + ",\n";
        json_str += "  \"management_fitness\": " + std::to_string(j["management_fitness"].get<double>()) + "\n";
        json_str += "}\n";
        out << json_str;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("JSON write error: ") + e.what());
    }
}
