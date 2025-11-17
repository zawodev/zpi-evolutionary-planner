import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Filter, Calendar, Clock, MapPin, BookOpen, Users, FlaskConical, MessageCircle, FileText } from 'lucide-react';

// --- Hardcoded Data ---
const allRecruitments = [
  { id: 'rec1', name: 'Rekrutacja 2025/26 (Zimowa)' },
  { id: 'rec2', name: 'Rekrutacja 2026 (Letnia)' },
  { id: 'rec3', name: 'Rekrutacja uzupełniająca 2025' },
];

const scheduleData = [
  { 
    id: 1, 
    recruitmentId: 'rec1', 
    title: 'Egzamin z Matematyki Dyskretnej', 
    type: 'Egzamin', 
    room: 'Sala 101, C-13', 
    date: '2025-11-14',
    startTime: '09:00', 
    endTime: '11:00' 
  },
  { 
    id: 2, 
    recruitmentId: 'rec2', 
    title: 'Spotkanie organizacyjne', 
    type: 'Spotkanie', 
    room: 'Online (Zoom)', 
    date: '2025-11-14',
    startTime: '13:00', 
    endTime: '14:00' 
  },
  { 
    id: 3, 
    recruitmentId: 'rec1', 
    title: 'Wykład z Algebry', 
    type: 'Wykład', 
    room: 'Aula, A-1', 
    date: '2025-11-12',
    startTime: '10:00', 
    endTime: '12:00' 
  },
  { 
    id: 4, 
    recruitmentId: 'rec1', 
    title: 'Laboratorium Bazy Danych', 
    type: 'Laboratorium', 
    room: 'Lab. 3.2, D-2', 
    date: '2025-11-13',
    startTime: '08:00', 
    endTime: '10:00' 
  },
  { 
    id: 5, 
    recruitmentId: 'rec3', 
    title: 'Rozmowa kwalifikacyjna', 
    type: 'Rozmowa', 
    room: 'Biuro Rekrutacji', 
    date: '2025-11-11',
    startTime: '11:00', 
    endTime: '11:30' 
  },
  { 
    id: 6, 
    recruitmentId: 'rec1', 
    title: 'Egzamin z Programowania', 
    type: 'Egzamin', 
    room: 'Sala 202, C-13', 
    date: '2025-11-15',
    startTime: '14:00', 
    endTime: '16:00' 
  },
];

// --- Helper Functions ---
const getWeekDays = (currDate) => {
  const week = [];
  const date = new Date(currDate);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  
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
  switch (type) {
    case 'Egzamin':
      return { className: 'type-egzamin', icon: FileText };
    case 'Spotkanie':
      return { className: 'type-spotkanie', icon: Users };
    case 'Wykład':
      return { className: 'type-wyklad', icon: BookOpen };
    case 'Laboratorium':
      return { className: 'type-laboratorium', icon: FlaskConical };
    case 'Rozmowa':
      return { className: 'type-rozmowa', icon: MessageCircle };
    default:
      return { className: 'type-default', icon: FileText };
  }
};

