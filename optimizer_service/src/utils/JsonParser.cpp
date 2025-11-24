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
        data.num_subjects = c.at("NumSubjects").get<int>();
        data.num_groups = c.at("NumGroups").get<int>();
        data.num_teachers = c.at("NumTeachers").get<int>();
        data.num_students = c.at("NumStudents").get<int>();
        data.num_rooms = c.at("NumRooms").get<int>();
        data.num_tags = c.at("NumTags").get<int>();
        data.student_weights = c.at("StudentWeights").get<std::vector<int>>();
        data.teacher_weights = c.at("TeacherWeights").get<std::vector<int>>();
        data.min_students_per_group = c.at("MinStudentsPerGroup").get<std::vector<int>>();
        data.subjects_duration = c.at("SubjectsDuration").get<std::vector<int>>();
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
        
        // students preferences
        if (p.contains("students")) {
            for (const auto& s : p.at("students")) {
                StudentPreference sp;
                if (s.is_array()) {
                    // Handle array format (positional)
                    if (s.size() > 0) sp.free_days = s[0].get<int>();
                    if (s.size() > 1) sp.short_days = s[1].get<int>();
                    if (s.size() > 2) sp.uniform_days = s[2].get<int>();
                    if (s.size() > 3) sp.concentrated_days = s[3].get<int>();
                    if (s.size() > 4) sp.min_gaps_length = s[4].get<std::vector<int>>();
                    if (s.size() > 5) sp.max_gaps_length = s[5].get<std::vector<int>>();
                    if (s.size() > 6) sp.min_day_length = s[6].get<std::vector<int>>();
                    if (s.size() > 7) sp.max_day_length = s[7].get<std::vector<int>>();
                    if (s.size() > 8) sp.preferred_day_start_timeslot = s[8].get<std::vector<int>>();
                    if (s.size() > 9) sp.preferred_day_end_timeslot = s[9].get<std::vector<int>>();
                    if (s.size() > 10) sp.tag_order = s[10].get<std::vector<std::vector<int>>>();
                    if (s.size() > 11) sp.preferred_timeslots = s[11].get<std::vector<int>>();
                    if (s.size() > 12) sp.preferred_groups = s[12].get<std::vector<int>>();
                } else {
                    // Handle object format (named keys)
                    sp.free_days = s.value("FreeDays", 0);
                    sp.short_days = s.value("ShortDays", 0);
                    sp.uniform_days = s.value("UniformDays", 0);
                    sp.concentrated_days = s.value("ConcentratedDays", 0);
                    sp.min_gaps_length = s.value("MinGapsLength", std::vector<int>{0, 0});
                    sp.max_gaps_length = s.value("MaxGapsLength", std::vector<int>{0, 0});
                    sp.min_day_length = s.value("MinDayLength", std::vector<int>{0, 0});
                    sp.max_day_length = s.value("MaxDayLength", std::vector<int>{0, 0});
                    sp.preferred_day_start_timeslot = s.value("PreferredDayStartTimeslot", std::vector<int>{0, 0});
                    sp.preferred_day_end_timeslot = s.value("PreferredDayEndTimeslot", std::vector<int>{0, 0});
                    sp.tag_order = s.value("TagOrder", std::vector<std::vector<int>>());
                    sp.preferred_timeslots = s.value("PreferredTimeslots", std::vector<int>());
                    sp.preferred_groups = s.value("PreferredGroups", std::vector<int>());
                }
                data.students_preferences.push_back(sp);
            }
        }
        
        // teachers preferences
        if (p.contains("teachers")) {
            for (const auto& t : p.at("teachers")) {
                TeacherPreference tp;
                if (t.is_array()) {
                    // Handle array format (positional)
                    if (t.size() > 0) tp.free_days = t[0].get<int>();
                    if (t.size() > 1) tp.short_days = t[1].get<int>();
                    if (t.size() > 2) tp.uniform_days = t[2].get<int>();
                    if (t.size() > 3) tp.concentrated_days = t[3].get<int>();
                    if (t.size() > 4) tp.min_gaps_length = t[4].get<std::vector<int>>();
                    if (t.size() > 5) tp.max_gaps_length = t[5].get<std::vector<int>>();
                    if (t.size() > 6) tp.min_day_length = t[6].get<std::vector<int>>();
                    if (t.size() > 7) tp.max_day_length = t[7].get<std::vector<int>>();
                    if (t.size() > 8) tp.preferred_day_start_timeslot = t[8].get<std::vector<int>>();
                    if (t.size() > 9) tp.preferred_day_end_timeslot = t[9].get<std::vector<int>>();
                    if (t.size() > 10) tp.tag_order = t[10].get<std::vector<std::vector<int>>>();
                    if (t.size() > 11) tp.preferred_timeslots = t[11].get<std::vector<int>>();
                } else {
                    // Handle object format (named keys)
                    tp.free_days = t.value("FreeDays", 0);
                    tp.short_days = t.value("ShortDays", 0);
                    tp.uniform_days = t.value("UniformDays", 0);
                    tp.concentrated_days = t.value("ConcentratedDays", 0);
                    tp.min_gaps_length = t.value("MinGapsLength", std::vector<int>{0, 0});
                    tp.max_gaps_length = t.value("MaxGapsLength", std::vector<int>{0, 0});
                    tp.min_day_length = t.value("MinDayLength", std::vector<int>{0, 0});
                    tp.max_day_length = t.value("MaxDayLength", std::vector<int>{0, 0});
                    tp.preferred_day_start_timeslot = t.value("PreferredDayStartTimeslot", std::vector<int>{0, 0});
                    tp.preferred_day_end_timeslot = t.value("PreferredDayEndTimeslot", std::vector<int>{0, 0});
                    tp.tag_order = t.value("TagOrder", std::vector<std::vector<int>>());
                    tp.preferred_timeslots = t.value("PreferredTimeslots", std::vector<int>());
                }
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
    j["constraints"]["NumSubjects"] = data.num_subjects;
    j["constraints"]["NumGroups"] = data.num_groups;
    j["constraints"]["NumTeachers"] = data.num_teachers;
    j["constraints"]["NumStudents"] = data.num_students;
    j["constraints"]["NumRooms"] = data.num_rooms;
    j["constraints"]["NumTags"] = data.num_tags;
    j["constraints"]["StudentWeights"] = data.student_weights;
    j["constraints"]["TeacherWeights"] = data.teacher_weights;
    j["constraints"]["MinStudentsPerGroup"] = data.min_students_per_group;
    j["constraints"]["SubjectsDuration"] = data.subjects_duration;
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
            json s;
            s["FreeDays"] = sp.free_days;
            s["ShortDays"] = sp.short_days;
            s["UniformDays"] = sp.uniform_days;
            s["ConcentratedDays"] = sp.concentrated_days;
            s["MinGapsLength"] = sp.min_gaps_length;
            s["MaxGapsLength"] = sp.max_gaps_length;
            s["MinDayLength"] = sp.min_day_length;
            s["MaxDayLength"] = sp.max_day_length;
            s["PreferredDayStartTimeslot"] = sp.preferred_day_start_timeslot;
            s["PreferredDayEndTimeslot"] = sp.preferred_day_end_timeslot;
            s["TagOrder"] = sp.tag_order;
            s["PreferredTimeslots"] = sp.preferred_timeslots;
            s["PreferredGroups"] = sp.preferred_groups;
            j["preferences"]["students"].push_back(s);
        }
    }
    
    if (!data.teachers_preferences.empty()) {
        for (const auto& tp : data.teachers_preferences) {
            json t;
            t["FreeDays"] = tp.free_days;
            t["ShortDays"] = tp.short_days;
            t["UniformDays"] = tp.uniform_days;
            t["ConcentratedDays"] = tp.concentrated_days;
            t["MinGapsLength"] = tp.min_gaps_length;
            t["MaxGapsLength"] = tp.max_gaps_length;
            t["MinDayLength"] = tp.min_day_length;
            t["MaxDayLength"] = tp.max_day_length;
            t["PreferredDayStartTimeslot"] = tp.preferred_day_start_timeslot;
            t["PreferredDayEndTimeslot"] = tp.preferred_day_end_timeslot;
            t["TagOrder"] = tp.tag_order;
            t["PreferredTimeslots"] = tp.preferred_timeslots;
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
        solutionData.student_detailed_fitnesses = jsonData.at("student_detailed_fitnesses").get<std::vector<std::vector<std::pair<double, double>>>>();
        solutionData.teacher_detailed_fitnesses = jsonData.at("teacher_detailed_fitnesses").get<std::vector<std::vector<std::pair<double, double>>>>();
        if (jsonData.contains("student_weighted_fitnesses")) {
            solutionData.student_weighted_fitnesses = jsonData.at("student_weighted_fitnesses").get<std::vector<double>>();
        }
        if (jsonData.contains("teacher_weighted_fitnesses")) {
            solutionData.teacher_weighted_fitnesses = jsonData.at("teacher_weighted_fitnesses").get<std::vector<double>>();
        }
        if (jsonData.contains("total_student_weight")) {
            solutionData.total_student_weight = jsonData.at("total_student_weight").get<double>();
        }
        if (jsonData.contains("total_teacher_weight")) {
            solutionData.total_teacher_weight = jsonData.at("total_teacher_weight").get<double>();
        }
        if (jsonData.contains("days_in_cycle")) {
            solutionData.days_in_cycle = jsonData.at("days_in_cycle").get<int>();
        }
        if (jsonData.contains("timeslots_daily")) {
            solutionData.timeslots_daily = jsonData.at("timeslots_daily").get<int>();
        }
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
    j["student_detailed_fitnesses"] = data.student_detailed_fitnesses;
    j["teacher_detailed_fitnesses"] = data.teacher_detailed_fitnesses;
    j["student_weighted_fitnesses"] = data.student_weighted_fitnesses;
    j["teacher_weighted_fitnesses"] = data.teacher_weighted_fitnesses;
    j["total_student_weight"] = data.total_student_weight;
    j["total_teacher_weight"] = data.total_teacher_weight;
    j["days_in_cycle"] = data.days_in_cycle;
    j["timeslots_daily"] = data.timeslots_daily;
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
        json_str += "    \"NumSubjects\": " + std::to_string(j["constraints"]["NumSubjects"].get<int>()) + ",\n";
        json_str += "    \"NumGroups\": " + std::to_string(j["constraints"]["NumGroups"].get<int>()) + ",\n";
        json_str += "    \"NumTeachers\": " + std::to_string(j["constraints"]["NumTeachers"].get<int>()) + ",\n";
        json_str += "    \"NumStudents\": " + std::to_string(j["constraints"]["NumStudents"].get<int>()) + ",\n";
        json_str += "    \"NumRooms\": " + std::to_string(j["constraints"]["NumRooms"].get<int>()) + ",\n";
        json_str += "    \"NumTags\": " + std::to_string(j["constraints"]["NumTags"].get<int>()) + ",\n";
        json_str += "    \"StudentWeights\": " + j["constraints"]["StudentWeights"].dump() + ",\n";
        json_str += "    \"TeacherWeights\": " + j["constraints"]["TeacherWeights"].dump() + ",\n";
        json_str += "    \"MinStudentsPerGroup\": " + j["constraints"]["MinStudentsPerGroup"].dump() + ",\n";
        json_str += "    \"SubjectsDuration\": " + j["constraints"]["SubjectsDuration"].dump() + ",\n";
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
        json_str += "  \"student_weighted_fitnesses\": " + j["student_weighted_fitnesses"].dump() + ",\n";
        json_str += "  \"teacher_weighted_fitnesses\": " + j["teacher_weighted_fitnesses"].dump() + ",\n";
        json_str += "  \"total_student_weight\": " + std::to_string(j["total_student_weight"].get<double>()) + ",\n";
        json_str += "  \"total_teacher_weight\": " + std::to_string(j["total_teacher_weight"].get<double>()) + ",\n";
        json_str += "  \"days_in_cycle\": " + std::to_string(j["days_in_cycle"].get<int>()) + ",\n";
        json_str += "  \"timeslots_daily\": " + std::to_string(j["timeslots_daily"].get<int>()) + ",\n";
        json_str += "  \"student_detailed_fitnesses\": " + j["student_detailed_fitnesses"].dump() + ",\n";
        json_str += "  \"teacher_detailed_fitnesses\": " + j["teacher_detailed_fitnesses"].dump() + "\n";
        json_str += "}\n";
        out << json_str;
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("JSON write error: ") + e.what());
    }
}
