import React from "react";

export default function ScheduleHeader({ selectedRecruitment, usedPriority, maxPriority }) {
  const recruitmentName = selectedRecruitment ? selectedRecruitment.recruitment_name : '...';
  
  // TODO: Te dane powinny pochodzić z backendu/rekrutacji
  const countdown = "3d 7h"; 

  return (
    <div className="entries-header">
      <h2 className="entries-title">Wybrane Zgłoszenia: {recruitmentName}</h2>
      <div className="entries-stats">
        <div className="label soft-blue">
          Punkty Priorytetu: {usedPriority}/{maxPriority}
        </div>
        <div className="label soft-yellow">
          Zamknięcie za: {countdown}
        </div>
      </div>
    </div>
  );
}