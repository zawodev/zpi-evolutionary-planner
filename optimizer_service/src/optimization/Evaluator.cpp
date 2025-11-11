#include "optimization/Evaluator.hpp"
#include "utils/Logger.hpp"
#include <random>
#include <set>
#include <map>
#include <algorithm>

Evaluator::Evaluator(const ProblemData& data) : problemData(data) {
    buildMaxValues();
}

void Evaluator::buildMaxValues() {
    maxValues.clear();
    int studentsNum = problemData.getStudentsNum();
    int groupsNum = problemData.getGroupsNum();
    int roomsNum = problemData.getRoomsNum();
    int timeslotsNum = problemData.totalTimeslots();

    // student part: for each subject of each student, max = groups_per_subject[p] - 1
    for (int s = 0; s < studentsNum; ++s) {
        for (int p : problemData.getStudentsSubjects()[s]) {
            int max_val = problemData.getGroupsPerSubject()[p] - 1;
            maxValues.push_back(max_val);
        }
    }

    // group part
    for (int g = 0; g < groupsNum; ++g) {
        maxValues.push_back(timeslotsNum - 1); // timeslot
        maxValues.push_back(roomsNum - 1); // room
    }

    //print maxValues for debugging (with logger info)
    Logger::info("Evaluator initialized. Max gene values:");
    std::string str = "[";
    for (size_t i = 0; i < maxValues.size(); ++i) {
        str += std::to_string(maxValues[i]) + (i < maxValues.size() - 1 ? ", " : "");
    }
    str += "]";
    Logger::info(str);
    Logger::info("Total genes: " + std::to_string(maxValues.size()));
}

