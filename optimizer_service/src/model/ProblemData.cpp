#include "model/ProblemData.hpp"
#include "utils/Logger.hpp"
#include <stdexcept>
#include <string>

ProblemData::ProblemData(const RawProblemData& input_data) : _rawData(input_data) {
    // calculate _total_timeslots
    _total_timeslots = _rawData.timeslots_daily * _rawData.days_in_cycle;

    // calculate _subject_total_capacity
    _subject_total_capacity.resize(getSubjectsNum(), 0);
    int group_idx = 0;
    for (int p = 0; p < getSubjectsNum(); ++p) {
        for (int g = 0; g < _rawData.groups_per_subject[p]; ++g) {
            _subject_total_capacity[p] += _rawData.groups_capacity[group_idx++];
        }
    }

    // calculate _total_student_subjects
    _total_student_subjects = 0;
    for (const auto& subjects : _rawData.students_subjects) {
        _total_student_subjects += (int)subjects.size();
    }

    // calculate _cumulative_groups
    _cumulative_groups.resize(getSubjectsNum() + 1, 0);
    for (int i = 1; i <= getSubjectsNum(); ++i) {
        _cumulative_groups[i] = _cumulative_groups[i - 1] + _rawData.groups_per_subject[i - 1];
    }

    // calculate _student_weights_sums
    _student_weights_sums.resize(getStudentsNum(), 0);
    for (int s = 0; s < getStudentsNum(); ++s) {
        const auto& pref = _rawData.students_preferences[s];
        // sum width_height_info weight
        _student_weights_sums[s] += std::abs(pref.width_height_info);
        // sum gaps_info weight (third element is weight)
        if (pref.gaps_info.size() >= 3) {
            _student_weights_sums[s] += std::abs(pref.gaps_info[2]);
        }
        // sum preferred_timeslots weights (absolute values)
        for (int weight : pref.preferred_timeslots) {
            _student_weights_sums[s] += std::abs(weight);
        }
        // sum preferred_groups weights (absolute values)
        for (int weight : pref.preferred_groups) {
            _student_weights_sums[s] += std::abs(weight);
        }
    }

    // calculate _subject_student_count
    _subject_student_count.resize(getSubjectsNum(), 0);
    for (int s = 0; s < getStudentsNum(); ++s) {
        for (int subj : _rawData.students_subjects[s]) {
            _subject_student_count[subj]++;
        }
    }

    // print subject student counts and capacities
    std::string str = "[";
    std::string str2 = "[";
    for (int p = 0; p < getSubjectsNum(); ++p) {
        str += std::to_string(_subject_student_count[p]) + (p == getSubjectsNum() - 1 ? "" : ", ");
    }
    for (int p = 0; p < getSubjectsNum(); ++p) {
        str2 += std::to_string(_subject_total_capacity[p]) + (p == getSubjectsNum() - 1 ? "" : ", ");
    }
    str += "]";
    str2 += "]";
    Logger::info("Subject student counts: " + str + ", capacities: " + str2);

    _isFeasible = checkFeasibility();
}

int ProblemData::getAbsoluteGroupIndex(int idx_genu, int rel_group) const {
    //rel_group == gene value (relative group index for the subject from 0 to groups_per_subject[subject]-1)
    if (idx_genu < 0 || idx_genu >= getTotalStudentSubjects()) {
        throw std::runtime_error("Invalid gene index: " + std::to_string(idx_genu) + ", total: " + std::to_string(getTotalStudentSubjects()));
    }
    //szukamy przedmiotu dla danego idx_genu
    int cumulative = 0;
    int student_idx = 0;
    int local_idx = 0;
    for (; student_idx < getStudentsNum(); ++student_idx) {
        int student_size = (int)_rawData.students_subjects[student_idx].size();
        if (cumulative + student_size > idx_genu) {
            local_idx = idx_genu - cumulative;
            break;
        }
        cumulative += student_size;
    }
    int subject = _rawData.students_subjects[student_idx][local_idx];
    if (rel_group < 0 || rel_group >= _rawData.groups_per_subject[subject]) {
        throw std::runtime_error("Invalid relative group: " + std::to_string(rel_group) + " for subject " + std::to_string(subject) + ", max: " + std::to_string(_rawData.groups_per_subject[subject] - 1));
    }
    const auto& cum_groups = getCumulativeGroups();
    return cum_groups[subject] + rel_group;
}

