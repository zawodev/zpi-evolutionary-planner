/* frontend/evoplanner_frontend/pages/plan.js */
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Filter, Calendar, Clock, MapPin, BookOpen, Users, FlaskConical, MessageCircle, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// --- Helper Functions ---

const parseStartTime = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const timeslotToTime = (timeslot, dayStartMinutes = 0) => {
  const totalMinutes = dayStartMinutes + (timeslot * 15);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getWeekDays = (currDate) => {
  const week = [];
  const date = new Date(currDate);
  const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  
  const monday = new Date(date);
  monday.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    week.push(day);
  }
  return week;
};

const formatWeekHeader = (startDate, endDate) => {
  const options = { month: 'long', year: 'numeric' };
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startLocale = startDate.toLocaleDateString('pl-PL', options);
  const endLocale = endDate.toLocaleDateString('pl-PL', options);

  if (startLocale === endLocale) {
    return `${startDay} - ${endDay} ${startLocale}`;
  } else {
    return `${startDay} ${startLocale} - ${endDay} ${endLocale}`;
  }
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};

const getEventVisuals = (type) => {
  const typeLower = type ? type.toLowerCase() : '';
  
  if (typeLower.includes('egzamin')) return { className: 'type-egzamin', icon: FileText };
  if (typeLower.includes('wykład') || typeLower.includes('wyklad')) return { className: 'type-wyklad', icon: BookOpen };
  if (typeLower.includes('lab') || typeLower.includes('proj')) return { className: 'type-laboratorium', icon: FlaskConical };
  if (typeLower.includes('sem') || typeLower.includes('ćw')) return { className: 'type-spotkanie', icon: Users };
  if (typeLower.includes('rozmowa')) return { className: 'type-rozmowa', icon: MessageCircle };
  
  return { className: 'type-default', icon: FileText };
};

// --- Styles Component ---
const PlanStyles = () => (
  <style>{`
    /* --- Global & Reset --- */
    .plan-container * {
      box-sizing: border-box;
    }
    
    /* --- Main Container --- */
    .plan-container {
      min-height: 100vh;
      padding: 1rem;
      padding-top: 6rem;
    }
    
    .plan-wrapper {
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }

    /* --- Header --- */
    .plan-header-section {
      margin-bottom: 1.5rem;
    }
    
    .plan-header-wrapper {
      background-color: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .plan-header-gradient {
      background: white;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .plan-header-content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .plan-header-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .plan-filter-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .plan-filter-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }
    
    .plan-filter-select {
      background-color: #eff6ff;
      border: 2px solid #dbeafe;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #1e40af;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    /* --- Week Navigation --- */
    .plan-nav-wrapper {
      margin-bottom: 1.5rem;
      background-color: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1rem 1.5rem;
    }
    
    .plan-nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .plan-nav-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
      border: 1px solid #e5e7eb;
      cursor: pointer;
      background: white;
      color: #374151;
    }
    
    .plan-nav-button:hover {
      background: #f9fafb;
    }
    
    .plan-nav-center {
      text-align: center;
    }
    
    .plan-nav-center h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .plan-nav-week-badge {
      background: #dbeafe;
      color: #1e40af;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      display: inline-block;
    }

    /* --- Calendar Grid --- */
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 1rem;
    }

    /* --- Day Column --- */
    .day-column {
      border-radius: 0.75rem;
      overflow: hidden;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .day-column.today {
      border: 2px solid #3b82f6;
    }
    
    .day-column-header {
      padding: 1rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .day-column-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .day-column-weekday {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
    }
    
    .day-column-day {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }
    
    .day-column-body {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 180px;
    }
    
    .day-column-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-top: 3rem;
      color: #9ca3af;
    }
    
    .day-column-empty-icon {
      background-color: #f3f4f6;
      border-radius: 9999px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      opacity: 0.4;
    }

    /* --- Schedule Item --- */
    .schedule-item {
      border-radius: 0.5rem;
      padding: 0.75rem;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
    }
    
    .schedule-item:hover {
      transform: translateY(-2px);
    }
    
    .schedule-item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    
    .schedule-item-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin: 0 0 0.5rem 0;
    }
    
    .schedule-item-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
    }
    
    .schedule-item-detail-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* --- Colors --- */
    .type-egzamin { background: #fee2e2; color: #991b1b; }
    .type-spotkanie { background: #dbeafe; color: #1e40af; }
    .type-wyklad { background: #d1fae5; color: #065f46; }
    .type-laboratorium { background: #fef3c7; color: #92400e; }
    .type-rozmowa { background: #f3e8ff; color: #6b21a8; }
    .type-default { background: #f3f4f6; color: #374151; }

    /* --- Responsive --- */
    @media (min-width: 640px) {
      .calendar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 768px) {
      .plan-header-content { flex-direction: row; }
      .calendar-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    }
    @media (min-width: 1200px) {
      .calendar-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); }
    }
  `}</style>
);

