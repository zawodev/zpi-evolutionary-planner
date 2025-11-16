/* hooks/usePreferences.js */

import { useState, useEffect } from 'react';

const EMPTY_SCHEDULE = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: []
};

export const usePreferences = (recruitmentId, userId) => {
  const [scheduleData, setScheduleData] = useState(EMPTY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
            setScheduleData(data.preferences_data);
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
  }, [recruitmentId, userId]);

  const savePreferences = async () => {
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
          body: JSON.stringify(scheduleData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
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