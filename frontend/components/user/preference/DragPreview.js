/* components/DragPreview.js */

import React from "react";

export default function DragPreview({ top, height, startTime, endTime }) {
  return (
    <div
      className="schedule-slot schedule-slot-creating"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <span className="slot-time">{startTime}-{endTime}</span>
    </div>
  );
}