int ProblemData::getDayFromTimeslot(int timeslot) const {
    int timeslots_per_day = _rawData.timeslots_daily;
    if (timeslots_per_day == 0) return -1;
    int day = timeslot / timeslots_per_day;
    if (day >= _rawData.days_in_cycle) return -1;
    return day;
}

int ProblemData::getSubjectFromGroup(int group) const {
    int cum = 0;
    for (int p = 0; p < getSubjectsNum(); ++p) {
        cum += _rawData.groups_per_subject[p];
        if (group < cum) return p;
    }
    return -1; // invalid
}

void ProblemData::logProblemDataInfo() const {
    Logger::info("ProblemData Info:");
    Logger::info("  Total Timeslots: " + std::to_string(_total_timeslots));
    Logger::info("  Total Student Subjects: " + std::to_string(_total_student_subjects));
    Logger::info("  Subject Total Capacities: ");
    for (int p = 0; p < getSubjectsNum(); ++p) {
        Logger::info("    Subject " + std::to_string(p) + ": " + std::to_string(_subject_total_capacity[p]));
    }
    Logger::info("  Cumulative Groups: ");
    for (int p = 0; p <= getSubjectsNum(); ++p) {
        Logger::info("    Up to Subject " + std::to_string(p) + ": " + std::to_string(_cumulative_groups[p]));
    }
    Logger::info("  Student Weights Sums: ");
    for (int s = 0; s < getStudentsNum(); ++s) {
        Logger::info("    Student " + std::to_string(s) + ": " + std::to_string(_student_weights_sums[s]));
    }
    Logger::info("  Subject Student Counts: ");
    for (int p = 0; p < getSubjectsNum(); ++p) {
        Logger::info("    Subject " + std::to_string(p) + ": " + std::to_string(_subject_student_count[p]));
    }

    // log all values
    Logger::info("Timeslots Daily: " + std::to_string(_rawData.timeslots_daily));
    Logger::info("Days In Cycle: " + std::to_string(_rawData.days_in_cycle));
    Logger::info("Number of Subjects: " + std::to_string(_rawData.num_subjects));
    Logger::info("Number of Groups: " + std::to_string(_rawData.num_groups));
    Logger::info("Number of Students: " + std::to_string(_rawData.num_students));
    Logger::info("Number of Teachers: " + std::to_string(_rawData.num_teachers));
    Logger::info("Number of Rooms: " + std::to_string(_rawData.num_rooms));
    Logger::info("Number of Tags: " + std::to_string(_rawData.num_tags));

    // log vector<int> sizes
    Logger::info("Min Students Per Group size: " + std::to_string((int)_rawData.min_students_per_group.size()));
    Logger::info("Subjects Duration size: " + std::to_string((int)_rawData.subjects_duration.size()));
    Logger::info("Groups Per Subject size: " + std::to_string((int)_rawData.groups_per_subject.size()));
    Logger::info("Groups Capacity size: " + std::to_string((int)_rawData.groups_capacity.size()));
    Logger::info("Rooms Capacity size: " + std::to_string((int)_rawData.rooms_capacity.size()));
    
    // log vector<vector<int>> sizes
    Logger::info("Groups Tags size: " + std::to_string((int)_rawData.groups_tags.size()));
    Logger::info("Rooms Tags size: " + std::to_string((int)_rawData.rooms_tags.size()));
    Logger::info("Students Subjects size: " + std::to_string((int)_rawData.students_subjects.size()));
    Logger::info("Teachers Groups size: " + std::to_string((int)_rawData.teachers_groups.size()));
    Logger::info("Rooms Unavailability Timeslots size: " + std::to_string((int)_rawData.rooms_unavailability_timeslots.size()));
    Logger::info("Students Unavailability Timeslots size: " + std::to_string((int)_rawData.students_unavailability_timeslots.size()));
    Logger::info("Teachers Unavailability Timeslots size: " + std::to_string((int)_rawData.teachers_unavailability_timeslots.size()));

    // log preferences sizes
    Logger::info("Students Preferences size: " + std::to_string((int)_rawData.students_preferences.size()));
    Logger::info("Teachers Preferences size: " + std::to_string((int)_rawData.teachers_preferences.size()));
}

