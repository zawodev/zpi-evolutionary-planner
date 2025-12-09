/* frontend/evoplanner_frontend/hooks/usePlanSchedule.js */
import { useState, useEffect, useMemo } from 'react';
import { getWeekDays } from '@/utils/planUtils';

export const usePlanSchedule = (user) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecruitmentId, setSelectedRecruitmentId] = useState('all');
  const [coloringMode, setColoringMode] = useState('type');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Data states
  const [recruitments, setRecruitments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecruitments = async () => {
      if (!user || !user.id) return;
      
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        const recRes = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/recruitments/`, { headers });
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecruitments(recData);
        }
      } catch (error) {
        console.error("Błąd pobierania rekrutacji:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecruitments();
  }, [user]);

  useEffect(() => {
    const fetchWeekData = async () => {
      if (!user || !user.id) return;
      
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        const week = getWeekDays(currentDate);
        const startDate = week[0].toISOString().split('T')[0];
        const endDate = week[6].toISOString().split('T')[0];
        
        const meetRes = await fetch(
          `http://127.0.0.1:8000/api/v1/identity/users/${user.id}/availability/?start_date=${startDate}&end_date=${endDate}`,
          { headers }
        );
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          setMeetings(meetData.results || []);
        }
      } catch (error) {
        console.error("Błąd odświeżania danych tygodnia:", error);
      }
    };

    fetchWeekData();
  }, [currentDate, user]);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const scheduleEvents = useMemo(() => {
    if (!meetings.length || !recruitments.length) return [];

    return meetings.map(meeting => {
      const eventDate = weekDays[meeting.day_of_week];
      const dateStr = eventDate ? eventDate.toISOString().split('T')[0] : 'Unknown';

      const startT = meeting.start_time ? meeting.start_time.substring(0, 5) : '00:00';
      const endT = meeting.end_time ? meeting.end_time.substring(0, 5) : '00:15';

      let eventType = 'Zajęcia';
      if (meeting.group?.group_name) {
        const groupLower = meeting.group.group_name.toLowerCase();
        if (groupLower.includes('wykład') || groupLower.includes('wyklad')) {
          eventType = 'Wykład';
        } else if (groupLower.includes('lab')) {
          eventType = 'Laboratorium';
        } else if (groupLower.includes('proj')) {
          eventType = 'Projekt';
        } else if (groupLower.includes('ćw') || groupLower.includes('cw')) {
          eventType = 'Ćwiczenia';
        } else if (groupLower.includes('sem')) {
          eventType = 'Seminarium';
        }
      }

      let roomDisplay = 'TBA';
      if (meeting.room) {
        roomDisplay = meeting.room.building_name 
          ? `${meeting.room.building_name} ${meeting.room.room_number}`
          : meeting.room.room_number || 'TBA';
      }

      let hostName = null;
      if (meeting.subject_group?.host_user) {
        const host = meeting.subject_group.host_user;
        hostName = `${host.first_name} ${host.last_name}`.trim() || host.username;
      }

      const subjectName = meeting.subject_group?.subject?.subject_name || 'Zajęcia';

      return {
        id: meeting.meeting_id,
        recruitmentId: meeting.recruitment.recruitment_id,
        title: subjectName,
        type: eventType,
        group: meeting.group?.group_name || '',
        room: roomDisplay,
        date: dateStr,
        startTime: startT,
        endTime: endT,
        hostName: hostName
      };
    });
  }, [meetings, weekDays, recruitments]);

  const filteredSchedule = useMemo(() => {
    let data = scheduleEvents;
    if (selectedRecruitmentId !== 'all') {
      data = data.filter(item => item.recruitmentId === selectedRecruitmentId);
    }
    return data;
  }, [scheduleEvents, selectedRecruitmentId]);

  const selectedMeetingData = useMemo(() => {
    if (!selectedEvent) return null;
    return meetings.find(m => m.meeting_id === selectedEvent.id);
  }, [selectedEvent, meetings]);

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleRecruitmentChange = (e) => {
    setSelectedRecruitmentId(e.target.value);
  };

  const handleColoringModeChange = (e) => {
    setColoringMode(e.target.value);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  return {
    // State values
    currentDate,
    weekDays,
    filteredSchedule,
    isLoading,
    recruitments,
    selectedRecruitmentId,
    coloringMode,
    selectedEvent,
    selectedMeetingData,
    
    // Handlers
    handleNextWeek,
    handlePrevWeek,
    handleRecruitmentChange,
    handleColoringModeChange,
    handleEventClick,
    handleCloseModal
  };
};