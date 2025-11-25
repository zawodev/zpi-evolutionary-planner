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

export const usePreferences = (selectedRecruitment, userId) => {
  const [scheduleData, setScheduleData] = useState(EMPTY_SCHEDULE);
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
        } else if (response.ok) {
          const data = await response.json();
          if (data.preferences_data && 
              typeof data.preferences_data === 'object' && 
              !Array.isArray(data.preferences_data)) {
            
            const preferences = data.preferences_data;
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

  const savePreferences = async (customData = null) => {
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

    const bodyData = customData || scheduleData;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/preferences/user-preferences/${recruitmentId}/${userId}/`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyData)
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
  };

  return {
    scheduleData,
    setScheduleData,
    isLoading,
    error,
    isSaving,
    saveError,
    savePreferences,
    clearAllPreferences
  };
};