/* frontend/components/user/plans/ScheduleColumn.js */

import React from 'react';
import { Calendar } from 'lucide-react';
import ScheduleItem from './ScheduleItem';

const ScheduleColumn = ({ day, events, coloringMode, onEventClick }) => {
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
          events.map(item => (
            <ScheduleItem 
              key={item.id} 
              item={item} 
              coloringMode={coloringMode}
              onClick={onEventClick}
            />
          ))
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

export default ScheduleColumn;