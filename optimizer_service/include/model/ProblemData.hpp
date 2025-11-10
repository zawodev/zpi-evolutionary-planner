#pragma once
#include <vector>
#include <map>

struct StudentPreference {
    int width_height_info;              // positive = prefer wider, negative = prefer taller
    std::vector<int> gaps_info;         // [minGaps, maxGaps, weight]
    std::vector<int> preferred_timeslots;  // weight for each timeslot (negative = avoid, positive = prefer)
    std::vector<int> preferred_groups;     // weight for each group (negative = avoid, positive = prefer)
};

struct TeacherPreference {
    int width_height_info;              // positive = prefer wider, negative = prefer taller
    std::vector<int> gaps_info;         // [minGaps, maxGaps, weight]
    std::vector<int> preferred_timeslots;  // weight for each timeslot (negative = avoid, positive = prefer)
};

struct RawProblemData {
    //Constraints
    int timeslots_daily;                                    // timeslots per day (e.g., 4 = 1 hour blocks)
    int days_in_cycle;                                      // 7, 14, or 28
    int min_students_per_group;                             // minimum students required for group to start
    std::vector<int> groups_per_subject;
    std::vector<int> groups_capacity;                       // capacity for each group
    std::vector<int> rooms_capacity;                        // capacity for each room
    std::vector<std::vector<int>> groups_tags;              // [[groupId, tagId], ...]
    std::vector<std::vector<int>> rooms_tags;               // [[roomId, tagId], ...]
    std::vector<std::vector<int>> students_subjects;
    std::vector<std::vector<int>> teachers_groups;
    std::vector<std::vector<int>> rooms_unavailability_timeslots;
    std::vector<std::vector<int>> students_unavailability_timeslots;
    std::vector<std::vector<int>> teachers_unavailability_timeslots;

    //Preferences
    std::vector<StudentPreference> students_preferences;
    std::vector<TeacherPreference> teachers_preferences;
};

class ProblemData {
private:
    RawProblemData _rawData;

    int _total_timeslots;
    int _total_student_subjects;
    std::vector<int> _subject_total_capacity;
    std::vector<int> _cumulative_groups;
    std::vector<int> _student_weights_sums;
    std::vector<int> _subject_student_count;
    
    bool _isFeasible;
    bool checkFeasibility() const;

public:
    ProblemData(const RawProblemData& input_data);

    // getters for raw data
    int getTimeslotsDaily() const { return _rawData.timeslots_daily; }
    int getDaysInCycle() const { return _rawData.days_in_cycle; }
    int getMinStudentsPerGroup() const { return _rawData.min_students_per_group; }
    const std::vector<int>& getGroupsPerSubject() const { return _rawData.groups_per_subject; }
    const std::vector<int>& getGroupsCapacity() const { return _rawData.groups_capacity; }
    const std::vector<int>& getRoomsCapacity() const { return _rawData.rooms_capacity; }
    const std::vector<std::vector<int>>& getGroupsTags() const { return _rawData.groups_tags; }
    const std::vector<std::vector<int>>& getRoomsTags() const { return _rawData.rooms_tags; }
    const std::vector<std::vector<int>>& getStudentsSubjects() const { return _rawData.students_subjects; }
    const std::vector<std::vector<int>>& getTeachersGroups() const { return _rawData.teachers_groups; }
    const std::vector<std::vector<int>>& getRoomsUnavailabilityTimeslots() const { return _rawData.rooms_unavailability_timeslots; }
    const std::vector<std::vector<int>>& getStudentsUnavailabilityTimeslots() const { return _rawData.students_unavailability_timeslots; }
    const std::vector<std::vector<int>>& getTeachersUnavailabilityTimeslots() const { return _rawData.teachers_unavailability_timeslots; }
    const std::vector<StudentPreference>& getStudentsPreferences() const { return _rawData.students_preferences; }
    const std::vector<TeacherPreference>& getTeachersPreferences() const { return _rawData.teachers_preferences; }

    // calculated fields
    int getDaysNum() const { return _rawData.days_in_cycle; }
    int getSubjectsNum() const { return (int)_rawData.groups_per_subject.size(); }
    int getGroupsNum() const { return (int)_rawData.groups_capacity.size(); }
    int getStudentsNum() const { return (int)_rawData.students_subjects.size(); }
    int getTeachersNum() const { return (int)_rawData.teachers_groups.size(); }
    int getRoomsNum() const { return (int)_rawData.rooms_unavailability_timeslots.size(); }
    int getGroupsForStudent(int studentId) const { return (int)_rawData.students_subjects[studentId].size(); }

    int totalTimeslots() const { return _total_timeslots; }
    int getTotalStudentSubjects() const { return _total_student_subjects; }
    const std::vector<int>& getSubjectTotalCapacity() const { return _subject_total_capacity; }
    const std::vector<int>& getCumulativeGroups() const { return _cumulative_groups; }
    const std::vector<int>& getStudentWeightsSums() const { return _student_weights_sums; }
    const std::vector<int>& getSubjectStudentCount() const { return _subject_student_count; }

    // more complex functions
    int getAbsoluteGroupIndex(int idx_genu, int rel_group) const;
    int getDayFromTimeslot(int timeslot) const;
    int getSubjectFromGroup(int group) const;

    bool isFeasible() const { return _isFeasible; }
};
