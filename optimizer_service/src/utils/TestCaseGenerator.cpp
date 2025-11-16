#include "utils/TestCaseGenerator.hpp"
#include <random>
#include <algorithm>
#include <numeric>
#include <sstream>
#include "utils/Logger.hpp"

RawProblemData TestCaseGenerator::generate(int numStudents, int numGroups, int numSubjects, int numRooms, int numTeachers, int numTimeslots, int extraCapacity) {
    const int DAYS = 7;
    try {
        Logger::info("Starting TestCaseGenerator::generate with numStudents=" + std::to_string(numStudents) +
                     ", numGroups=" + std::to_string(numGroups) + ", numSubjects=" + std::to_string(numSubjects) +
                     ", numRooms=" + std::to_string(numRooms) + ", numTeachers=" + std::to_string(numTeachers) +
                     ", numTimeslots=" + std::to_string(numTimeslots) + ", extraCapacity=" + std::to_string(extraCapacity));
        RawProblemData data;
        std::random_device rd;
        std::mt19937 gen(rd());

        int MGMT_PREFERENCE_DENSITY_FACTOR = 10; // higher means more preferences
        int MAX_WEIGHT = 100; // max weight for preferences

        // Common distributions
        std::uniform_int_distribution<> dist_bool(0, 1);
        std::uniform_int_distribution<> dist_num_ts(0, numTimeslots);
        std::uniform_int_distribution<> dist_num_mgmt(0, numRooms * numTimeslots / MGMT_PREFERENCE_DENSITY_FACTOR);

        // Weight distribution: logarithmic, P(k) proportional to 1/(k+1) for k=0 to 100
        std::vector<double> weights(MAX_WEIGHT);
        for (int i = 0; i < MAX_WEIGHT; ++i) {
            weights[i] = 1.0 / (i + 1);
        }
        std::discrete_distribution<> dist_weight(weights.begin(), weights.end());

        // timeslots_daily and days_in_cycle (simplified uniform model)
        data.timeslots_daily = numTimeslots / DAYS; // uniform timeslots per day
        data.days_in_cycle = DAYS;
        
        // min_students_per_group (optional, can be 1 or 0)
        data.min_students_per_group = 1;

        std::uniform_int_distribution<> dist_days(0, DAYS - 1);

        // groups_per_subject: distribute numGroups among numSubjects with normal distribution
        double mean = static_cast<double>(numGroups) / numSubjects;
        double stddev = 1.0; // adjust as needed
        std::normal_distribution<> dist_normal(mean, stddev);
        data.groups_per_subject.resize(numSubjects);
        Logger::info("groups_per_subject resized to " + std::to_string(data.groups_per_subject.size()));
        int total_assigned = 0;
        for (int i = 0; i < numSubjects - 1; ++i) {
            int g = std::max(1, static_cast<int>(std::round(dist_normal(gen))));
            data.groups_per_subject[i] = g;
            total_assigned += g;
        }
        data.groups_per_subject.back() = std::max(1, numGroups - total_assigned);

        // students_subjects: for each student, random subset of subjects
        std::uniform_int_distribution<> dist_num_subj(1, numSubjects);
        data.students_subjects.resize(numStudents);
        for (auto& subs : data.students_subjects) {
            int num = dist_num_subj(gen);
            std::vector<int> all_subj(numSubjects);
            std::iota(all_subj.begin(), all_subj.end(), 0);
            std::shuffle(all_subj.begin(), all_subj.end(), gen);
            subs.assign(all_subj.begin(), all_subj.begin() + num);
        }

        // Calculate student demand per subject
        std::vector<int> students_per_subject(numSubjects, 0);
        for (const auto& subs : data.students_subjects) {
            for (int subj : subs) {
                students_per_subject[subj]++;
            }
        }

        // groups_capacity: allocate capacity based on actual student demand per subject
        data.groups_capacity.resize(numGroups);
        int group_idx = 0;
        for (int subj = 0; subj < numSubjects; ++subj) {
            int num_groups_for_subj = data.groups_per_subject[subj];
            int students_for_subj = students_per_subject[subj];
            
            // Calculate base capacity per group for this subject (ensures solvability)
            std::vector<int> capacities(num_groups_for_subj);
            int base_capacity = students_for_subj / num_groups_for_subj;
            int remainder = students_for_subj % num_groups_for_subj;
            
            // Distribute base capacity
            for (int i = 0; i < num_groups_for_subj; ++i) {
                capacities[i] = base_capacity + (i < remainder ? 1 : 0);
            }
            
            // Distribute extra capacity among groups for this subject
            if (extraCapacity > 0 && num_groups_for_subj > 0) {
                int extra_for_subject = extraCapacity / numSubjects;
                int extra_remainder = extraCapacity % numSubjects;
                if (subj < extra_remainder) extra_for_subject++;
                
                // Randomly distribute extra capacity
                std::uniform_int_distribution<> dist_extra(0, num_groups_for_subj - 1);
                for (int i = 0; i < extra_for_subject; ++i) {
                    int random_group = dist_extra(gen);
                    capacities[random_group]++;
                }
            }
            
            // Assign capacities to global group indices
            for (int i = 0; i < num_groups_for_subj; ++i) {
                data.groups_capacity[group_idx++] = capacities[i];
            }
        }

        // teachers_groups: assign each group to exactly one teacher, with normal distribution of groups per teacher
        double mean_groups = static_cast<double>(numGroups) / numTeachers;
        double stddev_groups = 1.0;
        std::normal_distribution<> dist_groups_per_teacher(mean_groups, stddev_groups);
        data.teachers_groups.resize(numTeachers);
        std::vector<int> group_assignments(numGroups, -1); // -1 means unassigned
        int teacher_idx = 0;
        for (int t = 0; t < numTeachers; ++t) {
            int num_groups_for_teacher = std::max(1, static_cast<int>(std::round(dist_groups_per_teacher(gen))));
            if (t == numTeachers - 1) {
                // Last teacher gets remaining groups
                num_groups_for_teacher = numGroups - teacher_idx;
            }
            for (int i = 0; i < num_groups_for_teacher && teacher_idx < numGroups; ++i) {
                data.teachers_groups[t].push_back(teacher_idx);
                group_assignments[teacher_idx] = t;
                teacher_idx++;
            }
        }
        // Ensure all groups are assigned
        for (int g = 0; g < numGroups; ++g) {
            if (group_assignments[g] == -1) {
                // Assign to last teacher
                data.teachers_groups.back().push_back(g);
            }
        }

        // rooms_unavailability_timeslots: for each room, random unavailable timeslots
        std::uniform_int_distribution<> dist_num_unav(0, numTimeslots / 4);
        data.rooms_unavailability_timeslots.resize(numRooms);
        for (auto& unav : data.rooms_unavailability_timeslots) {
            int num = dist_num_unav(gen);
            std::vector<int> all_ts(numTimeslots);
            std::iota(all_ts.begin(), all_ts.end(), 0);
            std::shuffle(all_ts.begin(), all_ts.end(), gen);
            unav.assign(all_ts.begin(), all_ts.begin() + num);
            std::sort(unav.begin(), unav.end());
        }

        // Preferences

        // Students preferences (new format)
        data.students_preferences.resize(numStudents);
        std::uniform_int_distribution<> dist_width_height(-50, 50);
        std::uniform_int_distribution<> dist_gaps(0, 5);
        for (int s = 0; s < numStudents; ++s) {
            auto& sp = data.students_preferences[s];
            
            // width_height_info: random value between -50 and 50
            sp.width_height_info = dist_width_height(gen);
            
            // gaps_info: [minGaps, maxGaps, weight]
            int min_gaps = dist_gaps(gen);
            int max_gaps = min_gaps + dist_gaps(gen);
            int gaps_weight = dist_weight(gen);
            sp.gaps_info = {min_gaps, max_gaps, gaps_weight};
            
            // preferred_timeslots: array of signed weights (negative = avoid, positive = prefer)
            sp.preferred_timeslots.resize(numTimeslots, 0);
            int num_timeslot_prefs = std::uniform_int_distribution<>(0, numTimeslots / 3)(gen);
            for (int i = 0; i < num_timeslot_prefs; ++i) {
                int ts = std::uniform_int_distribution<>(0, numTimeslots - 1)(gen);
                int weight = dist_weight(gen);
                if (weight > 0) {
                    // 50% chance positive or negative
                    sp.preferred_timeslots[ts] = dist_bool(gen) ? weight : -weight;
                }
            }
            
            // preferred_groups: array of signed weights for groups this student has
            int num_student_groups = static_cast<int>(data.students_subjects[s].size());
            sp.preferred_groups.resize(num_student_groups, 0);
            int num_group_prefs = std::uniform_int_distribution<>(0, num_student_groups)(gen);
            for (int i = 0; i < num_group_prefs; ++i) {
                int g = std::uniform_int_distribution<>(0, num_student_groups - 1)(gen);
                int weight = dist_weight(gen);
                if (weight > 0) {
                    sp.preferred_groups[g] = dist_bool(gen) ? weight : -weight;
                }
            }
        }

        // Teachers preferences (new format)
        data.teachers_preferences.resize(numTeachers);
        for (int t = 0; t < numTeachers; ++t) {
            auto& tp = data.teachers_preferences[t];
            
            // width_height_info: random value between -50 and 50
            tp.width_height_info = dist_width_height(gen);
            
            // gaps_info: [minGaps, maxGaps, weight]
            int min_gaps = dist_gaps(gen);
            int max_gaps = min_gaps + dist_gaps(gen);
            int gaps_weight = dist_weight(gen);
            tp.gaps_info = {min_gaps, max_gaps, gaps_weight};
            
            // preferred_timeslots: array of signed weights (negative = avoid, positive = prefer)
            tp.preferred_timeslots.resize(numTimeslots, 0);
            int num_timeslot_prefs = std::uniform_int_distribution<>(0, numTimeslots / 3)(gen);
            for (int i = 0; i < num_timeslot_prefs; ++i) {
                int ts = std::uniform_int_distribution<>(0, numTimeslots - 1)(gen);
                int weight = dist_weight(gen);
                if (weight > 0) {
                    // 50% chance positive or negative
                    tp.preferred_timeslots[ts] = dist_bool(gen) ? weight : -weight;
                }
            }
        }

        // New constraint fields (initialize as empty for now)
        data.rooms_capacity.resize(numRooms, 100); // default capacity
        data.groups_tags.clear(); // empty tags
        data.rooms_tags.clear(); // empty tags
        data.students_unavailability_timeslots.resize(numStudents); // empty unavailability
        data.teachers_unavailability_timeslots.resize(numTeachers); // empty unavailability

        Logger::info("Finished TestCaseGenerator::generate successfully");
        return data;
    } 
    catch (const std::exception& e) {
        Logger::error("Error in TestCaseGenerator::generate: " + std::string(e.what()));
        return RawProblemData{};
    }
}

RawJobData TestCaseGenerator::generateJob(int numStudents, int numGroups, int numSubjects, int numRooms, int numTeachers, int numTimeslots, int extraCapacity, int maxExecutionTime) {
    try {
        // generate problem data
        RawProblemData problemData = generate(numStudents, numGroups, numSubjects, numRooms, numTeachers, numTimeslots, extraCapacity);
        
        // generate random job id
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dist_id(1000, 9999);
        
        std::stringstream ss;
        ss << "test_job_" << std::time(nullptr) << "_" << dist_id(gen);
        std::string jobId = ss.str();
        
        Logger::info("Generated job with ID: " + jobId + " and max execution time: " + std::to_string(maxExecutionTime) + " seconds");
        
        return RawJobData(jobId, problemData, maxExecutionTime);
    }
    catch (const std::exception& e) {
        Logger::error("Error in TestCaseGenerator::generateJob: " + std::string(e.what()));
        return RawJobData{};
    }
}