double Evaluator::evaluate(const Individual& individual) const {
    int expected_size = getTotalGenes();
    if (individual.genotype.size() != expected_size) {
        Logger::error("Invalid genotype size: " + std::to_string(individual.genotype.size()) + ", expected: " + std::to_string(expected_size));
        return 0.0;
    }

    // decode genotype (student -> groups)
    std::vector<std::vector<int>> student_groups(problemData.getStudentsNum());
    int idx = 0;
    for (int s = 0; s < problemData.getStudentsNum(); ++s) {
        for (size_t i = 0; i < problemData.getStudentsSubjects()[s].size(); ++i) {
            int rel_group = individual.genotype[idx];
            int abs_group = problemData.getAbsoluteGroupIndex(idx, rel_group);
            student_groups[s].push_back(abs_group);
            idx++;
        }
    }
    
    // decode genotype (group -> timeslot and room)
    std::vector<std::pair<int, int>> group_assignments(problemData.getGroupsNum());
    for (int g = 0; g < problemData.getGroupsNum(); ++g) {
        int timeslot = individual.genotype[idx++];
        int room = individual.genotype[idx++];
        group_assignments[g] = {timeslot, room};
    }

    // calculate cumulative timeslots for days (simplified with uniform timeslots_daily)
    int timeslots_daily = problemData.getTimeslotsDaily();
    std::vector<int> cum_timeslots(problemData.getDaysNum() + 1, 0);
    for (int d = 1; d <= problemData.getDaysNum(); ++d) {
        cum_timeslots[d] = cum_timeslots[d - 1] + timeslots_daily;
    }

    // evaluate students
    double total_student_fitness = 0.0;
    lastStudentFitnesses.clear();
    
    int students_count = problemData.getStudentsNum();
    if (students_count == 0) {
        Logger::warn("Evaluator::evaluate - No students in problem data");
    }
    
    for (int s = 0; s < students_count; ++s) {
        double student_fitness = 0.0;
        double student_total_weight = 0.0;
        
        const auto& pref = problemData.getStudentsPreferences()[s];

        // get student timeslots
        std::set<int> student_timeslots;
        for (int g : student_groups[s]) {
            int timeslot = group_assignments[g].first;
            student_timeslots.insert(timeslot);
        }

        // width_height_info: positive = prefer wider (more days), negative = prefer taller (longer days)
        if (pref.width_height_info != 0) {
            int weight = std::abs(pref.width_height_info);
            // count days with classes
            int days_with_classes = 0;
            for (int d = 0; d < problemData.getDaysNum(); ++d) {
                bool has_class = false;
                for (int t = cum_timeslots[d]; t < cum_timeslots[d + 1]; ++t) {
                    if (student_timeslots.count(t)) {
                        has_class = true;
                        break;
                    }
                }
                if (has_class) days_with_classes++;
            }
            
            // if positive weight, reward more days; if negative, reward fewer days
            if (pref.width_height_info > 0) {
                // wider is better - normalize days_with_classes
                double normalized = (double)days_with_classes / problemData.getDaysNum();
                student_fitness += weight * normalized;
            } else {
                // taller is better - inverse of days
                double normalized = 1.0 - ((double)days_with_classes / problemData.getDaysNum());
                student_fitness += weight * normalized;
            }
            student_total_weight += weight;
        }

        // gaps_info: [minGaps, maxGaps, weight]
        if (pref.gaps_info.size() >= 3 && pref.gaps_info[2] > 0) {
            int min_gaps = pref.gaps_info[0];
            int max_gaps = pref.gaps_info[1];
            int weight = pref.gaps_info[2];
            
            // calculate actual gaps
            int total_gaps = 0;
            for (int d = 0; d < problemData.getDaysNum(); ++d) {
                std::vector<int> day_timeslots;
                for (int t = cum_timeslots[d]; t < cum_timeslots[d + 1]; ++t) {
                    if (student_timeslots.count(t)) {
                        day_timeslots.push_back(t);
                    }
                }
                if (day_timeslots.size() > 1) {
                    std::sort(day_timeslots.begin(), day_timeslots.end());
                    for (size_t i = 1; i < day_timeslots.size(); ++i) {
                        int gap_size = day_timeslots[i] - day_timeslots[i-1] - 1;
                        if (gap_size > 0) total_gaps += gap_size;
                    }
                }
            }
            
            // reward if gaps are within [min_gaps, max_gaps]
            if (total_gaps >= min_gaps && total_gaps <= max_gaps) {
                student_fitness += weight;
            }
            student_total_weight += weight;
        }

        // preferred_timeslots: array of weights (negative = avoid, positive = prefer)
        for (size_t t = 0; t < pref.preferred_timeslots.size() && t < (size_t)problemData.totalTimeslots(); ++t) {
            int weight = pref.preferred_timeslots[t];
            if (weight != 0) {
                if (weight > 0 && student_timeslots.count(t)) {
                    // prefer this timeslot and student has it
                    student_fitness += weight;
                } else if (weight < 0 && !student_timeslots.count(t)) {
                    // avoid this timeslot and student doesn't have it
                    student_fitness += std::abs(weight);
                }
                student_total_weight += std::abs(weight);
            }
        }

        // preferred_groups: array of weights (negative = avoid, positive = prefer)
        for (size_t g = 0; g < pref.preferred_groups.size() && g < student_groups[s].size(); ++g) {
            int weight = pref.preferred_groups[g];
            if (weight != 0) {
                int assigned_group = student_groups[s][g];
                // check if this group index matches (simplified: use absolute group index)
                if (weight > 0) {
                    // prefer - just add weight (simplified scoring)
                    student_fitness += weight;
                } else if (weight < 0) {
                    // avoid - add if not assigned (simplified)
                    student_fitness += std::abs(weight) * 0.5; // partial credit
                }
                student_total_weight += std::abs(weight);
            }
        }

        if (student_total_weight > 0) {
            total_student_fitness += student_fitness / student_total_weight;
        }
        lastStudentFitnesses.push_back((student_total_weight > 0) ? (student_fitness / student_total_weight) : 0.0);
    }
    
    double avg_student_fitness = (students_count > 0) ? (total_student_fitness / students_count) : 0.0;

    // evaluate teachers
    double total_teacher_fitness = 0.0;
    lastTeacherFitnesses.clear();
    
    int teachers_count = problemData.getTeachersNum();
    int teachers_prefs_count = problemData.getTeachersPreferences().size();
    
    // Check for data inconsistency
    if (teachers_count != teachers_prefs_count) {
        Logger::warn("Evaluator::evaluate - Data inconsistency: teachers_groups count=" + 
                    std::to_string(teachers_count) + " but teachers_preferences count=" + 
                    std::to_string(teachers_prefs_count));
    }
    
    if (teachers_count == 0) {
        Logger::warn("Evaluator::evaluate - No teachers in problem data (teachers_groups is empty)");
    }

    // Hard constraints check: room conflicts and duration overflow
    double hard_constraint_penalty = 0.0;
    const auto& subjects_duration = problemData.getSubjectsDuration();
    bool has_duration_data = !subjects_duration.empty();
    
    if (has_duration_data) {
        // Check 1: Room conflicts - same room, overlapping timeslots
        std::map<std::pair<int, int>, int> room_timeslot_usage; // key: (room, timeslot), value: group_id
        
        for (int g = 0; g < problemData.getGroupsNum(); ++g) {
            int start_timeslot = group_assignments[g].first;
            int room = group_assignments[g].second;
            int subject = problemData.getSubjectFromGroup(g);
            int duration = subjects_duration[subject];
            
            // Check each timeslot this group occupies
            for (int t = start_timeslot; t < start_timeslot + duration; ++t) {
                auto key = std::make_pair(room, t);
                if (room_timeslot_usage.count(key)) {
                    // Conflict! Two groups in same room at same time
                    hard_constraint_penalty += 1.0;
                } else {
                    room_timeslot_usage[key] = g;
                }
            }
        }
        
        // Check 2: Duration overflow - classes extending beyond daily limit
        for (int g = 0; g < problemData.getGroupsNum(); ++g) {
            int start_timeslot = group_assignments[g].first;
            int subject = problemData.getSubjectFromGroup(g);
            int duration = subjects_duration[subject];
            int end_timeslot = start_timeslot + duration - 1;
            
            int start_day = start_timeslot / timeslots_daily;
            int end_day = end_timeslot / timeslots_daily;
            
            // Check if class extends to next day
            if (start_day != end_day) {
                hard_constraint_penalty += 1.0;
            }
            
            // Check if end timeslot exceeds day limit
            int day_end = cum_timeslots[start_day + 1] - 1;
            if (end_timeslot > day_end) {
                hard_constraint_penalty += 1.0;
            }
        }
    }
    
    for (int t = 0; t < teachers_count; ++t) {
        double teacher_fitness = 0.0;
        double teacher_total_weight = 0.0;
        const auto& pref = problemData.getTeachersPreferences()[t];

        // get teacher timeslots
        std::set<int> teacher_timeslots;
        for (int g : problemData.getTeachersGroups()[t]) {
            int timeslot = group_assignments[g].first;
            teacher_timeslots.insert(timeslot);
        }

        // width_height_info: positive = prefer wider (more days), negative = prefer taller (longer days)
        if (pref.width_height_info != 0) {
            int weight = std::abs(pref.width_height_info);
            // count days with classes
            int days_with_classes = 0;
            for (int d = 0; d < problemData.getDaysNum(); ++d) {
                bool has_class = false;
                for (int ts = cum_timeslots[d]; ts < cum_timeslots[d + 1]; ++ts) {
                    if (teacher_timeslots.count(ts)) {
                        has_class = true;
                        break;
                    }
                }
                if (has_class) days_with_classes++;
            }
            
            // if positive weight, reward more days; if negative, reward fewer days
            if (pref.width_height_info > 0) {
                // wider is better
                double normalized = (double)days_with_classes / problemData.getDaysNum();
                teacher_fitness += weight * normalized;
            } else {
                // taller is better
                double normalized = 1.0 - ((double)days_with_classes / problemData.getDaysNum());
                teacher_fitness += weight * normalized;
            }
            teacher_total_weight += weight;
        }

        // gaps_info: [minGaps, maxGaps, weight]
        if (pref.gaps_info.size() >= 3 && pref.gaps_info[2] > 0) {
            int min_gaps = pref.gaps_info[0];
            int max_gaps = pref.gaps_info[1];
            int weight = pref.gaps_info[2];
            
            // calculate actual gaps
            int total_gaps = 0;
            for (int d = 0; d < problemData.getDaysNum(); ++d) {
                std::vector<int> day_timeslots;
                for (int ts = cum_timeslots[d]; ts < cum_timeslots[d + 1]; ++ts) {
                    if (teacher_timeslots.count(ts)) {
                        day_timeslots.push_back(ts);
                    }
                }
                if (day_timeslots.size() > 1) {
                    std::sort(day_timeslots.begin(), day_timeslots.end());
                    for (size_t i = 1; i < day_timeslots.size(); ++i) {
                        int gap_size = day_timeslots[i] - day_timeslots[i-1] - 1;
                        if (gap_size > 0) total_gaps += gap_size;
                    }
                }
            }
            
            // reward if gaps are within [min_gaps, max_gaps]
            if (total_gaps >= min_gaps && total_gaps <= max_gaps) {
                teacher_fitness += weight;
            }
            teacher_total_weight += weight;
        }

        // preferred_timeslots: array of weights (negative = avoid, positive = prefer)
        for (size_t ts = 0; ts < pref.preferred_timeslots.size() && ts < (size_t)problemData.totalTimeslots(); ++ts) {
            int weight = pref.preferred_timeslots[ts];
            if (weight != 0) {
                if (weight > 0 && teacher_timeslots.count(ts)) {
                    // prefer this timeslot and teacher has it
                    teacher_fitness += weight;
                } else if (weight < 0 && !teacher_timeslots.count(ts)) {
                    // avoid this timeslot and teacher doesn't have it
                    teacher_fitness += std::abs(weight);
                }
                teacher_total_weight += std::abs(weight);
            }
        }

        if (teacher_total_weight > 0) {
            total_teacher_fitness += teacher_fitness / teacher_total_weight;
        }
        lastTeacherFitnesses.push_back((teacher_total_weight > 0) ? (teacher_fitness / teacher_total_weight) : 0.0);
    }
    
    double avg_teacher_fitness = (teachers_count > 0) ? (total_teacher_fitness / teachers_count) : 0.0;

    // average students and teachers (no management fitness anymore)
    double total_fitness = (avg_student_fitness + avg_teacher_fitness) / 2.0;
    
    if (hard_constraint_penalty > 0) {
        total_fitness = -1.0;
    }
    
    return total_fitness;
}

