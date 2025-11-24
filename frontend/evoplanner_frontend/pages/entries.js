/* pages/entries.js */

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import { useRecruitments } from '../hooks/useRecruitments';
import { usePreferences } from '../hooks/usePreferences';
import { calculateUsedPriority, addSlot, updateSlot, deleteSlot, createSlotFromType, convertScheduleToWeights, convertWeightsToSchedule } from '../utils/scheduleOperations';
import { timeToMinutes } from '../utils/scheduleDisplay';

const parseTime = (timeValue) => {
  if (typeof timeValue === 'string') {
    const parts = timeValue.split(':');
    return {
      hour: parseInt(parts[0], 10) || 0,
      minute: parseInt(parts[1], 10) || 0
    };
  }
  return {
    hour: Math.floor(timeValue),
    minute: 0
  };
};

const formatTimeString = (hour, minute) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const isValidTime = (hour, minute) => {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

const getGridStartHour = (recruitment) => {
    const timeStr = recruitment?.day_start_time || "07:00";
    const parts = timeStr.split(':');
    if (parts.length > 0) {
        return parseInt(parts[0], 10);
    }
    return 7;
};

const getGridEndHour = (recruitment) => {
    const timeStr = recruitment?.day_end_time || "19:00";
    const parts = timeStr.split(':');
    if (parts.length > 0) {
        return parseInt(parts[0], 10);
    }
    return 19;
};

const calculateSlotPositionLocal = (start, end, gridStartHour) => {
  const parseTimeLocal = (time) => {
    if (typeof time === 'string') {
      const [hours, minutes = '0'] = time.split(':');
      return parseInt(hours) + parseInt(minutes) / 60;
    }
    return time;
  };

  const startHour = parseTimeLocal(start);
  const endHour = parseTimeLocal(end);
  
  const gridStart = gridStartHour;
  const hourHeight = 60;
  
  const top = (startHour - gridStart) * hourHeight;
  const height = (endHour - startHour) * hourHeight;
  
  return { top, height };
};

const getDragPreviewLocal = (isDragging, dragStart, dragEnd, dragDay, currentDay, gridStartHour) => {
  if (!isDragging || dragDay !== currentDay || !dragStart || !dragEnd) {
    return null;
  }

  const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes);
  const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes);
  
  const hourHeight = 60; 
  const gridStartMinutes = gridStartHour * 60;
  const minutesOffset = startMinutes - gridStartMinutes; 
  const top = minutesOffset * (hourHeight / 60); 
  const height = (endMinutes - startMinutes) * (hourHeight / 60);
  
  const startHour = Math.floor(startMinutes / 60);
  const startMin = startMinutes % 60;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  
  return {
    top,
    height,
    startTime: `${startHour}:${startMin.toString().padStart(2, '0')}`,
    endTime: `${endHour}:${endMin.toString().padStart(2, '0')}`
  };
};

