#include "optimization/Evaluator.hpp"
#include "utils/Logger.hpp"
#include <random>
#include <set>
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

    // calculate cumulative timeslots for days
    std::vector<int> cum_timeslots(problemData.getDaysNum() + 1, 0);
    for (int d = 1; d <= problemData.getDaysNum(); ++d) {
        cum_timeslots[d] = cum_timeslots[d - 1] + problemData.getTimeslotsPerDay()[d - 1];
    }

    // evaluate students
    double total_student_fitness = 0.0;
    lastStudentFitnesses.clear();
    for (int s = 0; s < problemData.getStudentsNum(); ++s) {
        double student_fitness = 0.0;
        double student_total_weight = 0.0;
        const auto& pref = problemData.getStudentsPreferences()[s];

        // get student timeslots
        std::set<int> student_timeslots;
        for (int g : student_groups[s]) {
            int timeslot = group_assignments[g].first;
            student_timeslots.insert(timeslot);
        }

        // free_days
        for (int d = 0; d < (int)pref.free_days.size(); ++d) {
            int weight = pref.free_days[d];
            if (weight > 0) {
                bool has_class = false;
                for (int t = cum_timeslots[d]; t < cum_timeslots[d + 1]; ++t) {
                    if (student_timeslots.count(t)) has_class = true;
                }
                if (!has_class) student_fitness += weight;
                student_total_weight += weight;
            }
        }

        // busy_days
        for (int d = 0; d < (int)pref.busy_days.size(); ++d) {
            int weight = pref.busy_days[d];
            if (weight > 0) {
                bool has_class = false;
                for (int t = cum_timeslots[d]; t < cum_timeslots[d + 1]; ++t) {
                    if (student_timeslots.count(t)) has_class = true;
                }
                if (has_class) student_fitness += weight;
                student_total_weight += weight;
            }
        }

        // no_gaps (simplified: award points if student has no gaps in their schedule)
        if (pref.no_gaps > 0) {
            bool has_gaps = false;
            // check each day for gaps
            for (int d = 0; d < problemData.getDaysNum(); ++d) {
                std::vector<int> day_timeslots;
                for (int t = cum_timeslots[d]; t < cum_timeslots[d + 1]; ++t) {
                    if (student_timeslots.count(t)) {
                        day_timeslots.push_back(t);
                    }
                }
                // if student has classes on this day, check for gaps
                if (day_timeslots.size() > 1) {
                    std::sort(day_timeslots.begin(), day_timeslots.end());
                    for (size_t i = 1; i < day_timeslots.size(); ++i) {
                        if (day_timeslots[i] - day_timeslots[i-1] > 1) {
                            has_gaps = true;
                            break;
                        }
                    }
                }
                if (has_gaps) break;
            }
            if (!has_gaps) student_fitness += pref.no_gaps;
            student_total_weight += pref.no_gaps;
        }

        if (student_total_weight > 0) {
            total_student_fitness += student_fitness / student_total_weight;
        }
        lastStudentFitnesses.push_back((student_total_weight > 0) ? (student_fitness / student_total_weight) : 0.0);
    }
    double avg_student_fitness = total_student_fitness / problemData.getStudentsNum();

    // evaluate teachers
    double total_teacher_fitness = 0.0;
    lastTeacherFitnesses.clear();
    for (int t = 0; t < problemData.getTeachersNum(); ++t) {
        double teacher_fitness = 0.0;
        double teacher_total_weight = 0.0;
        const auto& pref = problemData.getTeachersPreferences()[t];

        // get teacher timeslots
        std::set<int> teacher_timeslots;
        for (int g : problemData.getTeachersGroups()[t]) {
            int timeslot = group_assignments[g].first;
            teacher_timeslots.insert(timeslot);
        }

        // free_days
        for (int d = 0; d < (int)pref.free_days.size(); ++d) {
            int weight = pref.free_days[d];
            if (weight > 0) {
                bool has_class = false;
                for (int ts = cum_timeslots[d]; ts < cum_timeslots[d + 1]; ++ts) {
                    if (teacher_timeslots.count(ts)) has_class = true;
                }
                if (!has_class) teacher_fitness += weight;
                teacher_total_weight += weight;
            }
        }

        // busy_days
        for (int d = 0; d < (int)pref.busy_days.size(); ++d) {
            int weight = pref.busy_days[d];
            if (weight > 0) {
                bool has_class = false;
                for (int ts = cum_timeslots[d]; ts < cum_timeslots[d + 1]; ++ts) {
                    if (teacher_timeslots.count(ts)) has_class = true;
                }
                if (has_class) teacher_fitness += weight;
                teacher_total_weight += weight;
            }
        }

        // no_gaps (simplified: award points if teacher has no gaps in their schedule)
        if (pref.no_gaps > 0) {
            bool has_gaps = false;
            // check each day for gaps
            for (int d = 0; d < problemData.getDaysNum(); ++d) {
                std::vector<int> day_timeslots;
                for (int ts = cum_timeslots[d]; ts < cum_timeslots[d + 1]; ++ts) {
                    if (teacher_timeslots.count(ts)) {
                        day_timeslots.push_back(ts);
                    }
                }
                // if teacher has classes on this day, check for gaps
                if (day_timeslots.size() > 1) {
                    std::sort(day_timeslots.begin(), day_timeslots.end());
                    for (size_t i = 1; i < day_timeslots.size(); ++i) {
                        if (day_timeslots[i] - day_timeslots[i-1] > 1) {
                            has_gaps = true;
                            break;
                        }
                    }
                }
                if (has_gaps) break;
            }
            if (!has_gaps) teacher_fitness += pref.no_gaps;
            teacher_total_weight += pref.no_gaps;
        }

        // preferred_timeslots
        for (const auto& pair : pref.preferred_timeslots) {
            int timeslot = pair.first;
            int weight = pair.second;
            if (teacher_timeslots.count(timeslot)) teacher_fitness += weight;
            teacher_total_weight += weight;
        }

        // avoid_timeslots
        for (const auto& pair : pref.avoid_timeslots) {
            int timeslot = pair.first;
            int weight = pair.second;
            if (!teacher_timeslots.count(timeslot)) teacher_fitness += weight;
            teacher_total_weight += weight;
        }

        if (teacher_total_weight > 0) {
            total_teacher_fitness += teacher_fitness / teacher_total_weight;
        }
        lastTeacherFitnesses.push_back((teacher_total_weight > 0) ? (teacher_fitness / teacher_total_weight) : 0.0);
    }
    double avg_teacher_fitness = total_teacher_fitness / problemData.getTeachersNum();

    // evaluate management
    double management_fitness = 0.0;
    double management_total_weight = 0.0;
    const auto& pref = problemData.getManagementPreferences();

    // preferred_room_timeslots
    for (const auto& prt : pref.preferred_room_timeslots) {
        bool satisfied = false;
        for (int g = 0; g < problemData.getGroupsNum(); ++g) {
            if (group_assignments[g].first == prt.timeslot && group_assignments[g].second == prt.room) {
                satisfied = true;
                break;
            }
        }
        if (satisfied) management_fitness += prt.weight;
        management_total_weight += prt.weight;
    }

    // avoid_room_timeslots
    for (const auto& art : pref.avoid_room_timeslots) {
        bool violated = false;
        for (int g = 0; g < problemData.getGroupsNum(); ++g) {
            if (group_assignments[g].first == art.timeslot && group_assignments[g].second == art.room) {
                violated = true;
                break;
            }
        }
        if (!violated) management_fitness += art.weight;
        management_total_weight += art.weight;
    }

    // group_max_overflow (simplified: assume no overflow for now)
    if (pref.group_max_overflow.weight > 0) {
        // for simplicity, always add if value == 0 (no overflow preferred)
        if (pref.group_max_overflow.value == 0) management_fitness += pref.group_max_overflow.weight;
        management_total_weight += pref.group_max_overflow.weight;
    }

    double avg_management_fitness = (management_total_weight > 0) ? (management_fitness / management_total_weight) : 1.0;
    lastManagementFitness = avg_management_fitness;

    // average all
    double total_fitness = (avg_student_fitness + avg_teacher_fitness + avg_management_fitness) / 3.0;
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
    const auto& groups_soft_capacity = problemData.getGroupsSoftCapacity();
    const auto& cumulative_groups = problemData.getCumulativeGroups();
    for (int g = 0; g < problemData.getGroupsNum(); ++g) {
        if (group_counts[g] > groups_soft_capacity[g]) {
            int excess = group_counts[g] - groups_soft_capacity[g];
            wasRepaired = true;  // wykryto błąd, będziemy naprawiać
            // find subject for this group
            int p = problemData.getSubjectFromGroup(g);
            // find underfilled groups for this subject
            std::vector<int> available_groups;
            for (int gg = cumulative_groups[p]; gg < cumulative_groups[p + 1]; ++gg) {
                if (group_counts[gg] < groups_soft_capacity[gg]) {
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
                if (group_counts[new_abs_group] >= groups_soft_capacity[new_abs_group]) {
                    available_groups.erase(available_groups.begin());
                }
            }
            if (group_counts[g] > groups_soft_capacity[g]) {
                //should not happen if feasibility check worked
                Logger::warn("Weird? Could not fully repair group " + std::to_string(g) + " capacity violation.");
            }
        }
    }

    return wasRepaired;
}
