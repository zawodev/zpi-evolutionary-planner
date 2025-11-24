#pragma once
#include <vector>
#include <map>

struct StudentPreference {
    int free_days;                      // weight
    int short_days;                     // weight
    int uniform_days;                   // weight
    int concentrated_days;              // weight
    std::vector<int> min_gaps_length;   // [value, weight]
    std::vector<int> max_gaps_length;   // [value, weight]
    std::vector<int> min_day_length;    // [value, weight]
    std::vector<int> max_day_length;    // [value, weight]
    std::vector<int> preferred_day_start_timeslot; // [value, weight]
    std::vector<int> preferred_day_end_timeslot;   // [value, weight]
    std::vector<std::vector<int>> tag_order;       // [[tagAId, tagBId, weight], ...]
    std::vector<int> preferred_timeslots;  // weight for each timeslot
    std::vector<int> preferred_groups;     // weight for each group
};

struct TeacherPreference {
    int free_days;                      // weight
    int short_days;                     // weight
    int uniform_days;                   // weight
    int concentrated_days;              // weight
    std::vector<int> min_gaps_length;   // [value, weight]
    std::vector<int> max_gaps_length;   // [value, weight]
    std::vector<int> min_day_length;    // [value, weight]
    std::vector<int> max_day_length;    // [value, weight]
    std::vector<int> preferred_day_start_timeslot; // [value, weight]
    std::vector<int> preferred_day_end_timeslot;   // [value, weight]
    std::vector<std::vector<int>> tag_order;       // [[tagAId, tagBId, weight], ...]
    std::vector<int> preferred_timeslots;  // weight for each timeslot
};

struct RawProblemData {
    //Constraints
    int timeslots_daily;                                    // timeslots per day (e.g., 4 = 1 hour blocks)
    int days_in_cycle;                                      // 7, 14, or 28
    int num_subjects;
    int num_groups;
    int num_teachers;
    int num_students;
    int num_rooms;
    int num_tags;
    std::vector<int> student_weights;                       // weight for each student
    std::vector<int> teacher_weights;                       // weight for each teacher
    std::vector<int> min_students_per_group;                // minimum students required for each group to start
    std::vector<int> subjects_duration;                     // duration in timeslots for each subject
    std::vector<int> groups_per_subject;                    // number of groups for each subject
    std::vector<int> groups_capacity;                       // capacity for each group
    std::vector<int> rooms_capacity;                        // capacity for each room
    std::vector<std::vector<int>> groups_tags;              // [[groupId, tagId], ...]
    std::vector<std::vector<int>> rooms_tags;               // [[roomId, tagId], ...]
    std::vector<std::vector<int>> students_subjects;        // for each student, list of subjects they attend
    std::vector<std::vector<int>> teachers_groups;          // for each teacher, list of groups they teach
    std::vector<std::vector<int>> rooms_unavailability_timeslots;    // for each room, list of unavailable timeslots
    std::vector<std::vector<int>> students_unavailability_timeslots; // for each student, list of unavailable timeslots
    std::vector<std::vector<int>> teachers_unavailability_timeslots; // for each teacher, list of unavailable timeslots

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
    std::vector<std::vector<int>> _groups_tags_indexed;
    std::vector<std::vector<int>> _rooms_tags_indexed;
    
    bool _isFeasible;
    bool checkFeasibility() const;

public:
    ProblemData(const RawProblemData& input_data);

    // getters for raw data
    int getTimeslotsDaily() const { return _rawData.timeslots_daily; }
    int getDaysInCycle() const { return _rawData.days_in_cycle; }
    const std::vector<int>& getMinStudentsPerGroup() const { return _rawData.min_students_per_group; }
    const std::vector<int>& getSubjectsDuration() const { return _rawData.subjects_duration; }
    const std::vector<int>& getGroupsPerSubject() const { return _rawData.groups_per_subject; }
    const std::vector<int>& getGroupsCapacity() const { return _rawData.groups_capacity; }
    const std::vector<int>& getRoomsCapacity() const { return _rawData.rooms_capacity; }
    const std::vector<std::vector<int>>& getGroupsTags() const { return _rawData.groups_tags; }
    const std::vector<std::vector<int>>& getRoomsTags() const { return _rawData.rooms_tags; }
    const std::vector<std::vector<int>>& getGroupsTagsIndexed() const { return _groups_tags_indexed; }
    const std::vector<std::vector<int>>& getRoomsTagsIndexed() const { return _rooms_tags_indexed; }
    const std::vector<std::vector<int>>& getStudentsSubjects() const { return _rawData.students_subjects; }
    const std::vector<std::vector<int>>& getTeachersGroups() const { return _rawData.teachers_groups; }
    const std::vector<std::vector<int>>& getRoomsUnavailabilityTimeslots() const { return _rawData.rooms_unavailability_timeslots; }
    const std::vector<std::vector<int>>& getStudentsUnavailabilityTimeslots() const { return _rawData.students_unavailability_timeslots; }
    const std::vector<std::vector<int>>& getTeachersUnavailabilityTimeslots() const { return _rawData.teachers_unavailability_timeslots; }
    const std::vector<int>& getStudentWeights() const { return _rawData.student_weights; }
    const std::vector<int>& getTeacherWeights() const { return _rawData.teacher_weights; }
    const std::vector<StudentPreference>& getStudentsPreferences() const { return _rawData.students_preferences; }
    const std::vector<TeacherPreference>& getTeachersPreferences() const { return _rawData.teachers_preferences; }

    // calculated fields
    int getDaysNum() const { return _rawData.days_in_cycle; }
    int getSubjectsNum() const { return _rawData.num_subjects; }
    int getGroupsNum() const { return _rawData.num_groups; }
    int getStudentsNum() const { return _rawData.num_students; }
    int getTeachersNum() const { return _rawData.num_teachers; }
    int getRoomsNum() const { return _rawData.num_rooms; }
    int getTagsNum() const { return _rawData.num_tags; }
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
    void logProblemDataInfo() const;
};