const EntriesStyles = () => (
  <style>{`
    /* === Main Container === */
    .new-entries-container {
      min-height: 100vh;
      padding-top: 5rem;
    }

    .new-entries-content {
      max-width: 100%;
      margin: 0 auto;
    }

    .new-entries-main {
      display: flex;
      min-height: calc(100vh - 5rem);
    }

    /* === Sidebar === */
    .new-entries-sidebar {
      width: 300px;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      overflow-y: auto;
    }

    .new-entries-section {
      background: white;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .new-entries-section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 1rem 0;
    }

    .new-entries-item {
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: #eff6ff;
      border: 2px solid #dbeafe;
      color: #1e40af;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 0.5rem;
      opacity: 1;
    }

    .new-entries-item.read-only {
        background: #f3f4f6;
        border: 2px solid #e5e7eb;
        color: #6b7280;
        cursor: default;
    }

    .new-entries-item:hover:not(.read-only) {
      background: #dbeafe;
      border-color: #bfdbfe;
    }

    .new-entries-item.active:not(.read-only) {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
    }
    
    .new-entries-item.active.read-only {
        border-color: #4b5563;
        background: #e5e7eb;
        font-weight: 600;
    }

    .new-entries-item:last-child {
      margin-bottom: 0;
    }

    .new-entries-error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: #dc2626;
      margin-bottom: 0.5rem;
    }

    .new-entries-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      width: 100%;
    }

    .new-entries-btn--primary {
      background: #2563eb;
      color: white;
    }

    .new-entries-btn--primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .new-entries-btn--delete {
      background: #fee2e2;
      color: #dc2626;
    }

    .new-entries-btn--delete:hover:not(:disabled) {
      background: #fecaca;
    }

    .new-entries-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .new-entries-pt-md {
      padding-top: 0.75rem;
    }

    /* === Main Schedule Area === */
    .new-entries-schedule {
      flex: 1;
      padding: 2rem;
      overflow-x: auto;
    }

    .new-entries-loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .new-entries-loading-indicator p {
      font-size: 1rem;
      color: #6b7280;
      font-weight: 500;
    }

    /* === Schedule Header === */
    .new-entries-header {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .new-entries-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.75rem 0;
    }
    
    .new-entries-status-label {
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        display: inline-block;
    }

    .new-entries-status-label.draft {
        background: #fef9c3;
        color: #b45309;
    }

    .new-entries-status-label.completed {
        background: #e5e7eb;
        color: #4b5563;
    }

    .new-entries-stats {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .new-entries-label {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .new-entries-label.soft-blue {
      background: #dbeafe;
      color: #1e40af;
    }

    .new-entries-label.soft-yellow {
      background: #fef3c7;
      color: #92400e;
    }

    /* === Schedule Grid === */
    .new-entries-schedule-grid {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      display: flex;
      gap: 1rem;
      overflow-x: auto;
    }

    .new-entries-schedule-grid.read-only-mode {
        pointer-events: none;
        user-select: none;
        opacity: 0.8;
    }

    .new-entries-schedule-times {
      display: flex;
      flex-direction: column;
      padding-top: 40px;
      min-width: 60px;
    }

    .new-entries-schedule-time {
      height: 60px;
      display: flex;
      align-items: flex-start;
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
      padding-right: 1rem;
      border-top: 1px solid #f3f4f6;
    }

    .new-entries-schedule-week {
      flex: 1;
      min-width: 0;
    }

    .new-entries-schedule-days {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      height: 40px;
      align-items: center;
    }

    .new-entries-schedule-day {
      font-weight: 600;
      color: #1f2937;
      font-size: 0.875rem;
      text-align: center;
      text-transform: capitalize;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }

    .new-entries-schedule-calendar {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
      position: relative;
    }

    .new-entries-schedule-column {
      position: relative;
      border-left: 1px solid #f3f4f6;
      cursor: crosshair;
      user-select: none;
    }
    
    .new-entries-schedule-column:not(.read-only):hover {
      background: rgba(59, 130, 246, 0.02);
    }
    
    .new-entries-schedule-column.read-only {
        cursor: default;
    }

    .new-entries-schedule-column.dragging {
      cursor: ns-resize;
      background: rgba(59, 130, 246, 0.05);
    }

    /* ZAKTUALIZOWANE STYLE SLOTU */
    .new-entries-schedule-slot {
      position: absolute;
      left: 4px;
      right: 4px;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .new-entries-schedule-slot:hover:not(.read-only) {
      transform: translateX(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    }
    
    .new-entries-schedule-slot.read-only {
        cursor: default;
    }
    
    .new-entries-schedule-slot.read-only:hover {
        transform: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .new-entries-slot-label {
      font-weight: 600;
      line-height: 1.3;
      display: block;
      flex-shrink: 0;
    }

    .new-entries-slot-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
      margin-top: auto;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }

    .new-entries-slot-time {
      opacity: 0.9;
      font-weight: 600;
    }

    .new-entries-slot-points {
      font-weight: 700;
      opacity: 0.9;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      background: rgba(255, 255, 255, 0.3);
    }

    .new-entries-schedule-slot.prefer {
      background: rgba(209, 250, 229, 1);
      color: #065f46;
    }

    .new-entries-schedule-slot.avoid {
      background: rgba(254, 202, 202, 1);
      color: #991b1b;
    }

    .new-entries-schedule-slot-creating {
      position: absolute;
      left: 4px;
      right: 4px;
      background: rgba(59, 130, 246, 0.2);
      border: 2px dashed #3b82f6;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1e40af;
      font-weight: 600;
      pointer-events: none;
      font-size: 0.75rem;
    }

    /* === ULEPSZONE STYLE MODALA === */
    .new-entries-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .new-entries-modal-content {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 520px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .new-entries-modal-header {
      padding: 2rem 2rem 1rem 2rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .new-entries-modal-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .new-entries-modal-body {
      padding: 2rem;
    }

    .new-entries-modal-field {
      margin-bottom: 1.75rem;
    }

    .new-entries-modal-field:last-child {
      margin-bottom: 0;
    }

    .new-entries-modal-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.625rem;
      letter-spacing: 0.01em;
    }

    .new-entries-modal-field select {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 0.9375rem;
      transition: all 0.2s;
      background: white;
      cursor: pointer;
      color: #1f2937;
      font-weight: 500;
    }

    .new-entries-modal-field select:hover {
      border-color: #d1d5db;
    }

    .new-entries-modal-field select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* ZAKTUALIZOWANE INPUTY CZASU - BEZ SZAREGO TŁA */
    .new-entries-time-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .new-entries-time-input-group {
      display: flex;
      flex-direction: column;
    }

    .new-entries-time-input-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.625rem;
      letter-spacing: 0.01em;
    }

    .new-entries-time-input-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 0.25rem 0.75rem;
      transition: all 0.2s;
    }

    .new-entries-time-input-row:hover {
      border-color: #d1d5db;
    }

    .new-entries-time-input-row:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .new-entries-time-input-row input {
      flex: 1;
      padding: 0.625rem 0.5rem;
      border: none;
      font-size: 1.125rem;
      font-weight: 600;
      text-align: center;
      transition: all 0.2s;
      background: transparent;
      color: #111827;
      min-width: 0;
    }

    .new-entries-time-input-row input:focus {
      outline: none;
      color: #2563eb;
    }

    .new-entries-time-input-row input::placeholder {
      color: #d1d5db;
    }

    .new-entries-time-separator {
      font-weight: 700;
      font-size: 1.25rem;
      color: #9ca3af;
      user-select: none;
    }

    /* ULEPSZONE POLE PRIORYTETU */
    .new-entries-priority-field {
      background: #f9fafb;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .new-entries-priority-field label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .new-entries-priority-input-wrapper {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .new-entries-priority-field input {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 1.125rem;
      font-weight: 600;
      text-align: center;
      transition: all 0.2s;
      background: white;
      color: #111827;
    }

    .new-entries-priority-field input:hover {
      border-color: #d1d5db;
    }

    .new-entries-priority-field input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      color: #2563eb;
    }

    .new-entries-priority-scale {
      display: flex;
      justify-content: space-between;
      margin-top: 0.75rem;
      padding: 0 0.25rem;
    }

    .new-entries-priority-marker {
      font-size: 0.75rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .new-entries-modal-info {
      font-size: 0.875rem;
      color: #6b7280;
      background: #f0f9ff;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.75rem;
      border-left: 3px solid #3b82f6;
      line-height: 1.6;
    }

    .new-entries-modal-error {
      font-size: 0.875rem;
      color: #dc2626;
      background: #fef2f2;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.75rem;
      border-left: 3px solid #dc2626;
      font-weight: 500;
      line-height: 1.6;
    }

    .new-entries-modal-footer {
      padding: 1.5rem 2rem 2rem 2rem;
      border-top: 1px solid #f3f4f6;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .new-entries-modal-btn {
      padding: 0.875rem 1.75rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9375rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      letter-spacing: 0.01em;
    }

    .new-entries-modal-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .new-entries-modal-btn.primary {
      background: #2563eb;
      color: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .new-entries-modal-btn.primary:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .new-entries-modal-btn.primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .new-entries-modal-btn.secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .new-entries-modal-btn.secondary:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .new-entries-modal-btn.danger {
      background: #dc2626;
      color: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .new-entries-modal-btn.danger:hover:not(:disabled) {
      background: #b91c1c;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .new-entries-modal-btn.danger:active:not(:disabled) {
      transform: translateY(0);
    }

    @media (max-width: 1024px) {
      .new-entries-main {
        flex-direction: column;
      }
      .new-entries-sidebar {
        width: 100%;
      }
    }

    @media (max-width: 768px) {
      .new-entries-container {
        padding-top: 4rem;
      }
      .new-entries-schedule {
        padding: 1rem;
      }
      .new-entries-header {
        padding: 1rem;
      }
      .new-entries-title {
        font-size: 1.25rem;
      }
      .new-entries-schedule-grid {
        padding: 1rem;
      }
      .new-entries-time-inputs {
        grid-template-columns: 1fr;
      }
      .new-entries-modal-header {
        padding: 1.5rem 1.5rem 1rem 1.5rem;
      }
      .new-entries-modal-body {
        padding: 1.5rem;
      }
      .new-entries-modal-footer {
        padding: 1rem 1.5rem 1.5rem 1.5rem;
      }
    }
  `}</style>
);

