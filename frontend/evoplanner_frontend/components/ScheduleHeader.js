import React from "react";

export default function ScheduleHeader({ usedPriority, maxPriority }) {
  return (
    <div className="entries-header">
      <h2 className="entries-title">Wybrane Zgłoszenia: IST - Lato 2024/25</h2>
      <div className="entries-stats">
        <div className="label soft-blue">
          Punkty Priorytetu: {usedPriority}/{maxPriority}
        </div>
        <div className="label soft-yellow">
          Zamknięcie za: 3d 7h
        </div>
      </div>
    </div>
  );
}