bool ProblemData::checkFeasibility() const {
    // check counts consistency
    if ((int)_rawData.subjects_duration.size() != _rawData.num_subjects) {
        Logger::warn("SubjectsDuration size (" + std::to_string((int)_rawData.subjects_duration.size()) + 
                    ") does not match NumSubjects (" + std::to_string(_rawData.num_subjects) + ")");
        return false;
    }
    if ((int)_rawData.groups_per_subject.size() != _rawData.num_subjects) {
        Logger::warn("GroupsPerSubject size (" + std::to_string((int)_rawData.groups_per_subject.size()) + 
                    ") does not match NumSubjects (" + std::to_string(_rawData.num_subjects) + ")");
        return false;
    }
    if ((int)_rawData.min_students_per_group.size() != _rawData.num_groups) {
        Logger::warn("MinStudentsPerGroup size (" + std::to_string((int)_rawData.min_students_per_group.size()) + 
                    ") does not match NumGroups (" + std::to_string(_rawData.num_groups) + ")");
        return false;
    }
    if ((int)_rawData.groups_capacity.size() != _rawData.num_groups) {
        Logger::warn("GroupsCapacity size (" + std::to_string((int)_rawData.groups_capacity.size()) + 
                    ") does not match NumGroups (" + std::to_string(_rawData.num_groups) + ")");
        return false;
    }
    if ((int)_rawData.rooms_capacity.size() != _rawData.num_rooms) {
        Logger::warn("RoomsCapacity size (" + std::to_string((int)_rawData.rooms_capacity.size()) + 
                    ") does not match NumRooms (" + std::to_string(_rawData.num_rooms) + ")");
        return false;
    }
    if ((int)_rawData.rooms_unavailability_timeslots.size() != _rawData.num_rooms) {
        Logger::warn("RoomsUnavailabilityTimeslots size (" + std::to_string((int)_rawData.rooms_unavailability_timeslots.size()) + 
                    ") does not match NumRooms (" + std::to_string(_rawData.num_rooms) + ")");
        return false;
    }
    if ((int)_rawData.students_subjects.size() != _rawData.num_students) {
        Logger::warn("StudentsSubjects size (" + std::to_string((int)_rawData.students_subjects.size()) + 
                    ") does not match NumStudents (" + std::to_string(_rawData.num_students) + ")");
        return false;
    }
    if ((int)_rawData.students_unavailability_timeslots.size() != _rawData.num_students) {
        Logger::warn("StudentsUnavailabilityTimeslots size (" + std::to_string((int)_rawData.students_unavailability_timeslots.size()) + 
                    ") does not match NumStudents (" + std::to_string(_rawData.num_students) + ")");
        return false;
    }
    if ((int)_rawData.teachers_groups.size() != _rawData.num_teachers) {
        Logger::warn("TeachersGroups size (" + std::to_string((int)_rawData.teachers_groups.size()) + 
                    ") does not match NumTeachers (" + std::to_string(_rawData.num_teachers) + ")");
        return false;
    }
    if ((int)_rawData.teachers_unavailability_timeslots.size() != _rawData.num_teachers) {
        Logger::warn("TeachersUnavailabilityTimeslots size (" + std::to_string((int)_rawData.teachers_unavailability_timeslots.size()) + 
                    ") does not match NumTeachers (" + std::to_string(_rawData.num_teachers) + ")");
        return false;
    }

    // check weights sizes
    if (!_rawData.student_weights.empty() && (int)_rawData.student_weights.size() != _rawData.num_students) {
        Logger::warn("StudentWeights size (" + std::to_string((int)_rawData.student_weights.size()) + 
                    ") does not match NumStudents (" + std::to_string(_rawData.num_students) + ")");
        return false;
    }
    if (!_rawData.teacher_weights.empty() && (int)_rawData.teacher_weights.size() != _rawData.num_teachers) {
        Logger::warn("TeacherWeights size (" + std::to_string((int)_rawData.teacher_weights.size()) + 
                    ") does not match NumTeachers (" + std::to_string(_rawData.num_teachers) + ")");
        return false;
    }

    // check if any subject duration exceeds timeslots_daily
    for (int p = 0; p < (int)_rawData.subjects_duration.size(); ++p) {
        if (_rawData.subjects_duration[p] > _rawData.timeslots_daily) {
            Logger::warn("Subject " + std::to_string(p) + " duration (" + 
                        std::to_string(_rawData.subjects_duration[p]) + 
                        ") exceeds daily timeslots (" + std::to_string(_rawData.timeslots_daily) + ")");
            return false;
        }
        if (_rawData.subjects_duration[p] <= 0) {
            Logger::warn("Subject " + std::to_string(p) + " has invalid duration: " + 
                        std::to_string(_rawData.subjects_duration[p]));
            return false;
        }
    }

    // check capacity for each subject
    for (int p = 0; p < getSubjectsNum(); ++p) {
        if (_subject_total_capacity[p] < _subject_student_count[p]) {
            Logger::warn("Subject " + std::to_string(p) + " has " + std::to_string(_subject_student_count[p]) + " students but only " + std::to_string(_subject_total_capacity[p]) + " capacity. Problem is unsolvable.");
            return false;
        }
    }

    // check if total groups <= total timeslots * rooms
    int total_groups = 0;
    for (int g : _rawData.groups_per_subject) total_groups += g;
    int num_rooms = getRoomsNum();
    if (total_groups > _total_timeslots * num_rooms) {
        Logger::warn("Total groups (" + std::to_string(total_groups) + ") exceed available timeslots * rooms (" + std::to_string(_total_timeslots) + " * " + std::to_string(num_rooms) + " = " + std::to_string(_total_timeslots * num_rooms) + "). Problem is unsolvable.");
        return false;
    }
    
    // additional consistency and bounds checks to avoid runtime crashes later
    int subjectsNum = getSubjectsNum();
    int groupsNum = getGroupsNum();
    int studentsNum = getStudentsNum();
    int teachersNum = getTeachersNum();
    int roomsNumCheck = getRoomsNum();
    int tagsNum = getTagsNum();

    // check sum(groups_per_subject) equals groups_capacity size (groupsNum)
    int sum_groups_per_subject = 0;
    for (int v : _rawData.groups_per_subject) sum_groups_per_subject += v;
    if (sum_groups_per_subject != groupsNum) {
        Logger::warn("Inconsistent data: sum(groups_per_subject)=" + std::to_string(sum_groups_per_subject) + " but NumGroups=" + std::to_string(groupsNum));
        return false;
    }

    // check students_subjects ids are within [0, subjectsNum)
    for (int s = 0; s < (int)_rawData.students_subjects.size(); ++s) {
        for (int subj : _rawData.students_subjects[s]) {
            if (subj < 0 || subj >= subjectsNum) {
                Logger::warn("Invalid subject id " + std::to_string(subj) + " for student " + std::to_string(s) + " (subjectsNum=" + std::to_string(subjectsNum) + ")");
                return false;
            }
        }
    }

    // check teachers_groups ids are within [0, groupsNum)
    for (int t = 0; t < (int)_rawData.teachers_groups.size(); ++t) {
        for (int gid : _rawData.teachers_groups[t]) {
            if (gid < 0 || gid >= groupsNum) {
                Logger::warn("Invalid group id " + std::to_string(gid) + " in teachers_groups for teacher " + std::to_string(t) + " (groupsNum=" + std::to_string(groupsNum) + ")");
                return false;
            }
        }
    }

    // check groups_tags / rooms_tags ids
    for (const auto& gt : _rawData.groups_tags) {
        if (gt.empty()) continue;
        int gid = gt[0];
        if (gid < 0 || gid >= groupsNum) {
            Logger::warn("Invalid group id " + std::to_string(gid) + " in groups_tags (groupsNum=" + std::to_string(groupsNum) + ")");
            return false;
        }
        if (gt.size() > 1) {
            int tid = gt[1];
            if (tid < 0 || tid >= tagsNum) {
                Logger::warn("Invalid tag id " + std::to_string(tid) + " in groups_tags (tagsNum=" + std::to_string(tagsNum) + ")");
                return false;
            }
        }
    }
    for (const auto& rt : _rawData.rooms_tags) {
        if (rt.empty()) continue;
        int rid = rt[0];
        if (rid < 0 || rid >= roomsNumCheck) {
            Logger::warn("Invalid room id " + std::to_string(rid) + " in rooms_tags (roomsNum=" + std::to_string(roomsNumCheck) + ")");
            return false;
        }
        if (rt.size() > 1) {
            int tid = rt[1];
            if (tid < 0 || tid >= tagsNum) {
                Logger::warn("Invalid tag id " + std::to_string(tid) + " in rooms_tags (tagsNum=" + std::to_string(tagsNum) + ")");
                return false;
            }
        }
    }

    // check unavailability timeslots bounds
    for (int r = 0; r < (int)_rawData.rooms_unavailability_timeslots.size(); ++r) {
        for (int ts : _rawData.rooms_unavailability_timeslots[r]) {
            if (ts < 0 || ts >= _total_timeslots) {
                Logger::warn("Invalid timeslot " + std::to_string(ts) + " in rooms_unavailability_timeslots for room " + std::to_string(r) + " (total_timeslots=" + std::to_string(_total_timeslots) + ")");
                return false;
            }
        }
    }
    for (int s = 0; s < (int)_rawData.students_unavailability_timeslots.size(); ++s) {
        for (int ts : _rawData.students_unavailability_timeslots[s]) {
            if (ts < 0 || ts >= _total_timeslots) {
                Logger::warn("Invalid timeslot " + std::to_string(ts) + " in students_unavailability_timeslots for student " + std::to_string(s) + " (total_timeslots=" + std::to_string(_total_timeslots) + ")");
                return false;
            }
        }
    }
    for (int t = 0; t < (int)_rawData.teachers_unavailability_timeslots.size(); ++t) {
        for (int ts : _rawData.teachers_unavailability_timeslots[t]) {
            if (ts < 0 || ts >= _total_timeslots) {
                Logger::warn("Invalid timeslot " + std::to_string(ts) + " in teachers_unavailability_timeslots for teacher " + std::to_string(t) + " (total_timeslots=" + std::to_string(_total_timeslots) + ")");
                return false;
            }
        }
    }

    // check preferences sizes vs counts
    if ((int)_rawData.students_preferences.size() != studentsNum) {
        Logger::warn("Students preferences count (" + std::to_string((int)_rawData.students_preferences.size()) + ") differs from students count (" + std::to_string(studentsNum) + ")");
        // not fatal - we allow missing preferences but warn
    }
    if ((int)_rawData.teachers_preferences.size() != teachersNum) {
        Logger::warn("Teachers preferences count (" + std::to_string((int)_rawData.teachers_preferences.size()) + ") differs from teachers count (" + std::to_string(teachersNum) + ")");
        // not fatal - warn so caller can provide defaults
    }

    // check preferred_timeslots vector lengths (should be <= total_timeslots, warn otherwise)
    for (int s = 0; s < (int)_rawData.students_preferences.size(); ++s) {
        const auto& pref = _rawData.students_preferences[s];
        if ((int)pref.preferred_timeslots.size() > _total_timeslots) {
            Logger::warn("Student " + std::to_string(s) + " preferred_timeslots length (" + std::to_string((int)pref.preferred_timeslots.size()) + ") exceeds total_timeslots (" + std::to_string(_total_timeslots) + ")");
        }
        if ((int)pref.preferred_groups.size() > groupsNum) {
            Logger::warn("Student " + std::to_string(s) + " preferred_groups length (" + std::to_string((int)pref.preferred_groups.size()) + ") exceeds groupsNum (" + std::to_string(groupsNum) + ")");
        }
    }
    for (int t = 0; t < (int)_rawData.teachers_preferences.size(); ++t) {
        const auto& pref = _rawData.teachers_preferences[t];
        if ((int)pref.preferred_timeslots.size() > _total_timeslots) {
            Logger::warn("Teacher " + std::to_string(t) + " preferred_timeslots length (" + std::to_string((int)pref.preferred_timeslots.size()) + ") exceeds total_timeslots (" + std::to_string(_total_timeslots) + ")");
        }
    }

    return true;
}
