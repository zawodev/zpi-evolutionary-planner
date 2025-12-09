/* frontend/hooks/useEventModal.js */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useEventModal = (meetingData, onClose) => {
  const { user } = useAuth();
  const [groupDetails, setGroupDetails] = useState(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    teachers: false,
    assistants: false,
    observers: false
  });

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!meetingData?.group?.group_id || !user) return;
      
      setIsLoadingGroup(true);
      
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        const groupRes = await fetch(
          `http://127.0.0.1:8000/api/v1/groups/${meetingData.group.group_id}/`,
          { headers }
        );
        
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupDetails(groupData);
        }
      } catch (err) {
        console.error("Error fetching group details:", err);
      } finally {
        setIsLoadingGroup(false);
      }
    };

    fetchGroupDetails();
  }, [meetingData, user]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return {
    groupDetails,
    isLoadingGroup,
    expandedSections,
    toggleSection,
    handleOverlayClick
  };
};