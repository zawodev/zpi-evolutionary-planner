/* frontend/evoplanner_frontend/pages/plan.js */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { formatWeekHeader, getWeekNumber } from '@/utils/planUtils';
import ScheduleColumn from '@/components/user/plans/ScheduleColumn';
import EventModal from '@/components/user/plans/EventModal';
import { usePlanSchedule } from '@/hooks/usePlanSchedule';

export default function PlanUzytkownika() {
  const { user } = useAuth();
  
  const {
    currentDate,
    weekDays,
    filteredSchedule,
    isLoading,
    recruitments,
    selectedRecruitmentId,
    coloringMode,
    selectedEvent,
    selectedMeetingData,
    handleNextWeek,
    handlePrevWeek,
    handleRecruitmentChange,
    handleColoringModeChange,
    handleEventClick,
    handleCloseModal
  } = usePlanSchedule(user);

  return (
    <div className="plan-container">
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
                
                <div className="plan-filter-container">
                  {/* Recruitment Filter */}
                  <div className="plan-filter-box">
                    <span className="plan-filter-label">
                      Rekrutacja:
                    </span>
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

                  {/* Color Mode Filter */}
                  <div className="plan-filter-box">
                    <span className="plan-filter-label">
                      Koloruj według:
                    </span>
                    <select
                      value={coloringMode}
                      onChange={handleColoringModeChange}
                      className="plan-filter-select"
                    >
                      <option value="type">Typ zajęć</option>
                      <option value="subject">Przedmiot</option>
                      <option value="room">Sala</option>
                      <option value="host">Prowadzący</option>
                      <option value="group">Grupa</option>
                    </select>
                  </div>
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
              <ScheduleColumn
                key={dateStr}
                day={day}
                events={eventsForDay}
                coloringMode={coloringMode}
                onEventClick={handleEventClick}
              />
            );
          })}
        </div>

      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventModal 
          item={selectedEvent}
          meetingData={selectedMeetingData}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}