bool Evaluator::repair(Individual& individual) const {

    // TODO: probably should make it a void, which works on original individual by reference
    // UPDATE: returns true if any repairs were made (works on original individual now)

    if (!problemData.isFeasible()) {
        Logger::warn("ProblemData is not feasible. Repair is not possible.");
        return false;
    }

    bool wasRepaired = false;

    // deterministic repair for genotypes breaking constraints

    // check and repair capacity violations per group
    // calculate group counts and student indices per group
    std::vector<int> group_counts(problemData.getGroupsNum(), 0);
    std::vector<std::vector<int>> group_to_student_indices(problemData.getGroupsNum());
    int idx = 0;
    for (int s = 0; s < problemData.getStudentsNum(); ++s) {
        for (size_t i = 0; i < problemData.getStudentsSubjects()[s].size(); ++i) {
            int rel_group = individual.genotype[idx];
            int abs_group = problemData.getAbsoluteGroupIndex(idx, rel_group);
            group_counts[abs_group]++;
            group_to_student_indices[abs_group].push_back(idx);
            idx++;
        }
    }

    // skip group assignments part
    idx += problemData.getGroupsNum() * 2;

    // repair capacity violations per group
    const auto& groups_capacity = problemData.getGroupsCapacity();
    const auto& cumulative_groups = problemData.getCumulativeGroups();
    for (int g = 0; g < problemData.getGroupsNum(); ++g) {
        if (group_counts[g] > groups_capacity[g]) {
            int excess = group_counts[g] - groups_capacity[g];
            wasRepaired = true;  // wykryto błąd, będziemy naprawiać
            // find subject for this group
            int p = problemData.getSubjectFromGroup(g);
            // find underfilled groups for this subject
            std::vector<int> available_groups;
            for (int gg = cumulative_groups[p]; gg < cumulative_groups[p + 1]; ++gg) {
                if (group_counts[gg] < groups_capacity[gg]) {
                    available_groups.push_back(gg);
                }
            }
            // move excess students to available groups
            for (int i = 0; i < excess && !available_groups.empty(); ++i) {
                int student_idx = group_to_student_indices[g].back();
                group_to_student_indices[g].pop_back();
                // choose a random available group (for simplicity, first one)
                int new_abs_group = available_groups[0];
                // calculate new rel_group
                int new_rel_group = new_abs_group - cumulative_groups[p];
                individual.genotype[student_idx] = new_rel_group;
                // update counts
                group_counts[g]--;
                group_counts[new_abs_group]++;
                group_to_student_indices[new_abs_group].push_back(student_idx);
                // if new group is now full, remove from available
                if (group_counts[new_abs_group] >= groups_capacity[new_abs_group]) {
                    available_groups.erase(available_groups.begin());
                }
            }
            if (group_counts[g] > groups_capacity[g]) {
                //should not happen if feasibility check worked
                Logger::warn("Weird? Could not fully repair group " + std::to_string(g) + " capacity violation.");
            }
        }
    }

    // Repair hard constraints: room conflicts and duration overflow
    const auto& subjects_duration = problemData.getSubjectsDuration();
    if (!subjects_duration.empty()) {
        idx = problemData.getTotalStudentSubjects();
        int timeslots_daily = problemData.getTimeslotsDaily();
        int total_timeslots = problemData.totalTimeslots();
        int num_rooms = problemData.getRoomsNum();
        
        // Repair duration overflow first
        for (int g = 0; g < problemData.getGroupsNum(); ++g) {
            int timeslot_idx = idx + g * 2;
            int start_timeslot = individual.genotype[timeslot_idx];
            int subject = problemData.getSubjectFromGroup(g);
            int duration = subjects_duration[subject];
            
            int start_day = start_timeslot / timeslots_daily;
            int day_start = start_day * timeslots_daily;
            int day_end = day_start + timeslots_daily - 1;
            
            // Check if class would overflow the day
            if (start_timeslot + duration - 1 > day_end) {
                // Move to earlier timeslot in same day
                int new_start = day_end - duration + 1;
                if (new_start >= day_start && new_start >= 0) {
                    individual.genotype[timeslot_idx] = new_start;
                    wasRepaired = true;
                } else {
                    // Can't fit in this day, move to next day
                    if (start_day + 1 < problemData.getDaysNum()) {
                        individual.genotype[timeslot_idx] = (start_day + 1) * timeslots_daily;
                        wasRepaired = true;
                    } else {
                        // Move to first day
                        individual.genotype[timeslot_idx] = 0;
                        wasRepaired = true;
                    }
                }
            }
        }
        
        // Repair room conflicts
        std::map<std::pair<int, int>, int> room_timeslot_usage;
        for (int g = 0; g < problemData.getGroupsNum(); ++g) {
            int timeslot_idx = idx + g * 2;
            int room_idx = idx + g * 2 + 1;
            int start_timeslot = individual.genotype[timeslot_idx];
            int room = individual.genotype[room_idx];
            int subject = problemData.getSubjectFromGroup(g);
            int duration = subjects_duration[subject];
            
            bool has_conflict = false;
            for (int t = start_timeslot; t < start_timeslot + duration && t < total_timeslots; ++t) {
                auto key = std::make_pair(room, t);
                if (room_timeslot_usage.count(key)) {
                    has_conflict = true;
                    break;
                }
            }
            
            if (has_conflict) {
                // Try to find alternative room
                bool found_room = false;
                for (int r = 0; r < num_rooms; ++r) {
                    bool room_ok = true;
                    for (int t = start_timeslot; t < start_timeslot + duration && t < total_timeslots; ++t) {
                        auto key = std::make_pair(r, t);
                        if (room_timeslot_usage.count(key)) {
                            room_ok = false;
                            break;
                        }
                    }
                    if (room_ok) {
                        individual.genotype[room_idx] = r;
                        room = r;
                        found_room = true;
                        wasRepaired = true;
                        break;
                    }
                }
                
                // If no room found, try alternative timeslot
                if (!found_room) {
                    int start_day = start_timeslot / timeslots_daily;
                    int day_start = start_day * timeslots_daily;
                    int day_end = day_start + timeslots_daily - 1;
                    
                    for (int new_ts = day_start; new_ts <= day_end - duration + 1; ++new_ts) {
                        bool slot_ok = true;
                        for (int t = new_ts; t < new_ts + duration; ++t) {
                            auto key = std::make_pair(room, t);
                            if (room_timeslot_usage.count(key)) {
                                slot_ok = false;
                                break;
                            }
                        }
                        if (slot_ok) {
                            individual.genotype[timeslot_idx] = new_ts;
                            start_timeslot = new_ts;
                            wasRepaired = true;
                            break;
                        }
                    }
                }
            }
            
            // Mark this room-timeslot range as used
            for (int t = start_timeslot; t < start_timeslot + duration && t < total_timeslots; ++t) {
                auto key = std::make_pair(room, t);
                room_timeslot_usage[key] = g;
            }
        }
    }

    return wasRepaired;
}