const ScheduleItem = ({ item }) => {
  const visuals = getEventVisuals(item.type);
  const IconComponent = visuals.icon;

  return (
    <div className={`schedule-item ${visuals.className}`}>
      <div className="schedule-item-header">
        <div className="schedule-item-icon-wrapper">
          <IconComponent size={16} />
        </div>
      </div>
      
      <h3 className="schedule-item-title">
        {item.title}
      </h3>
      
      <div className="schedule-item-details">
        <div className="schedule-item-detail-row">
          <Clock size={12} />
          <span>{item.startTime} - {item.endTime}</span>
        </div>
        <div className="schedule-item-detail-row">
          <MapPin size={12} />
          <span>{item.room}</span>
        </div>
        {item.group && (
          <div className="schedule-item-detail-row">
            <Users size={12} />
            <span>{item.group}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DayColumn = ({ day, events }) => {
  const isToday = new Date().toDateString() === day.toDateString();
  const dayFormat = day.getDate();
  const monthFormat = day.toLocaleDateString('pl-PL', { month: '2-digit' });
  const weekdayFormat = day.toLocaleDateString('pl-PL', { weekday: 'short' }).toUpperCase();

  return (
    <div className={`day-column ${isToday ? 'today' : ''}`}>
      <div className={`day-column-header ${isToday ? 'today' : ''}`}>
        <div className="day-column-header-content">
          <div>
            <div className="day-column-weekday">{weekdayFormat}</div>
            <div className="day-column-day">{dayFormat}</div>
          </div>
          <div className="day-column-month">{monthFormat}</div>
        </div>
        {isToday && <div style={{marginTop:'5px', fontSize:'0.7rem', color:'#2563eb', fontWeight:'bold'}}>DZIŚ</div>}
      </div>
      
      <div className="day-column-body">
        {events.length > 0 ? (
          events.map(item => <ScheduleItem key={item.id} item={item} />)
        ) : (
          <div className="day-column-empty">
            <div className="day-column-empty-icon">
              <Calendar size={32} />
            </div>
            <p>Brak zajęć</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function PlanUzytkownika() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecruitmentId, setSelectedRecruitmentId] = useState('all');
  
  // Data states
  const [recruitments, setRecruitments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

        const meetRes = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/availability/`, { headers });
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          setMeetings(meetData);
        }

      } catch (error) {
        console.error("Błąd pobierania danych planu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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
        const meetRes = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/availability/`, { headers });
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          setMeetings(meetData);
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


      const recruitment = recruitments.find(r => r.recruitment_id === meeting.recruitment);
      const dayStartMinutes = parseStartTime(recruitment?.day_start_time);

      const startT = timeslotToTime(meeting.start_timeslot, dayStartMinutes);

      const durationBlocks = meeting.duration || 6; 
      const endT = timeslotToTime(meeting.start_timeslot + durationBlocks, dayStartMinutes);

      let eventType = 'Zajęcia';
      if (meeting.group_name) {
        const groupLower = meeting.group_name.toLowerCase();
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

      return {
        id: meeting.meeting_id,
        recruitmentId: meeting.recruitment,
        title: meeting.subject_name || 'Zajęcia',
        type: eventType,
        group: meeting.group_name || '',
        room: roomDisplay,
        date: dateStr,
        startTime: startT,
        endTime: endT
      };
    });
  }, [meetings, weekDays, recruitments]);

  // Appying Filters
  const filteredSchedule = useMemo(() => {
    let data = scheduleEvents;
    if (selectedRecruitmentId !== 'all') {
      data = data.filter(item => item.recruitmentId === selectedRecruitmentId);
    }
    return data;
  }, [scheduleEvents, selectedRecruitmentId]);

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

  return (
    <div className="plan-container">
      <PlanStyles />
      
      <div className="plan-wrapper">
        
        {/* Header Section */}
        <div className="plan-header-section">
          <div className="plan-header-wrapper">
            <div className="plan-header-gradient">
              <div className="plan-header-content">
                <div className="plan-header-title">
                  <h1>Twój Plan Tygodniowy</h1>
                  {isLoading && <p style={{fontSize: '0.9rem', color: '#6b7280'}}>Ładowanie danych z bazy...</p>}
                </div>
                
                <div className="plan-filter-box">
                  <span className="plan-filter-label">Filtruj:</span>
                  <select
                    value={selectedRecruitmentId}
                    onChange={handleRecruitmentChange}
                    className="plan-filter-select"
                    disabled={isLoading}
                  >
                    <option value="all">Wszystkie rekrutacje</option>
                    {recruitments.map(rec => (
                      <option key={rec.recruitment_id} value={rec.recruitment_id}>
                        {rec.recruitment_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="plan-nav-wrapper">
          <div className="plan-nav-content">
            <button onClick={handlePrevWeek} className="plan-nav-button prev">
              <ChevronLeft size={16} />
              <span className="plan-nav-button-text">Poprzedni tydzień</span>
            </button>
            
            <div className="plan-nav-center">
              <h2>{formatWeekHeader(weekDays[0], weekDays[6])}</h2>
              <div className="plan-nav-week-badge">
                Tydzień {getWeekNumber(weekDays[0])}
              </div>
            </div>

            <button onClick={handleNextWeek} className="plan-nav-button next">
              <span className="plan-nav-button-text">Następny tydzień</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {weekDays.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const eventsForDay = filteredSchedule
              .filter(item => item.date === dateStr)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <DayColumn
                key={dateStr}
                day={day}
                events={eventsForDay}
              />
            );
          })}
        </div>

      </div>
    </div>
  );
}