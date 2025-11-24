#include "optimization/Evaluator.hpp"
#include "utils/Logger.hpp"
#include <random>
#include <set>
#include <map>
#include <algorithm>
#include <cmath>
#include <type_traits>

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

double Evaluator::evaluate(Individual& individual) const {
    // Logger::debug("Evaluator::evaluate start");
    // 1. Repair constraints
    if (!repair(individual)) {
        // Logger::debug("Evaluator::evaluate repair failed");
        return -1.0;
    }
    // Logger::debug("Evaluator::evaluate repair success");

    // 2. Decode Genotype (re-decode after repair)
    int studentsNum = problemData.getStudentsNum();
    int groupsNum = problemData.getGroupsNum();
    int timeslotsDaily = problemData.getTimeslotsDaily();
    int daysNum = problemData.getDaysNum();
    
    std::vector<std::vector<int>> studentGroups(studentsNum);
    int geneIdx = 0;
    for (int s = 0; s < studentsNum; ++s) {
        for (size_t i = 0; i < problemData.getStudentsSubjects()[s].size(); ++i) {
            int relGroup = individual.genotype[geneIdx];
            int absGroup = problemData.getAbsoluteGroupIndex(geneIdx, relGroup);
            studentGroups[s].push_back(absGroup);
            geneIdx++;
        }
    }
    
    std::vector<std::pair<int, int>> groupAssignments(groupsNum);
    for (int g = 0; g < groupsNum; ++g) {
        int timeslot = individual.genotype[geneIdx++];
        int room = individual.genotype[geneIdx++];
        groupAssignments[g] = {timeslot, room};
    }

    // 3. Calculate Fitness
    double totalStudentFitness = 0.0;
    double totalStudentWeight = 0.0;
    lastStudentFitnesses.clear();
    lastStudentDetailedFitnesses.clear();
    lastStudentWeightedFitnesses.clear();
    lastTeacherFitnesses.clear();
    lastTeacherDetailedFitnesses.clear();
    lastTeacherWeightedFitnesses.clear();
    lastTotalStudentWeight = 0.0;
    lastTotalTeacherWeight = 0.0;

    // Helper to process preferences
    auto processPreferences = [&](const auto& pref, const std::vector<int>& myGroups, bool isTeacher) -> std::pair<double, std::vector<std::pair<double, double>>> {
        double scoreSum = 0.0;
        double weightSum = 0.0;
        std::vector<std::pair<double, double>> details;

        // Organize classes by day
        std::vector<std::vector<std::pair<int, int>>> dayClasses(daysNum);
        std::set<int> occupiedTimeslots;
        int daysWithClasses = 0;

        for (int g : myGroups) {
            int timeslot = groupAssignments[g].first;
            int subject = problemData.getSubjectFromGroup(g);
            int duration = problemData.getSubjectsDuration()[subject];
            
            int day = timeslot / timeslotsDaily;
            if (day < daysNum) {
                dayClasses[day].push_back({timeslot, duration});
                for(int t=0; t<duration; ++t) occupiedTimeslots.insert(timeslot + t);
            }
        }

        for (auto& daySched : dayClasses) {
            if (!daySched.empty()) {
                std::sort(daySched.begin(), daySched.end());
                daysWithClasses++;
            }
        }

        // Helper to add detail with negative weight handling
        auto addDetail = [&](double rawScore, double weight) {
            double finalScore = std::clamp(rawScore, 0.0, 1.0);
            if (weight < 0) {
                finalScore = 1.0 - finalScore;
            }
            double absWeight = std::abs(weight);
            details.push_back({finalScore, absWeight});
            scoreSum += finalScore * absWeight;
            weightSum += absWeight;
        };

        // a) FreeDays
        if (pref.free_days != 0) {
            double freeDaysRatio = (double)(daysNum - daysWithClasses) / daysNum;
            addDetail(freeDaysRatio, pref.free_days);
        } else {
            addDetail(1.0, 0.0);
        }

        // b) ShortDays
        if (pref.short_days != 0 && daysWithClasses > 0) {
            double totalShortness = 0.0;
            for (const auto& daySched : dayClasses) {
                if (daySched.empty()) continue;
                int start = daySched.front().first % timeslotsDaily;
                int end = (daySched.back().first + daySched.back().second - 1) % timeslotsDaily;
                int length = end - start + 1;
                totalShortness += (double)(timeslotsDaily - length) / timeslotsDaily;
            }
            addDetail(totalShortness / daysWithClasses, pref.short_days);
        } else {
            addDetail(1.0, 0.0);
        }

        // c) UniformDays
        if (pref.uniform_days != 0 && daysWithClasses > 1) {
            std::vector<int> lengths;
            double mean = 0;
            for (const auto& daySched : dayClasses) {
                if (daySched.empty()) continue;
                int start = daySched.front().first % timeslotsDaily;
                int end = (daySched.back().first + daySched.back().second - 1) % timeslotsDaily;
                int length = end - start + 1;
                lengths.push_back(length);
                mean += length;
            }
            mean /= lengths.size();
            double variance = 0;
            for (int l : lengths) variance += (l - mean) * (l - mean);
            variance /= lengths.size();
            double stdDev = std::sqrt(variance);
            double maxStdDev = timeslotsDaily / 2.0; // Approx max
            
            double uniformity = 1.0 - (stdDev / maxStdDev);
            addDetail(uniformity, pref.uniform_days);
        } else {
            addDetail(1.0, 0.0);
        }

        // d) ConcentratedDays
        if (pref.concentrated_days != 0) {
            int transitions = 0;
            for (int d = 0; d < daysNum; ++d) {
                bool currentBusy = !dayClasses[d].empty();
                bool nextBusy = !dayClasses[(d + 1) % daysNum].empty();
                if (currentBusy != nextBusy) transitions++;
            }
            // Max transitions = daysNum (e.g. 0 1 0 1...)
            double concentration = 1.0 - ((double)transitions / daysNum);
            addDetail(concentration, pref.concentrated_days);
        } else {
            addDetail(1.0, 0.0);
        }

        // e) MinGaps
        if (pref.min_gaps_length.size() >= 2 && pref.min_gaps_length[1] != 0) {
            int limit = pref.min_gaps_length[0];
            int weight = pref.min_gaps_length[1];
            int validDays = 0;
            int daysWithGaps = 0;
            
            for (const auto& daySched : dayClasses) {
                if (daySched.size() < 2) continue;
                bool dayOk = true;
                bool hasGap = false;
                for (size_t i = 0; i < daySched.size() - 1; ++i) {
                    int end1 = daySched[i].first + daySched[i].second;
                    int start2 = daySched[i+1].first;
                    int gap = start2 - end1;
                    if (gap > 0) {
                        hasGap = true;
                        if (gap < limit) dayOk = false;
                    }
                }
                if (hasGap) {
                    daysWithGaps++;
                    if (dayOk) validDays++;
                }
            }
            
            if (daysWithGaps > 0) {
                addDetail((double)validDays / daysWithGaps, weight);
            } else {
                addDetail(1.0, weight);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // f) MaxGaps
        if (pref.max_gaps_length.size() >= 2 && pref.max_gaps_length[1] != 0) {
            int limit = pref.max_gaps_length[0];
            int weight = pref.max_gaps_length[1];
            int validDays = 0;
            int daysWithGaps = 0;
            
            for (const auto& daySched : dayClasses) {
                if (daySched.size() < 2) continue;
                bool dayOk = true;
                bool hasGap = false;
                for (size_t i = 0; i < daySched.size() - 1; ++i) {
                    int end1 = daySched[i].first + daySched[i].second;
                    int start2 = daySched[i+1].first;
                    int gap = start2 - end1;
                    if (gap > 0) {
                        hasGap = true;
                        if (gap > limit) dayOk = false;
                    }
                }
                if (hasGap) {
                    daysWithGaps++;
                    if (dayOk) validDays++;
                }
            }
            
            if (daysWithGaps > 0) {
                addDetail((double)validDays / daysWithGaps, weight);
            } else {
                addDetail(1.0, weight);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // g) MinDayLength
        if (pref.min_day_length.size() >= 2 && pref.min_day_length[1] != 0) {
            int limit = pref.min_day_length[0];
            int weight = pref.min_day_length[1];
            int validDays = 0;
            
            for (const auto& daySched : dayClasses) {
                if (daySched.empty()) continue;
                int start = daySched.front().first % timeslotsDaily;
                int end = (daySched.back().first + daySched.back().second - 1) % timeslotsDaily;
                int len = end - start + 1;
                
                if (len >= limit) validDays++;
            }
            
            if (daysWithClasses > 0) {
                addDetail((double)validDays / daysWithClasses, weight);
            } else {
                addDetail(1.0, weight);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // h) MaxDayLength
        if (pref.max_day_length.size() >= 2 && pref.max_day_length[1] != 0) {
            int limit = pref.max_day_length[0];
            int weight = pref.max_day_length[1];
            int validDays = 0;
            
            for (const auto& daySched : dayClasses) {
                if (daySched.empty()) continue;
                int start = daySched.front().first % timeslotsDaily;
                int end = (daySched.back().first + daySched.back().second - 1) % timeslotsDaily;
                int len = end - start + 1;
                
                if (len <= limit) validDays++;
            }
            
            if (daysWithClasses > 0) {
                addDetail((double)validDays / daysWithClasses, weight);
            } else {
                addDetail(1.0, weight);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // i) Preferred Start
        if (pref.preferred_day_start_timeslot.size() >= 2 && pref.preferred_day_start_timeslot[1] != 0) {
            int target = pref.preferred_day_start_timeslot[0];
            int weight = pref.preferred_day_start_timeslot[1];
            double totalError = 0;
            
            for (const auto& daySched : dayClasses) {
                if (daySched.empty()) continue;
                int actual = daySched.front().first % timeslotsDaily;
                int diff = std::abs(actual - target);
                diff = std::min(diff, timeslotsDaily); // Safety clamp
                totalError += (double)diff / timeslotsDaily;
            }
            
            if (daysWithClasses > 0) {
                double avgError = totalError / daysWithClasses;
                addDetail(1.0 - avgError, weight);
            } else {
                addDetail(1.0, weight);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // j) Preferred End
        if (pref.preferred_day_end_timeslot.size() >= 2 && pref.preferred_day_end_timeslot[1] != 0) {
            int target = pref.preferred_day_end_timeslot[0];
            int weight = pref.preferred_day_end_timeslot[1];
            double totalError = 0;
            
            for (const auto& daySched : dayClasses) {
                if (daySched.empty()) continue;
                int actual = (daySched.back().first + daySched.back().second - 1) % timeslotsDaily;
                int diff = std::abs(actual - target);
                diff = std::min(diff, timeslotsDaily); // Safety clamp
                totalError += (double)diff / timeslotsDaily;
            }
            
            if (daysWithClasses > 0) {
                double avgError = totalError / daysWithClasses;
                addDetail(1.0 - avgError, weight);
            } else {
                addDetail(1.0, weight);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // k) TagOrder
        if (!pref.tag_order.empty()) {
            double tagScoreSum = 0;
            double tagWeightSum = 0;
            
            for (const auto& rule : pref.tag_order) {
                if (rule.size() < 3) continue;
                int tA = rule[0];
                int tB = rule[1];
                int w = rule[2];
                if (w == 0) continue;
                
                int opportunities = 0;
                int matches = 0;
                
                for (int d = 0; d < daysNum; ++d) {
                    std::vector<int> dayGroups;
                    for (int g : myGroups) {
                        int ts = groupAssignments[g].first;
                        if (ts / timeslotsDaily == d) dayGroups.push_back(g);
                    }
                    std::sort(dayGroups.begin(), dayGroups.end(), [&](int a, int b){
                        return groupAssignments[a].first < groupAssignments[b].first;
                    });
                    
                    if (dayGroups.size() < 2) continue;
                    
                    for (size_t i = 0; i < dayGroups.size() - 1; ++i) {
                        int g1 = dayGroups[i];
                        int g2 = dayGroups[i+1];
                        
                        int end1 = groupAssignments[g1].first + problemData.getSubjectsDuration()[problemData.getSubjectFromGroup(g1)];
                        int start2 = groupAssignments[g2].first;
                        if (end1 != start2) continue; 
                        
                        const auto& tags1 = problemData.getGroupsTagsIndexed()[g1];
                        const auto& tags2 = problemData.getGroupsTagsIndexed()[g2];
                        
                        bool hasA = std::find(tags1.begin(), tags1.end(), tA) != tags1.end();
                        if (hasA) {
                            opportunities++;
                            bool hasB = std::find(tags2.begin(), tags2.end(), tB) != tags2.end();
                            if (hasB) matches++;
                        }
                    }
                }
                
                if (opportunities > 0) {
                    double ratio = (double)matches / opportunities;
                    double ruleS = ratio;
                    if (w < 0) ruleS = 1.0 - ruleS;
                    
                    tagScoreSum += ruleS * std::abs(w);
                    tagWeightSum += std::abs(w);
                }
            }
            
            if (tagWeightSum > 0) {
                // We manually add detail here because we aggregated multiple rules
                details.push_back({std::clamp(tagScoreSum / tagWeightSum, 0.0, 1.0), tagWeightSum});
                scoreSum += tagScoreSum; // Already weighted
                weightSum += tagWeightSum;
            } else {
                addDetail(1.0, 0.0);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // l) PreferredTimeslots
        if (!pref.preferred_timeslots.empty()) {
            double obtained = 0;
            double maxPossible = 0;
            double minPossible = 0;
            double totalAbsWeight = 0;
            
            for (int val : pref.preferred_timeslots) totalAbsWeight += std::abs(val);
            
            for (int g : myGroups) {
                int ts = groupAssignments[g].first;
                int sub = problemData.getSubjectFromGroup(g);
                int dur = problemData.getSubjectsDuration()[sub];
                
                double currentG = 0;
                for (int t = 0; t < dur; ++t) {
                    if (ts + t < (int)pref.preferred_timeslots.size())
                        currentG += pref.preferred_timeslots[ts + t];
                }
                obtained += currentG;
                
                double maxG = -1e9, minG = 1e9;
                for (int t = 0; t <= (int)pref.preferred_timeslots.size() - dur; ++t) {
                    double sum = 0;
                    for (int k = 0; k < dur; ++k) sum += pref.preferred_timeslots[t + k];
                    if (sum > maxG) maxG = sum;
                    if (sum < minG) minG = sum;
                }
                if (maxG == -1e9) { maxG = 0; minG = 0; }
                maxPossible += maxG;
                minPossible += minG;
            }
            
            if (std::abs(maxPossible - minPossible) > 1e-9) {
                double normalized = (obtained - minPossible) / (maxPossible - minPossible);
                // We use totalAbsWeight as the weight for this category
                // Normalized score is already "goodness" (0 to 1), so we treat it as positive weight logic
                details.push_back({std::clamp(normalized, 0.0, 1.0), totalAbsWeight});
                scoreSum += normalized * totalAbsWeight;
                weightSum += totalAbsWeight;
            } else {
                addDetail(1.0, 0.0);
            }
        } else {
            addDetail(1.0, 0.0);
        }

        // m) PreferredGroups (Student only)
        if constexpr (std::is_same_v<std::decay_t<decltype(pref)>, StudentPreference>) {
            if (!pref.preferred_groups.empty()) {
                double groupScore = 0;
                double groupWeight = 0;
                for (size_t g = 0; g < pref.preferred_groups.size(); ++g) {
                    int w = pref.preferred_groups[g];
                    if (w == 0) continue;
                    bool isAssigned = std::find(myGroups.begin(), myGroups.end(), (int)g) != myGroups.end();
                    
                    double termScore = 0.0;
                    if (w > 0) termScore = isAssigned ? 1.0 : 0.0;
                    else termScore = isAssigned ? 0.0 : 1.0; // w < 0
                    
                    groupScore += termScore * std::abs(w);
                    groupWeight += std::abs(w);
                }
                if (groupWeight > 0) {
                    details.push_back({std::clamp(groupScore / groupWeight, 0.0, 1.0), groupWeight});
                    scoreSum += groupScore;
                    weightSum += groupWeight;
                }
                else addDetail(1.0, 0.0);
            } else {
                addDetail(1.0, 0.0);
            }
        }

        if (weightSum < 1e-9) return {1.0, details};
        return {std::clamp(scoreSum / weightSum, 0.0, 1.0), details};
    };

    // Evaluate Students
    const auto& studentWeights = problemData.getStudentWeights();
    for (int s = 0; s < studentsNum; ++s) {
        auto result = processPreferences(problemData.getStudentsPreferences()[s], studentGroups[s], false);
        lastStudentFitnesses.push_back(result.first);
        lastStudentDetailedFitnesses.push_back(result.second);
        
        double w = (s < (int)studentWeights.size()) ? studentWeights[s] : 1.0;
        lastStudentWeightedFitnesses.push_back(result.first * w);
        totalStudentFitness += result.first * w;
        totalStudentWeight += w;
    }
    lastTotalStudentWeight = totalStudentWeight;

    // Evaluate Teachers
    double totalTeacherFitness = 0.0;
    double totalTeacherWeight = 0.0;
    const auto& teacherWeights = problemData.getTeacherWeights();
    
    std::vector<std::vector<int>> teacherGroups(problemData.getTeachersNum());
    for (int t = 0; t < problemData.getTeachersNum(); ++t) {
        teacherGroups[t] = problemData.getTeachersGroups()[t];
    }

    for (int t = 0; t < problemData.getTeachersNum(); ++t) {
        auto result = processPreferences(problemData.getTeachersPreferences()[t], teacherGroups[t], true);
        lastTeacherFitnesses.push_back(result.first);
        lastTeacherDetailedFitnesses.push_back(result.second);
        
        double w = (t < (int)teacherWeights.size()) ? teacherWeights[t] : 1.0;
        lastTeacherWeightedFitnesses.push_back(result.first * w);
        totalTeacherFitness += result.first * w;
        totalTeacherWeight += w;
    }
    lastTotalTeacherWeight = totalTeacherWeight;

    double finalFitness = 0.0;
    if (totalStudentWeight + totalTeacherWeight > 0) {
        finalFitness = (totalStudentFitness + totalTeacherFitness) / (totalStudentWeight + totalTeacherWeight);
    }

    return finalFitness;
}

bool Evaluator::repair(Individual& individual) const {
    if (!problemData.isFeasible()) {
        Logger::warn("ProblemData is not feasible. Repair is not possible.");
        return false;
    }

    bool wasRepaired = false;

    int studentsNum = problemData.getStudentsNum();
    int groupsNum = problemData.getGroupsNum();
    const auto& groupsCapacity = problemData.getGroupsCapacity();
    const auto& minStudents = problemData.getMinStudentsPerGroup();
    const auto& cumulativeGroups = problemData.getCumulativeGroups();
    
    std::vector<int> groupCounts(groupsNum, 0);
    struct StudentRef { int studentId; int geneIdx; };
    std::vector<std::vector<StudentRef>> groupStudents(groupsNum);
    
    int geneIdx = 0;
    for (int s = 0; s < studentsNum; ++s) {
        for (size_t i = 0; i < problemData.getStudentsSubjects()[s].size(); ++i) {
            int relGroup = individual.genotype[geneIdx];
            int absGroup = problemData.getAbsoluteGroupIndex(geneIdx, relGroup);
            groupCounts[absGroup]++;
            groupStudents[absGroup].push_back({s, geneIdx});
            geneIdx++;
        }
    }
    
    // 1. Fix Capacity Overflow
    for (int g = 0; g < groupsNum; ++g) {
        while (groupCounts[g] > groupsCapacity[g]) {
            int subject = problemData.getSubjectFromGroup(g);
            int startG = cumulativeGroups[subject];
            int endG = cumulativeGroups[subject + 1];
            
            StudentRef student = groupStudents[g].back();
            groupStudents[g].pop_back();
            groupCounts[g]--;
            
            bool moved = false;
            for (int target = startG; target < endG; ++target) {
                if (target != g && groupCounts[target] < groupsCapacity[target]) {
                    int newRel = target - startG;
                    individual.genotype[student.geneIdx] = newRel;
                    groupCounts[target]++;
                    groupStudents[target].push_back(student);
                    moved = true;
                    break;
                }
            }
            if (!moved) return false;
        }
    }
    
    // 2. Fix MinStudents Underflow
    for (int s = 0; s < problemData.getSubjectsNum(); ++s) {
        int startG = cumulativeGroups[s];
        int endG = cumulativeGroups[s + 1];
        
        for (int g = startG; g < endG; ++g) {
            while (groupCounts[g] > 0 && groupCounts[g] < minStudents[g]) {
                StudentRef student = groupStudents[g].back();
                groupStudents[g].pop_back();
                groupCounts[g]--;
                
                int bestTarget = -1;
                for (int target = startG; target < endG; ++target) {
                    if (target == g) continue;
                    if (groupCounts[target] >= groupsCapacity[target]) continue;
                    
                    if (bestTarget == -1) bestTarget = target;
                    else {
                        bool currentSafe = groupCounts[bestTarget] >= minStudents[bestTarget];
                        bool newSafe = groupCounts[target] >= minStudents[target];
                        if (!currentSafe && newSafe) bestTarget = target;
                        else if (!currentSafe && !newSafe && groupCounts[target] > groupCounts[bestTarget]) bestTarget = target;
                    }
                }
                
                if (bestTarget != -1) {
                    int newRel = bestTarget - startG;
                    individual.genotype[student.geneIdx] = newRel;
                    groupCounts[bestTarget]++;
                    groupStudents[bestTarget].push_back(student);
                } else {
                    return false;
                }
            }
        }
    }
    
    // 3. Fix Schedule
    int geneOffset = geneIdx;

    int timeslotsDaily = problemData.getTimeslotsDaily();
    int daysNum = problemData.getDaysNum();
    const auto& subjectsDuration = problemData.getSubjectsDuration();
    const auto& roomsCapacity = problemData.getRoomsCapacity();
    const auto& groupsTags = problemData.getGroupsTagsIndexed();
    const auto& roomsTags = problemData.getRoomsTagsIndexed();
    
    std::set<std::pair<int, int>> occupiedRoomSlots;
    std::set<std::pair<int, int>> occupiedTeacherSlots;
    
    const auto& rUnavail = problemData.getRoomsUnavailabilityTimeslots();
    for (int r = 0; r < (int)rUnavail.size(); ++r) {
        for (int t : rUnavail[r]) occupiedRoomSlots.insert({r, t});
    }
    const auto& tUnavail = problemData.getTeachersUnavailabilityTimeslots();
    for (int t = 0; t < (int)tUnavail.size(); ++t) {
        for (int ts : tUnavail[t]) occupiedTeacherSlots.insert({t, ts});
    }

    for (int g = 0; g < groupsNum; ++g) {
        if (groupCounts[g] == 0) continue;
        
        int subject = problemData.getSubjectFromGroup(g);
        if (subject < 0 || subject >= subjectsDuration.size()) {
             Logger::error("Invalid subject index " + std::to_string(subject) + " for group " + std::to_string(g));
             return false;
        }
        int duration = subjectsDuration[subject];
        
        int teacher = -1;
        for (int t = 0; t < problemData.getTeachersNum(); ++t) {
            const auto& tGroups = problemData.getTeachersGroups()[t];
            if (std::find(tGroups.begin(), tGroups.end(), g) != tGroups.end()) {
                teacher = t;
                break;
            }
        }
        
        int tsIdx = geneOffset + g * 2;
        int roomIdx = geneOffset + g * 2 + 1;
        
        if (tsIdx >= individual.genotype.size() || roomIdx >= individual.genotype.size()) {
             Logger::error("Genotype index out of bounds: tsIdx=" + std::to_string(tsIdx) + ", roomIdx=" + std::to_string(roomIdx) + ", size=" + std::to_string(individual.genotype.size()));
             return false;
        }

        int currentTs = individual.genotype[tsIdx];
        int currentRoom = individual.genotype[roomIdx];
        
        bool valid = true;
        int day = currentTs / timeslotsDaily;
        if (currentTs + duration > (day + 1) * timeslotsDaily) valid = false;
        if (roomsCapacity[currentRoom] < groupCounts[g]) valid = false;
        
        const auto& gTags = groupsTags[g];
        const auto& rTags = roomsTags[currentRoom];
        for (int tag : gTags) {
            if (std::find(rTags.begin(), rTags.end(), tag) == rTags.end()) { valid = false; break; }
        }
        
        if (valid) {
            for (int t = 0; t < duration; ++t) {
                if (occupiedRoomSlots.count({currentRoom, currentTs + t})) { valid = false; break; }
                if (teacher != -1 && occupiedTeacherSlots.count({teacher, currentTs + t})) { valid = false; break; }
            }
        }
        
        if (!valid) {
            bool found = false;
            for (int d = 0; d < daysNum; ++d) {
                for (int s = 0; s <= timeslotsDaily - duration; ++s) {
                    int startTs = d * timeslotsDaily + s;
                    
                    bool teacherOk = true;
                    if (teacher != -1) {
                        for (int t = 0; t < duration; ++t) {
                            if (occupiedTeacherSlots.count({teacher, startTs + t})) { teacherOk = false; break; }
                        }
                    }
                    if (!teacherOk) continue;
                    
                    for (int r = 0; r < problemData.getRoomsNum(); ++r) {
                        if (roomsCapacity[r] < groupCounts[g]) continue;
                        
                        bool tagsOk = true;
                        const auto& rTagsRef = roomsTags[r];
                        for (int tag : gTags) {
                            if (std::find(rTagsRef.begin(), rTagsRef.end(), tag) == rTagsRef.end()) { tagsOk = false; break; }
                        }
                        if (!tagsOk) continue;
                        
                        bool roomOk = true;
                        for (int t = 0; t < duration; ++t) {
                            if (occupiedRoomSlots.count({r, startTs + t})) { roomOk = false; break; }
                        }
                        
                        if (roomOk) {
                            individual.genotype[tsIdx] = startTs;
                            individual.genotype[roomIdx] = r;
                            currentTs = startTs;
                            currentRoom = r;
                            found = true;
                            goto found_slot;
                        }
                    }
                }
            }
            found_slot:
            if (!found) return false;
        }
        
        for (int t = 0; t < duration; ++t) {
            occupiedRoomSlots.insert({currentRoom, currentTs + t});
            if (teacher != -1) occupiedTeacherSlots.insert({teacher, currentTs + t});
        }
    }
    
    // 4. Student Overlaps
    const auto& sUnavail = problemData.getStudentsUnavailabilityTimeslots();
    for (int s = 0; s < studentsNum; ++s) {
        std::set<int> studentSlots;
        for (int t : sUnavail[s]) studentSlots.insert(t);
        
        int sGeneIdx = 0;
        for(int k=0; k<s; ++k) sGeneIdx += problemData.getStudentsSubjects()[k].size();
        
        for (size_t i = 0; i < problemData.getStudentsSubjects()[s].size(); ++i) {
            int relGroup = individual.genotype[sGeneIdx + i];
            int absGroup = problemData.getAbsoluteGroupIndex(sGeneIdx + i, relGroup);
            
            int tsIdx = geneOffset + absGroup * 2;
            int startTs = individual.genotype[tsIdx];
            int subject = problemData.getSubjectFromGroup(absGroup);
            int duration = subjectsDuration[subject];
            
            for (int t = 0; t < duration; ++t) {
                if (studentSlots.count(startTs + t)) return false;
                studentSlots.insert(startTs + t);
            }
        }
    }

    return true;
}