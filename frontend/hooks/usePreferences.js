/* hooks/usePreferences.js */

import { useState, useEffect } from 'react';
import { convertWeightsToSchedule } from '../utils/scheduleOperations'; 
import { timeToMinutes } from '../utils/scheduleDisplay'; 

const EMPTY_SCHEDULE = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: []
};

const DEFAULT_COMPLEX_PREFS = {
    FreeDays: 0,
    ShortDays: 0,
    UniformDays: 0,
    ConcentratedDays: 0,
    MinGapsLength: [0, 0],
    MaxGapsLength: [0, 0],
    MinDayLength: [0, 0],
    MaxDayLength: [0, 0],
    PreferredDayStartTimeslot: [0, 0],
    PreferredDayEndTimeslot: [0, 0],
    TagOrder: [],
    PreferredGroups: [],
};

export const usePreferences = (selectedRecruitment, userId) => {
  const [scheduleData, setScheduleData] = useState(EMPTY_SCHEDULE);
  const [complexPrefs, setComplexPrefs] = useState(DEFAULT_COMPLEX_PREFS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const recruitmentId = selectedRecruitment?.recruitment_id;

  const fetchRecruitmentConfig = (recruitment) => {
    const dayStart = recruitment?.day_start_time || "08:00";
    const dayEnd = recruitment?.day_end_time || "16:00";
    
    let timeslotsPerDay = 32;
    
    try {
        const startMin = timeToMinutes(dayStart);
        const endMin = timeToMinutes(dayEnd);
        const durationMin = endMin - startMin;
        
        if (durationMin > 0) {
            timeslotsPerDay = Math.floor(durationMin / 15);
        }
    } catch (e) {
        console.error("Error calculating timeslots:", e);
    }
    
    return {
        dayStartTime: dayStart,
        timeslotsPerDay: timeslotsPerDay
    };
  };

  useEffect(() => {
    if (!recruitmentId || !userId) {
      setScheduleData(EMPTY_SCHEDULE);
      setComplexPrefs(DEFAULT_COMPLEX_PREFS);
      return;
    }

    const fetchPreferences = async () => {
      setIsLoading(true);
      setError(null);
      setSaveError(null);
      const token = localStorage.getItem('access_token');
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      const { dayStartTime, timeslotsPerDay } = fetchRecruitmentConfig(selectedRecruitment);
      
      if (timeslotsPerDay <= 0) {
          console.warn("Recruitment data (day_start_time/day_end_time) is missing or invalid, or not yet loaded. Cannot safely load/deserialize preferences.");
          setScheduleData(EMPTY_SCHEDULE); 
          setComplexPrefs(DEFAULT_COMPLEX_PREFS);
          setIsLoading(false);
          return;
      }
      
      if (!token) {
        setError("Brak autoryzacji.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/preferences/user-preferences/${recruitmentId}/${userId}/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === 404) {
          setScheduleData(EMPTY_SCHEDULE);
          setComplexPrefs(DEFAULT_COMPLEX_PREFS);
        } else if (response.ok) {
          const data = await response.json();
          if (data.preferences_data && 
              typeof data.preferences_data === 'object' && 
              !Array.isArray(data.preferences_data)) {
            
            const preferences = data.preferences_data;

            setComplexPrefs({
                FreeDays: preferences.FreeDays ?? DEFAULT_COMPLEX_PREFS.FreeDays,
                ShortDays: preferences.ShortDays ?? DEFAULT_COMPLEX_PREFS.ShortDays,
                UniformDays: preferences.UniformDays ?? DEFAULT_COMPLEX_PREFS.UniformDays,
                ConcentratedDays: preferences.ConcentratedDays ?? DEFAULT_COMPLEX_PREFS.ConcentratedDays,
                MinGapsLength: preferences.MinGapsLength ?? DEFAULT_COMPLEX_PREFS.MinGapsLength,
                MaxGapsLength: preferences.MaxGapsLength ?? DEFAULT_COMPLEX_PREFS.MaxGapsLength,
                MinDayLength: preferences.MinDayLength ?? DEFAULT_COMPLEX_PREFS.MinDayLength,
                MaxDayLength: preferences.MaxDayLength ?? DEFAULT_COMPLEX_PREFS.MaxDayLength,
                PreferredDayStartTimeslot: preferences.PreferredDayStartTimeslot ?? DEFAULT_COMPLEX_PREFS.PreferredDayStartTimeslot,
                PreferredDayEndTimeslot: preferences.PreferredDayEndTimeslot ?? DEFAULT_COMPLEX_PREFS.PreferredDayEndTimeslot,
                TagOrder: preferences.TagOrder ?? DEFAULT_COMPLEX_PREFS.TagOrder,
                PreferredGroups: preferences.PreferredGroups ?? DEFAULT_COMPLEX_PREFS.PreferredGroups,
            });
            
            const preferredTimeslots = preferences.PreferredTimeslots;

            if (Array.isArray(preferredTimeslots) && preferredTimeslots.length > 0) {
                const schedule = convertWeightsToSchedule(
                    preferredTimeslots, 
                    days, 
                    dayStartTime, 
                    timeslotsPerDay
                );
                setScheduleData(schedule);
            } else if (preferences.monday !== undefined) {
                 setScheduleData(preferences);
            } else {
                 setScheduleData(EMPTY_SCHEDULE);
            }

          } else {
            setScheduleData(EMPTY_SCHEDULE);
            setComplexPrefs(DEFAULT_COMPLEX_PREFS);
          }
        } else {
          throw new Error(`Błąd ładowania preferencji: ${response.statusText}`);
        }
      } catch (error) {
        setError(error.message);
        console.error('Błąd ładowania preferencji:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [recruitmentId, userId, selectedRecruitment?.day_start_time, selectedRecruitment?.day_end_time]);

  const savePreferences = async (finalPayload) => { 
    if (!recruitmentId || !userId) {
      setSaveError("Nie wybrano rekrutacji lub użytkownika.");
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    const token = localStorage.getItem('access_token');

    if (!token) {
      setSaveError("Brak autoryzacji. Zaloguj się ponownie.");
      setIsSaving(false);
      return false;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/preferences/user-preferences/${recruitmentId}/${userId}/`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(finalPayload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.detail || `Błąd zapisu: ${response.statusText}`);
      }

      setSaveError(null);
      return true;
    } catch (error) {
      setSaveError(error.message);
      console.error('Błąd zapisywania preferencji:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const clearAllPreferences = () => {
    setScheduleData(EMPTY_SCHEDULE);
    setComplexPrefs(DEFAULT_COMPLEX_PREFS);
  };

  return {
    scheduleData,
    setScheduleData,
    complexPrefs,
    setComplexPrefs,
    isLoading,
    error,
    isSaving,
    saveError,
    savePreferences,
    clearAllPreferences
  };
};