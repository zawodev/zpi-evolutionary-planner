import React from "react";

export default function ScheduleSlot({ slot, position, onClick }) {
  return (
    <div
      className={`schedule-slot ${slot.type}`}
      style={{
        top: `${position.top}px`,
        height: `${position.height}px`
      }}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="slot-label">Preferencja: {slot.label}</span>
      <div className="slot-details">
        <span className="slot-time">{slot.start}-{slot.end}</span>
        <span className="slot--label-points">
          {slot.priority}pt
        </span>
      </div>
    </div>
  );
}
