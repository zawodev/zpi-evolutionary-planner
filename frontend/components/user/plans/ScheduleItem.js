/* frontend/components/user/plans/ScheduleItem.js */

import React from 'react';
import { Clock, MapPin, Users, User } from 'lucide-react';
import { getEventVisuals } from '@/utils/planUtils';

const ScheduleItem = ({ item, coloringMode, onClick }) => {
  const visuals = getEventVisuals(item, coloringMode);
  const IconComponent = visuals.icon;

  return (
    <div 
      className="schedule-item"
      style={{
        backgroundColor: visuals.colors.bg,
        color: visuals.colors.text
      }}
      onClick={() => onClick(item)}
    >
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
        {item.hostName && (
          <div className="schedule-item-detail-row">
            <User size={12} />
            <span>{item.hostName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleItem;