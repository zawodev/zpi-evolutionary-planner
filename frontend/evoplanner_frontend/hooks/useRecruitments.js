/* hooks/useRecruitments.js */

import { useState, useEffect } from 'react';

export const useRecruitments = (userId) => {
  const [recruitments, setRecruitments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchRecruitments = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError("Brak autoryzacji. Zaloguj się ponownie.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/identity/users/${userId}/recruitments/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Błąd pobierania rekrutacji: ${response.statusText}`);
        }
        
        const data = await response.json();
        setRecruitments(data);
      } catch (error) {
        setError(error.message);
        console.error('Błąd pobierania rekrutacji:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecruitments();
  }, [userId]);

  return { recruitments, isLoading, error };
};