const EntriesSidebar = ({ fileError, onSave, onClear, recruitments, isLoading, selectedRecruitment, onSelectRecruitment, isSaving }) => {
  const editableRecruitments = recruitments.filter(rec => rec.plan_status === 'draft' || rec.plan_status === 'active');
  const readOnlyRecruitments = recruitments.filter(rec => rec.plan_status !== 'draft' && rec.plan_status !== 'active');

  return (
    <aside className="new-entries-sidebar">
      <div className="new-entries-section">
        <h3 className="new-entries-section-title">Aktywne (do edycji):</h3>
        {isLoading && <div className="new-entries-item">Ładowanie...</div>}
        {fileError && <div className="new-entries-error-message">{fileError}</div>}
        {!isLoading && !fileError && editableRecruitments.length > 0 ? (
          editableRecruitments.map(rec => (
            <div
              key={rec.recruitment_id}
              className={`new-entries-item ${selectedRecruitment?.recruitment_id === rec.recruitment_id ? 'active' : ''}`}
              onClick={() => onSelectRecruitment(rec)}
            >
              <span>{rec.recruitment_name} ({rec.plan_status})</span>
            </div>
          ))
        ) : (
          !isLoading && !fileError && <div className="new-entries-item read-only">Brak aktywnych rekrutacji.</div>
        )}
      </div>

      <div className="new-entries-section">
        <h3 className="new-entries-section-title">Zakończone (tylko do odczytu):</h3>
        {isLoading && <div className="new-entries-item">Ładowanie...</div>}
        {!isLoading && !fileError && readOnlyRecruitments.length > 0 ? (
          readOnlyRecruitments.map(rec => (
            <div
              key={rec.recruitment_id}
              className={`new-entries-item read-only ${selectedRecruitment?.recruitment_id === rec.recruitment_id ? 'active' : ''}`}
              onClick={() => onSelectRecruitment(rec)}
            >
              <span>{rec.recruitment_name} ({rec.plan_status})</span>
            </div>
          ))
        ) : (
          !isLoading && !fileError && <div className="new-entries-item read-only">Brak zakończonych rekrutacji.</div>
        )}
      </div>

      <div className="new-entries-section">
        <h3 className="new-entries-section-title">Akcje:</h3>
        <button
          onClick={onSave}
          className="new-entries-btn new-entries-btn--primary"
          disabled={!selectedRecruitment || isSaving || !(selectedRecruitment.plan_status === 'draft' || selectedRecruitment.plan_status === 'active')}
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz Preferencje'}
        </button>
        <div className="new-entries-pt-md"></div>
        <button
          onClick={onClear}
          className="new-entries-btn new-entries-btn--delete"
          disabled={!selectedRecruitment || !(selectedRecruitment.plan_status === 'draft' || selectedRecruitment.plan_status === 'active')}
        >
          Wyczyść Preferencje
        </button>
      </div>
    </aside>
  );
};

const ScheduleHeader = ({ selectedRecruitment, usedPriority, maxPriority }) => {
  const recruitmentName = selectedRecruitment ? selectedRecruitment.recruitment_name : '...';
  const countdown = "3d 7h";
  
  const status = selectedRecruitment?.plan_status || 'brak statusu';
  const isEditable = status === 'draft' || status === 'active';

  return (
    <div className="new-entries-header">
      <h2 className="new-entries-title">Wybrane Zgłoszenia: {recruitmentName}</h2>
      <div className="new-entries-stats">
        <div className="new-entries-label soft-blue">
          Punkty Priorytetu: {usedPriority}/{maxPriority}
        </div>
        <div className="new-entries-label soft-yellow">
          {isEditable ? `Zamknięcie za: ${countdown}` : 'Rekrutacja zakończona.'}
        </div>
      </div>
    </div>
  );
};

const ScheduleSlot = ({ slot, position, onClick, isEditable }) => {
  const formatTime = (time) => {
    if (typeof time === 'string') {
      return time;
    }
    return `${time}:00`;
  };

  return (
    <div
      className={`new-entries-schedule-slot ${slot.type} ${!isEditable ? 'read-only' : ''}`}
      style={{
        top: `${position.top}px`,
        height: `${position.height}px`
      }}
      onClick={isEditable ? onClick : (e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="new-entries-slot-label">{slot.label}</span>
      <div className="new-entries-slot-details">
        <span className="new-entries-slot-time">{formatTime(slot.start)} - {formatTime(slot.end)}</span>
        <span className="new-entries-slot-points">{slot.priority}pt</span>
      </div>
    </div>
  );
};

const DragPreview = ({ top, height, startTime, endTime }) => {
  return (
    <div
      className="new-entries-schedule-slot-creating"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <span className="new-entries-slot-time">{startTime}-{endTime}</span>
    </div>
  );
};

const ScheduleColumn = ({ day, slots, dragPreview, onMouseDown, onSlotClick, isDragging, dragDay, isEditable, selectedRecruitment }) => {
  const isBeingDragged = isDragging && dragDay === day;
  
  const gridStartHour = getGridStartHour(selectedRecruitment);
  const gridEndHour = getGridEndHour(selectedRecruitment);
  const hourHeight = 60;
  const columnHeightPx = (gridEndHour - gridStartHour) * hourHeight;

  return (
    <div 
      className={`new-entries-schedule-column ${isBeingDragged ? 'dragging' : ''} ${!isEditable ? 'read-only' : ''}`}
      style={{ height: `${columnHeightPx}px` }}
      onMouseDown={(e) => {
        if (isEditable) {
            onMouseDown(e, day);
        }
      }}
    >
      {slots && slots.map((slot, slotIndex) => {
        const position = calculateSlotPositionLocal(slot.start, slot.end, gridStartHour); 
        return (
          <ScheduleSlot
            key={`${day}-${slotIndex}`}
            slot={slot}
            position={position}
            onClick={(e) => onSlotClick(e, day, slotIndex)}
            isEditable={isEditable}
          />
        );
      })}
      {dragPreview && <DragPreview {...dragPreview} />}
    </div>
  );
};

const PreferenceModal = ({ 
  mode, 
  pendingSlot, 
  editingSlot, 
  setPendingSlot, 
  setEditingSlot, 
  onClose, 
  onAdd, 
  onUpdate, 
  onDelete, 
  isEditable,
  selectedRecruitment 
}) => {
  const isEditMode = mode === 'edit';
  const currentSlot = isEditMode ? editingSlot : pendingSlot;

  const [validationError, setValidationError] = useState('');

  if (!currentSlot) return null;

  const startParsed = parseTime(currentSlot.start);
  const endParsed = parseTime(currentSlot.end);

  const [startHour, setStartHour] = useState(startParsed.hour);
  const [startMinute, setStartMinute] = useState(startParsed.minute);
  const [endHour, setEndHour] = useState(endParsed.hour);
  const [endMinute, setEndMinute] = useState(endParsed.minute);
  const [priority, setPriority] = useState(currentSlot.priority || 1);
  const [slotType, setSlotType] = useState(currentSlot.type || 'prefer');

  const gridStartHour = getGridStartHour(selectedRecruitment);
  const gridEndHour = getGridEndHour(selectedRecruitment);

  useEffect(() => {
    setValidationError('');

    if (!isValidTime(startHour, startMinute) || !isValidTime(endHour, endMinute)) {
      setValidationError('Nieprawidłowy format czasu.');
      return;
    }

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const gridStartMinutes = gridStartHour * 60;
    const gridEndMinutes = gridEndHour * 60;

    if (startTotalMinutes < gridStartMinutes || startTotalMinutes >= gridEndMinutes) {
      setValidationError(`Godzina rozpoczęcia musi być między ${gridStartHour}:00 a ${gridEndHour}:00.`);
      return;
    }

    if (endTotalMinutes <= gridStartMinutes || endTotalMinutes > gridEndMinutes) {
      setValidationError(`Godzina zakończenia musi być między ${gridStartHour}:00 a ${gridEndHour}:00.`);
      return;
    }

    if (endTotalMinutes <= startTotalMinutes) {
      setValidationError('Godzina zakończenia musi być późniejsza niż rozpoczęcia.');
      return;
    }

    if (endTotalMinutes - startTotalMinutes < 15) {
      setValidationError('Slot musi trwać co najmniej 15 minut.');
      return;
    }

    if (priority < 1 || priority > 5) {
      setValidationError('Priorytet musi być między 1 a 5.');
      return;
    }
  }, [startHour, startMinute, endHour, endMinute, priority, gridStartHour, gridEndHour]);

  const updateCurrentSlot = () => {
    const setter = isEditMode ? setEditingSlot : setPendingSlot;
    setter(prev => ({
      ...prev,
      start: formatTimeString(startHour, startMinute),
      end: formatTimeString(endHour, endMinute),
      priority: priority,
      type: slotType
    }));
  };

  useEffect(() => {
    updateCurrentSlot();
  }, [startHour, startMinute, endHour, endMinute, priority, slotType]);

  if (!isEditable && isEditMode) {
    return (
      <div className="new-entries-modal-overlay" onClick={onClose}>
        <div className="new-entries-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="new-entries-modal-header">
            <h2>Podgląd Preferencji</h2>
          </div>
          
          <div className="new-entries-modal-body">
            <div className="new-entries-modal-info">
              Edycja jest zablokowana. Rekrutacja jest zakończona.
            </div>
            <p><strong>Typ:</strong> {currentSlot.type === 'prefer' ? 'Chcę mieć zajęcia' : 'Brak zajęć'}</p>
            <p><strong>Priorytet:</strong> {currentSlot.priority}</p>
            <p><strong>Godziny:</strong> {formatTimeString(startHour, startMinute)} - {formatTimeString(endHour, endMinute)}</p>
          </div>
          
          <div className="new-entries-modal-footer">
            <button onClick={onClose} className="new-entries-modal-btn secondary">Zamknij</button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (validationError) {
      return;
    }
    if (isEditMode) {
      onUpdate();
    } else {
      onAdd();
    }
  };

  return (
    <div className="new-entries-modal-overlay" onClick={onClose}>
      <div className="new-entries-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-entries-modal-header">
          <h2>{isEditMode ? 'Edytuj Preferencję' : 'Dodaj Preferencję'}</h2>
        </div>
        
        <div className="new-entries-modal-body">
          {validationError && (
            <div className="new-entries-modal-error">
              ⚠️ {validationError}
            </div>
          )}


          {/* Typ preferencji */}
          <div className="new-entries-modal-field">
            <label>Typ:</label>
            <select
              value={slotType}
              onChange={(e) => setSlotType(e.target.value)}
              disabled={!isEditable}
            >
              <option value="prefer">✅ Chcę mieć zajęcia</option>
              <option value="avoid">❌ Brak zajęć</option>
            </select>
          </div>

          {/* Godzina rozpoczęcia */}
          <div className="new-entries-time-inputs">
            <div className="new-entries-time-input-group">
              <label>Godzina rozpoczęcia:</label>
              <div className="new-entries-time-input-row">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={startHour}
                  onChange={(e) => setStartHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  disabled={!isEditable}
                  placeholder="GG"
                />
                <span className="new-entries-time-separator">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="15"
                  value={startMinute}
                  onChange={(e) => setStartMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  disabled={!isEditable}
                  placeholder="MM"
                />
              </div>
            </div>

            {/* Godzina zakończenia */}
            <div className="new-entries-time-input-group">
              <label>Godzina zakończenia:</label>
              <div className="new-entries-time-input-row">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={endHour}
                  onChange={(e) => setEndHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  disabled={!isEditable}
                  placeholder="GG"
                />
                <span className="new-entries-time-separator">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="15"
                  value={endMinute}
                  onChange={(e) => setEndMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  disabled={!isEditable}
                  placeholder="MM"
                />
              </div>
            </div>
          </div>

          {/* Priorytet */}
          <div className="new-entries-priority-field">
            <label>Priorytet (1-5)</label>
            <div className="new-entries-priority-input-wrapper">
              <input
                type="number"
                min="1"
                max="5"
                value={priority}
                onChange={(e) => setPriority(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                disabled={!isEditable}
              />
            </div>
            <div className="new-entries-priority-scale">
              <span className="new-entries-priority-marker">1 - Niski</span>
              <span className="new-entries-priority-marker">3 - Średni</span>
              <span className="new-entries-priority-marker">5 - Wysoki</span>
            </div>
          </div>
        </div>

        <div className="new-entries-modal-footer">
          {isEditMode && (
            <button 
              onClick={onDelete} 
              className="new-entries-modal-btn danger" 
              disabled={!isEditable}
            >
              Usuń
            </button>
          )}
          <button onClick={onClose} className="new-entries-modal-btn secondary">
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="new-entries-modal-btn primary"
            disabled={!isEditable || validationError !== ''}
          >
            {isEditMode ? 'Zapisz' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  );
};

const useScheduleDragCustom = (onDragComplete, isEditable, gridStartHour, gridEndHour) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [dragDay, setDragDay] = useState(null);
  
  const getPositionInfo = (e, columnElement) => {
    if (!columnElement) {
      return { time: "NaN:NaN", minutes: NaN };
    }
    const rect = columnElement.getBoundingClientRect();
    if (!rect || typeof rect.top !== 'number' || typeof e.clientY !== 'number') {
      console.error("getPositionInfo failed to read coordinates", rect, e);
      return { time: "NaN:NaN", minutes: NaN };
    }
    
    const y = e.clientY - rect.top;
    
    const hourHeight = 60;
    const gridStart = gridStartHour;   
    const gridEnd = gridEndHour;
    const totalHeight = (gridEnd - gridStart) * hourHeight; 
    
    const clampedY = Math.max(0, Math.min(y, totalHeight));
    
    const minutesFromGridStart = (clampedY / hourHeight) * 60;
    const totalMinutes = gridStart * 60 + minutesFromGridStart;

    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    
    const minTotalMinutes = gridStart * 60;
    const maxTotalMinutes = gridEnd * 60;
    const clampedTotalMinutes = Math.max(minTotalMinutes, Math.min(roundedMinutes, maxTotalMinutes));
    
    const finalHour = Math.floor(clampedTotalMinutes / 60);
    const finalMinute = clampedTotalMinutes % 60;

    return {
      time: `${finalHour}:${finalMinute.toString().padStart(2, '0')}`,
      minutes: clampedTotalMinutes
    };
  };

  const handleMouseDown = (e, day) => {
    if (!isEditable || e.button !== 0) return;
    const column = e.currentTarget;
    const posInfo = getPositionInfo(e, column);
    if (isNaN(posInfo.minutes)) {
      setIsDragging(false);
      return;
    }
    setIsDragging(true);
    setDragDay(day);
    setDragStart(posInfo);
    setDragEnd(posInfo);
  };
  
  const handleMouseMove = (e, days) => {
    if (!isDragging || !dragDay) return;
    const columns = document.querySelectorAll('.new-entries-schedule-column');
    const dayIndex = days.indexOf(dragDay);
    const column = columns[dayIndex];
    if (column) {
      const posInfo = getPositionInfo(e, column);
      if (!isNaN(posInfo.minutes)) {
        setDragEnd(posInfo);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || !dragDay || 
        isNaN(dragStart.minutes) || isNaN(dragEnd.minutes)) {
      resetDrag();
      return;
    }
    const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes);
    const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes);
    
    if (endMinutes - startMinutes < 30) {
      resetDrag();
      return;
    }

    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.ceil(endMinutes / 60);
    
    const finalEndHour = Math.max(endHour, startHour + 1);
    const finalStartHour = startHour; 

    onDragComplete({
      day: dragDay,
      start: finalStartHour,
      end: finalEndHour
    });
    resetDrag();
  };

  const resetDrag = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragDay(null);
  };

  useEffect(() => {
    if (isDragging) {
      const moveHandler = (e) => handleMouseMove(e, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, dragEnd, dragDay, onDragComplete, isEditable, gridStartHour, gridEndHour]);

  return {
    isDragging,
    dragStart,
    dragEnd,
    dragDay,
    handleMouseDown,
    resetDrag
  };
};

export default function EntriesPage() {
  const { user } = useAuth();
  const calendarRef = useRef(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];
  
  const [selectedRecruitment, setSelectedRecruitment] = useState(null);

  const gridStartHour = getGridStartHour(selectedRecruitment);
  const gridEndHour = getGridEndHour(selectedRecruitment);
  
  const hourHeight = 60;
  const gridHeightPx = (gridEndHour - gridStartHour) * hourHeight;
  
  const hours = Array.from({ length: Math.max(0, gridEndHour - gridStartHour) }, (_, i) => {
      const hour = gridStartHour + i;
      return `${hour.toString().padStart(2, '0')}:00`;
  });

  const { 
    recruitments, 
    isLoading: isLoadingRecruitments, 
    error: recruitmentsError 
  } = useRecruitments(user?.id);
  
  const isEditable = selectedRecruitment?.plan_status === 'draft' || selectedRecruitment?.plan_status === 'active';

  const {
    scheduleData,
    setScheduleData,
    isLoading: isLoadingSchedule,
    error: preferencesError,
    isSaving,
    saveError,
    savePreferences,
    clearAllPreferences
  } = usePreferences(selectedRecruitment, user?.id);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [pendingSlot, setPendingSlot] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [maxPriority] = useState(40);

  const {
    isDragging,
    dragStart,
    dragEnd,
    dragDay,
    handleMouseDown,
    resetDrag
  } = useScheduleDragCustom((dragResult) => {
    setPendingSlot({
      day: dragResult.day,
      start: dragResult.start,
      end: dragResult.end,
      type: 'prefer',
      priority: 1
    });
    setModalMode('create');
    setShowModal(true);
  }, isEditable, gridStartHour, gridEndHour);

  const handleSave = async () => {
    if (!selectedRecruitment || !isEditable) return;
    
    const dayStart = selectedRecruitment.day_start_time || "08:00"; 
    const dayEnd = selectedRecruitment.day_end_time || "16:00";
    
    const startMin = timeToMinutes(dayStart);
    const endMin = timeToMinutes(dayEnd);
    const durationMin = endMin - startMin;
    const slotsPerDay = Math.floor(durationMin / 15);
    
    const weightsArray = convertScheduleToWeights(
        scheduleData, 
        days, 
        dayStart, 
        slotsPerDay > 0 ? slotsPerDay : 32
    );

    const newPreferencesData = {
        "FreeDays": 0, 
        "ShortDays": 0,
        "UniformDays": 0,
        "ConcentratedDays": 0,
        
        "MinGapsLength": [0, 0],
        "MaxGapsLength": [0, 0],
        
        "MinDayLength": [0, 0],
        "MaxDayLength": [0, 0],
        
        "PreferredDayStartTimeslot": [0, 0],
        "PreferredDayEndTimeslot": [0, 0],
        
        "TagOrder": [],
        
        "PreferredTimeslots": weightsArray,
        
        "PreferredGroups": [0, 0, 0, 0, 0] 
    };
    
    const finalPayload = {
        preferences_data: newPreferencesData
    };

    const success = await savePreferences(finalPayload);
    
    if (success) {
      alert('Zmiany zapisane pomyślnie!');
    }
  };

  const handleClear = () => {
    if (!isEditable) return;
    
    if (window.confirm('Czy na pewno chcesz usunąć wszystkie preferencje? Ta akcja jest nieodwracalna.')) {
      clearAllPreferences();
      alert('Wszystkie preferencje zostały wyczyszczone. Kliknij "Zachowaj zmiany", aby zapisać.');
    }
  };

  const handleSlotClick = (e, day, slotIndex) => {
    e.stopPropagation();
    const slot = scheduleData[day][slotIndex];
    if (!slot) return;

    setEditingSlot({
      ...slot,
      priority: slot.priority || 1,
      day: day,
      index: slotIndex
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleAddSlot = () => {
    if (!pendingSlot || !isEditable) return;

    const label = createSlotFromType(pendingSlot.type);
    const newSlot = {
      start: pendingSlot.start,
      end: pendingSlot.end,
      type: pendingSlot.type,
      label: label,
      priority: pendingSlot.priority || 1
    };

    setScheduleData(prev => addSlot(prev, pendingSlot.day, newSlot));
    handleCloseModal();
  };

  const handleUpdateSlot = () => {
    if (!editingSlot || !isEditable) return;

    const label = createSlotFromType(editingSlot.type);
    const updatedSlot = {
      start: editingSlot.start,
      end: editingSlot.end,
      type: editingSlot.type,
      label: label,
      priority: editingSlot.priority || 1
    };

    setScheduleData(prev => 
      updateSlot(prev, editingSlot.day, editingSlot.index, updatedSlot)
    );
    handleCloseModal();
  };

  const handleDeleteSlot = () => {
    if (!editingSlot || !isEditable) return;

    setScheduleData(prev => 
      deleteSlot(prev, editingSlot.day, editingSlot.index)
    );
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPendingSlot(null);
    setEditingSlot(null);
    resetDrag();
  };

  const displayError = recruitmentsError || preferencesError || saveError;

  return (
    <div className="new-entries-container">
      <EntriesStyles />
      
      <div className="new-entries-content">
        <div className="new-entries-main">
          <EntriesSidebar
            fileError={displayError}
            onSave={handleSave}
            onClear={handleClear}
            recruitments={recruitments}
            isLoading={isLoadingRecruitments}
            selectedRecruitment={selectedRecruitment}
            onSelectRecruitment={setSelectedRecruitment}
            isSaving={isSaving}
          />
          
          <main className="new-entries-schedule">
            {isLoadingRecruitments ? (
              <div className="new-entries-loading-indicator">
                <p>Ładowanie rekrutacji...</p>
              </div>
            ) : !selectedRecruitment ? (
              <div className="new-entries-loading-indicator">
                <p>Proszę wybrać rekrutację z listy po lewej stronie.</p>
              </div>
            ) : isLoadingSchedule ? (
              <div className="new-entries-loading-indicator">
                <p>Ładowanie preferencji dla {selectedRecruitment.recruitment_name}...</p>
              </div>
            ) : (
              <>
                <ScheduleHeader
                  selectedRecruitment={selectedRecruitment}
                  usedPriority={calculateUsedPriority(scheduleData, days)}
                  maxPriority={maxPriority}
                />
                
                <div className={`new-entries-schedule-grid ${!isEditable ? 'read-only-mode' : ''}`}>
                  <div 
                    className="new-entries-schedule-times"
                    style={{ height: `${gridHeightPx + 40}px`}}
                  >
                    {hours.map(time => (
                      <div key={time} className="new-entries-schedule-time">{time}</div>
                    ))}
                  </div>
                  
                  <div className="new-entries-schedule-week">
                    <div className="new-entries-schedule-days">
                      {dayLabels.map(day => (
                        <span key={day} className="new-entries-schedule-day">{day}</span>
                      ))}
                    </div>
                    
                    <div className="new-entries-schedule-calendar" ref={calendarRef}>
                      {days.map((day) => (
                        <ScheduleColumn
                          key={day}
                          day={day}
                          slots={(scheduleData[day] || []).filter(Boolean)}
                          dragPreview={getDragPreviewLocal(isDragging, dragStart, dragEnd, dragDay, day, gridStartHour)} 
                          onMouseDown={(e) => handleMouseDown(e, day)}
                          onSlotClick={handleSlotClick}
                          isDragging={isDragging}
                          dragDay={dragDay}
                          isEditable={isEditable}
                          selectedRecruitment={selectedRecruitment} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {showModal && (
        <PreferenceModal
          mode={modalMode}
          pendingSlot={pendingSlot}
          editingSlot={editingSlot}
          setPendingSlot={setPendingSlot}
          setEditingSlot={setEditingSlot}
          onClose={handleCloseModal}
          onAdd={handleAddSlot}
          onUpdate={handleUpdateSlot}
          onDelete={handleDeleteSlot}
          isEditable={isEditable}
          selectedRecruitment={selectedRecruitment}
        />
      )}
    </div>
  );
}