// --- Styles Component ---
const PlanStyles = () => (
  <style>{`
    /* --- Global & Reset --- */
    .plan-container * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    /* --- Main Container --- */
    .plan-container {
      min-height: 100vh;
      padding: 1rem;
      padding-top: 5rem; /* Extra padding for navbar */
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
    
    .plan-header-title p {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      margin: 0;
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
    
    .plan-filter-select:hover {
      background-color: #dbeafe;
      border-color: #bfdbfe;
    }
    
    .plan-filter-select:focus {
      outline: none;
      border-color: #3b82f6;
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
      border-color: #d1d5db;
    }
    
    .plan-nav-button-text {
      display: none;
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
      transition: all 0.2s;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .day-column:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .day-column.today {
      border: 2px solid #3b82f6;
      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
    }
    
    .day-column-header {
      padding: 1rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .day-column.today .day-column-header {
      background: #eff6ff;
    }
    
    .day-column-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .day-column-weekday {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
      color: #6b7280;
    }
    
    .day-column.today .day-column-weekday {
      color: #1e40af;
    }
    
    .day-column-day {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }
    
    .day-column.today .day-column-day {
      color: #1e40af;
    }
    
    .day-column-month {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
    }
    
    .day-column.today .day-column-month {
      color: #1e40af;
    }
    
    .day-column-today-badge {
      margin-top: 0.5rem;
      background-color: #3b82f6;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
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
    
    .day-column-empty p {
      font-size: 0.875rem;
      font-weight: 500;
      margin: 0;
    }

    /* --- Schedule Item --- */
    .schedule-item {
      border-radius: 0.5rem;
      padding: 0.75rem;
      transition: all 0.2s;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .schedule-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .schedule-item-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    
    .schedule-item-icon-wrapper {
      padding: 0.375rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .schedule-item-icon {
      width: 16px;
      height: 16px;
    }
    
    .schedule-item-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    
    .schedule-item-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      line-height: 1.3;
      margin-top: 0;
    }
    
    .schedule-item-details {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    
    .schedule-item-detail-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
    }
    
    .schedule-item-detail-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .schedule-item-detail-row span {
      font-weight: 500;
    }
    
    /* --- Event Type Colors (matching screenshot style) --- */
    .type-egzamin {
      background: rgba(254, 202, 202, 1);
      color: #991b1b;
    }
    .type-egzamin .schedule-item-icon-wrapper {
      background: rgba(252, 165, 165, 1);
    }
    .type-egzamin .schedule-item-badge {
      background: #dc2626;
      color: white;
    }
    
    .type-spotkanie {
      background: rgba(219, 234, 254, 1);
      color: #1e40af;
    }
    .type-spotkanie .schedule-item-icon-wrapper {
      background: rgba(191, 219, 254, 1);
    }
    .type-spotkanie .schedule-item-badge {
      background: #2563eb;
      color: white;
    }
    
    .type-wyklad {
      background: rgba(209, 250, 229, 1);
      color: #065f46;
    }
    .type-wyklad .schedule-item-icon-wrapper {
      background: rgba(167, 243, 208, 1);
    }
    .type-wyklad .schedule-item-badge {
      background: #059669;
      color: white;
    }
    
    .type-laboratorium {
      background: rgba(254, 243, 199, 1);
      color: #92400e;
    }
    .type-laboratorium .schedule-item-icon-wrapper {
      background: rgba(253, 230, 138, 1);
    }
    .type-laboratorium .schedule-item-badge {
      background: #d97706;
      color: white;
    }
    
    .type-rozmowa {
      background: rgba(243, 232, 255, 1);
      color: #6b21a8;
    }
    .type-rozmowa .schedule-item-icon-wrapper {
      background: rgba(233, 213, 255, 1);
    }
    .type-rozmowa .schedule-item-badge {
      background: #9333ea;
      color: white;
    }
    
    .type-default {
      background: rgba(243, 244, 246, 1);
      color: #374151;
    }
    .type-default .schedule-item-icon-wrapper {
      background: rgba(229, 231, 235, 1);
    }
    .type-default .schedule-item-badge {
      background: #6b7280;
      color: white;
    }

    /* --- Legend --- */
    .plan-legend-wrapper {
      margin-top: 1.5rem;
      background-color: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
    }
    
    .plan-legend-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 1rem;
      margin-top: 0;
    }
    
    .plan-legend-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
    
    .plan-legend-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
    }
    
    .plan-legend-item-icon {
      padding: 0.5rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .plan-legend-item-text {
      font-size: 0.875rem;
      font-weight: 600;
    }

    /* --- Responsive --- */
    @media (min-width: 640px) {
      .plan-nav-button-text {
        display: inline;
      }
      .calendar-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    
    @media (min-width: 768px) {
      .plan-container {
        padding: 2rem;
        padding-top: 6rem; /* Extra padding for navbar on larger screens */
      }
      .plan-header-gradient {
        padding: 2rem 2.5rem;
      }
      .plan-header-content {
        flex-direction: row;
        align-items: center;
      }
      .plan-header-title h1 {
        font-size: 2rem;
      }
      .plan-nav-center h2 {
        font-size: 1.5rem;
      }
      .plan-legend-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }
    
    @media (min-width: 1024px) {
      .calendar-grid {
        grid-template-columns: repeat(7, minmax(0, 1fr));
      }
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
          <IconComponent size={16} className="schedule-item-icon" />
        </div>
        <span className="schedule-item-badge">
          {item.type}
        </span>
      </div>
      
      <h3 className="schedule-item-title">
        {item.title}
      </h3>
      
      <div className="schedule-item-details">
        <div className="schedule-item-detail-row">
          <div className="schedule-item-detail-icon">
            <Clock size={12} />
          </div>
          <span>{item.startTime} - {item.endTime}</span>
        </div>
        <div className="schedule-item-detail-row">
          <div className="schedule-item-detail-icon">
            <MapPin size={12} />
          </div>
          <span>{item.room}</span>
        </div>
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
            <div className="day-column-weekday">
              {weekdayFormat}
            </div>
            <div className="day-column-day">
              {dayFormat}
            </div>
          </div>
          <div className="day-column-month">
            {monthFormat}
          </div>
        </div>
        {isToday && (
          <div className="day-column-today-badge">
            DZIŚ
          </div>
        )}
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
  const [currentDate, setCurrentDate] = useState(new Date('2025-11-14T12:00:00'));
  const [selectedRecruitmentId, setSelectedRecruitmentId] = useState('all');

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const filteredSchedule = useMemo(() => {
    if (selectedRecruitmentId === 'all') {
      return scheduleData;
    }
    return scheduleData.filter(item => item.recruitmentId === selectedRecruitmentId);
  }, [selectedRecruitmentId]);

  const handleNextWeek = () => {
    setCurrentDate(prevDate => {
      const nextWeek = new Date(prevDate);
      nextWeek.setDate(prevDate.getDate() + 7);
      return nextWeek;
    });
  };

  const handlePrevWeek = () => {
    setCurrentDate(prevDate => {
      const prevWeek = new Date(prevDate);
      prevWeek.setDate(prevDate.getDate() - 7);
      return prevWeek;
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
                </div>
                
                <div className="plan-filter-box">
                  <span className="plan-filter-label">Filtruj:</span>
                  <select
                    value={selectedRecruitmentId}
                    onChange={handleRecruitmentChange}
                    className="plan-filter-select"
                  >
                    <option value="all">Wszystkie rekrutacje</option>
                    {allRecruitments.map(rec => (
                      <option key={rec.id} value={rec.id}>{rec.name}</option>
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
            <button
              onClick={handlePrevWeek}
              className="plan-nav-button prev"
            >
              <ChevronLeft size={16} />
              <span className="plan-nav-button-text">Poprzedni tydzień</span>
            </button>
            
            <div className="plan-nav-center">
              <h2>
                {formatWeekHeader(weekDays[0], weekDays[6])}
              </h2>
              <div className="plan-nav-week-badge">
                Tydzień {getWeekNumber(weekDays[0])}
              </div>
            </div>

            <button
              onClick={handleNextWeek}
              className="plan-nav-button next"
            >
              <span className="plan-nav-button-text">Następny tydzień</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {weekDays.map(day => {
            const eventsForDay = filteredSchedule
              .filter(item => item.date === day.toISOString().split('T')[0])
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <DayColumn
                key={day.toISOString()}
                day={day}
                events={eventsForDay}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="plan-legend-wrapper">
          <h3 className="plan-legend-title">
            Legenda typów wydarzeń
          </h3>
          
          <div className="plan-legend-grid">
            {['Egzamin', 'Spotkanie', 'Wykład', 'Laboratorium', 'Rozmowa'].map(type => {
                const visuals = getEventVisuals(type);
                const IconComponent = visuals.icon;
                return (
                  <div key={type} className={`plan-legend-item ${visuals.className}`}>
                    <div className="plan-legend-item-icon">
                      <IconComponent size={18} />
                    </div>
                    <span className="plan-legend-item-text">{type}</span>
                  </div>
                );
            })}
          </div>
          
        </div>

      </div>
    </div>
  );
}