/* pages/entries.js - Complete with working drag-and-drop */

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import { useRecruitments } from '../hooks/useRecruitments';
import { usePreferences } from '../hooks/usePreferences';
import { calculateUsedPriority, addSlot, updateSlot, deleteSlot, createSlotFromType } from '../utils/scheduleOperations';

// Local position calculation that handles both string ("9:00") and number (9) formats
const calculateSlotPositionLocal = (start, end) => {
  const parseTime = (time) => {
    if (typeof time === 'string') {
      const [hours, minutes = '0'] = time.split(':');
      return parseInt(hours) + parseInt(minutes) / 60;
    }
    return time;
  };

  const startHour = parseTime(start);
  const endHour = parseTime(end);
  
  const gridStart = 7; // 7:00 AM
  const hourHeight = 60; // 60px per hour
  
  const top = (startHour - gridStart) * hourHeight;
  const height = (endHour - startHour) * hourHeight;
  
  return { top, height };
};

// Local getDragPreview implementation for better accuracy
const getDragPreviewLocal = (isDragging, dragStart, dragEnd, dragDay, currentDay) => {
  if (!isDragging || dragDay !== currentDay || !dragStart || !dragEnd) {
    return null;
  }

  const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes);
  const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes);
  
  const gridStart = 7; // 7:00 AM
  const hourHeight = 60; // 60px per hour
  
  // Calculate position
  const top = (startMinutes - gridStart * 60) * (hourHeight / 60);
  const height = (endMinutes - startMinutes) * (hourHeight / 60);
  
  // Format times
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

// Embedded Styles
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
    }

    .new-entries-item:hover {
      background: #dbeafe;
      border-color: #bfdbfe;
    }

    .new-entries-item.active {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
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
      height: 720px;
      border-left: 1px solid #f3f4f6;
      cursor: crosshair;
      user-select: none;
    }

    .new-entries-schedule-column:hover {
      background: rgba(59, 130, 246, 0.02);
    }

    .new-entries-schedule-column.dragging {
      cursor: ns-resize;
      background: rgba(59, 130, 246, 0.05);
    }

    .new-entries-schedule-slot {
      position: absolute;
      left: 4px;
      right: 4px;
      border-radius: 0.5rem;
      padding: 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .new-entries-schedule-slot:hover {
      transform: translateX(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    }

    .new-entries-slot-label {
      font-weight: 600;
      margin-bottom: 0.25rem;
      line-height: 1.2;
      display: block;
    }

    .new-entries-slot-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
    }

    .new-entries-slot-time {
      opacity: 0.9;
    }

    .new-entries-slot-points {
      font-weight: 600;
      opacity: 0.8;
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

    /* === Modal === */
    .new-entries-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .new-entries-modal-content {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .new-entries-modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .new-entries-modal-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .new-entries-modal-body {
      padding: 1.5rem;
    }

    .new-entries-modal-field {
      margin-bottom: 1.25rem;
    }

    .new-entries-modal-field label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .new-entries-modal-field input,
    .new-entries-modal-field select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .new-entries-modal-field input:focus,
    .new-entries-modal-field select:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .new-entries-modal-info {
      font-size: 0.875rem;
      color: #6b7280;
      background: #f9fafb;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .new-entries-modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .new-entries-modal-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .new-entries-modal-btn.primary {
      background: #2563eb;
      color: white;
    }

    .new-entries-modal-btn.primary:hover {
      background: #1d4ed8;
    }

    .new-entries-modal-btn.secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .new-entries-modal-btn.secondary:hover {
      background: #e5e7eb;
    }

    .new-entries-modal-btn.danger {
      background: #dc2626;
      color: white;
    }

    .new-entries-modal-btn.danger:hover {
      background: #b91c1c;
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
    }
  `}</style>
);

// Components
const EntriesSidebar = ({ fileError, onSave, onClear, recruitments, isLoading, selectedRecruitment, onSelectRecruitment, isSaving }) => {
  const upcomingRecruitments = recruitments.filter(rec => rec.plan_status === 'draft');
  const completedRecruitments = recruitments.filter(rec => rec.plan_status !== 'draft');

  return (
    <aside className="new-entries-sidebar">
      <div className="new-entries-section">
        <h3 className="new-entries-section-title">Nadchodzące zgłoszenia:</h3>
        {isLoading && <div className="new-entries-item">Ładowanie...</div>}
        {fileError && <div className="new-entries-error-message">{fileError}</div>}
        {!isLoading && !fileError && upcomingRecruitments.length > 0 ? (
          upcomingRecruitments.map(rec => (
            <div
              key={rec.recruitment_id}
              className={`new-entries-item ${selectedRecruitment?.recruitment_id === rec.recruitment_id ? 'active' : ''}`}
              onClick={() => onSelectRecruitment(rec)}
            >
              <span>{rec.recruitment_name}</span>
            </div>
          ))
        ) : (
          !isLoading && !fileError && <div className="new-entries-item">Brak nadchodzących rekrutacji.</div>
        )}
      </div>

      <div className="new-entries-section">
        <h3 className="new-entries-section-title">Zakończone zgłoszenia:</h3>
        {isLoading && <div className="new-entries-item">Ładowanie...</div>}
        {!isLoading && !fileError && completedRecruitments.length > 0 ? (
          completedRecruitments.map(rec => (
            <div
              key={rec.recruitment_id}
              className={`new-entries-item ${selectedRecruitment?.recruitment_id === rec.recruitment_id ? 'active' : ''}`}
              onClick={() => onSelectRecruitment(rec)}
            >
              <span>{rec.recruitment_name}</span>
            </div>
          ))
        ) : (
          !isLoading && !fileError && <div className="new-entries-item">Brak zakończonych rekrutacji.</div>
        )}
      </div>

      <div className="new-entries-section">
        <h3 className="new-entries-section-title">Akcje:</h3>
        <button
          onClick={onSave}
          className="new-entries-btn new-entries-btn--primary"
          disabled={!selectedRecruitment || isSaving}
        >
          {isSaving ? 'Zapisywanie...' : 'Zachowaj zmiany'}
        </button>
        <div className="new-entries-pt-md"></div>
        <button
          onClick={onClear}
          className="new-entries-btn new-entries-btn--delete"
          disabled={!selectedRecruitment}
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

  return (
    <div className="new-entries-header">
      <h2 className="new-entries-title">Wybrane Zgłoszenia: {recruitmentName}</h2>
      <div className="new-entries-stats">
        <div className="new-entries-label soft-blue">
          Punkty Priorytetu: {usedPriority}/{maxPriority}
        </div>
        <div className="new-entries-label soft-yellow">
          Zamknięcie za: {countdown}
        </div>
      </div>
    </div>
  );
};

const ScheduleSlot = ({ slot, position, onClick }) => {
  // Helper to format time display (handles both "9:00" strings and 9 numbers)
  const formatTime = (time) => {
    if (typeof time === 'string') {
      return time;
    }
    return `${time}:00`;
  };

  return (
    <div
      className={`new-entries-schedule-slot ${slot.type}`}
      style={{
        top: `${position.top}px`,
        height: `${position.height}px`
      }}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="new-entries-slot-label">Preferencja: {slot.label}</span>
      <div className="new-entries-slot-details">
        <span className="new-entries-slot-time">{formatTime(slot.start)}-{formatTime(slot.end)}</span>
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

const ScheduleColumn = ({ day, slots, dragPreview, onMouseDown, onSlotClick, isDragging, dragDay }) => {
  const isBeingDragged = isDragging && dragDay === day;
  
  return (
    <div 
      className={`new-entries-schedule-column ${isBeingDragged ? 'dragging' : ''}`}
      onMouseDown={(e) => {
        console.log('Mouse down on column:', day);
        onMouseDown(e, day);
      }}
    >
      {slots && slots.map((slot, slotIndex) => {
        const position = calculateSlotPositionLocal(slot.start, slot.end);
        return (
          <ScheduleSlot
            key={`${day}-${slotIndex}`}
            slot={slot}
            position={position}
            onClick={(e) => onSlotClick(e, day, slotIndex)}
          />
        );
      })}
      {dragPreview && <DragPreview {...dragPreview} />}
    </div>
  );
};

const PreferenceModal = ({ mode, pendingSlot, editingSlot, setPendingSlot, setEditingSlot, onClose, onAdd, onUpdate, onDelete }) => {
  const isEditMode = mode === 'edit';
  const currentSlot = isEditMode ? editingSlot : pendingSlot;

  if (!currentSlot) return null;

  // Helper to extract hour from start/end (which can be string "9:00" or number 9)
  const getHour = (time) => {
    if (typeof time === 'string') {
      return parseInt(time.split(':')[0]);
    }
    return time;
  };

  const startHour = getHour(currentSlot.start);
  const endHour = getHour(currentSlot.end);

  return (
    <div className="new-entries-modal-overlay" onClick={onClose}>
      <div className="new-entries-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-entries-modal-header">
          <h2>{isEditMode ? 'Edytuj Preferencję' : 'Dodaj Preferencję'}</h2>
        </div>
        
        <div className="new-entries-modal-body">
          <div className="new-entries-modal-info">
            Godziny: {startHour}:00 - {endHour}:00
          </div>

          <div className="new-entries-modal-field">
            <label>Typ:</label>
            <select
              value={currentSlot.type}
              onChange={(e) => {
                const setter = isEditMode ? setEditingSlot : setPendingSlot;
                setter(prev => ({ ...prev, type: e.target.value }));
              }}
            >
              <option value="prefer">Chcę mieć zajęcia</option>
              <option value="avoid">Brak zajęć</option>
            </select>
          </div>

          <div className="new-entries-modal-field">
            <label>Priorytet (1-5):</label>
            <input
              type="number"
              min="1"
              max="5"
              value={currentSlot.priority || 1}
              onChange={(e) => {
                const setter = isEditMode ? setEditingSlot : setPendingSlot;
                setter(prev => ({ ...prev, priority: parseInt(e.target.value) }));
              }}
            />
          </div>
        </div>

        <div className="new-entries-modal-footer">
          {isEditMode && (
            <button onClick={onDelete} className="new-entries-modal-btn danger">
              Usuń
            </button>
          )}
          <button onClick={onClose} className="new-entries-modal-btn secondary">
            Anuluj
          </button>
          <button
            onClick={isEditMode ? onUpdate : onAdd}
            className="new-entries-modal-btn primary"
          >
            {isEditMode ? 'Zapisz' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom useScheduleDrag hook (embedded and functional)
const useScheduleDragCustom = (onDragComplete) => {
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
    
    // Calculate Y position relative to column
    const y = e.clientY - rect.top;
    
    // Constants
    const hourHeight = 60; // 60px per hour in our grid
    const gridStart = 7;   // 7:00 AM
    const gridEnd = 19;    // 7:00 PM (so last hour is 18:00-19:00)
    const totalHeight = (gridEnd - gridStart) * hourHeight; // 720px total
    
    // Clamp Y to grid bounds
    const clampedY = Math.max(0, Math.min(y, totalHeight));
    
    // Calculate which hour we're in (0-11 for hours 7-18)
    const hourIndex = Math.floor(clampedY / hourHeight);
    
    // Calculate the actual hour (7-18)
    const hour = gridStart + hourIndex;
    
    // Calculate total minutes from start
    const totalMinutesFromStart = (clampedY / hourHeight) * 60;
    
    // Round to nearest 15 minutes
    const roundedMinutes = Math.round(totalMinutesFromStart / 15) * 15;
    
    // Convert back to hour and minute
    const finalHour = gridStart + Math.floor(roundedMinutes / 60);
    const finalMinute = roundedMinutes % 60;
    
    // Clamp final hour to grid bounds
    const clampedHour = Math.max(gridStart, Math.min(finalHour, gridEnd));
    
    if (isNaN(clampedHour) || isNaN(finalMinute)) {
      console.error("getPositionInfo calculated NaN for time");
      return { time: "NaN:NaN", minutes: NaN };
    }
    
    return {
      time: `${clampedHour}:${finalMinute.toString().padStart(2, '0')}`,
      minutes: clampedHour * 60 + finalMinute
    };
  };

  const handleMouseDown = (e, day) => {
    if (e.button !== 0) return;
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
    
    // Minimum 30 minutes (half hour)
    if (endMinutes - startMinutes < 30) {
      resetDrag();
      return;
    }

    // Round to nearest hour for cleaner slots
    const startHour = Math.floor(startMinutes / 60);
    const endHour = Math.ceil(endMinutes / 60);
    
    // Make sure end is at least 1 hour after start
    const finalEndHour = Math.max(endHour, startHour + 1);

    console.log('Creating slot:', {
      day: dragDay,
      start: startHour,
      end: finalEndHour,
      startMinutes,
      endMinutes
    });

    onDragComplete({
      day: dragDay,
      start: startHour,
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
  }, [isDragging, dragStart, dragEnd, dragDay]);

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
  const hours = ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  const { 
    recruitments, 
    isLoading: isLoadingRecruitments, 
    error: recruitmentsError 
  } = useRecruitments(user?.id);
  
  const [selectedRecruitment, setSelectedRecruitment] = useState(null);

  const {
    scheduleData,
    setScheduleData,
    isLoading: isLoadingSchedule,
    error: preferencesError,
    isSaving,
    saveError,
    savePreferences,
    clearAllPreferences
  } = usePreferences(selectedRecruitment?.recruitment_id, user?.id);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [pendingSlot, setPendingSlot] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [maxPriority] = useState(40);

  // FIXED: Using the embedded custom hook instead of imported one
  const {
    isDragging,
    dragStart,
    dragEnd,
    dragDay,
    handleMouseDown,
    resetDrag
  } = useScheduleDragCustom((dragResult) => {
    console.log('Drag completed:', dragResult);
    setPendingSlot({
      day: dragResult.day,
      start: dragResult.start,
      end: dragResult.end,
      type: 'prefer',
      priority: 1
    });
    setModalMode('create');
    setShowModal(true);
  });

  const handleSave = async () => {
    const success = await savePreferences();
    if (success) {
      alert('Zmiany zapisane pomyślnie!');
    }
  };

  const handleClear = () => {
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
    if (!pendingSlot) return;

    const label = createSlotFromType(pendingSlot.type);
    const newSlot = {
      start: `${pendingSlot.start}:00`, // Convert to string format
      end: `${pendingSlot.end}:00`,     // Convert to string format
      type: pendingSlot.type,
      label: label,
      priority: pendingSlot.priority || 1
    };

    setScheduleData(prev => addSlot(prev, pendingSlot.day, newSlot));
    handleCloseModal();
  };

  const handleUpdateSlot = () => {
    if (!editingSlot) return;

    const label = createSlotFromType(editingSlot.type);
    const updatedSlot = {
      start: typeof editingSlot.start === 'string' ? editingSlot.start : `${editingSlot.start}:00`,
      end: typeof editingSlot.end === 'string' ? editingSlot.end : `${editingSlot.end}:00`,
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
    if (!editingSlot) return;

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
                
                <div className="new-entries-schedule-grid">
                  <div className="new-entries-schedule-times">
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
                          dragPreview={getDragPreviewLocal(isDragging, dragStart, dragEnd, dragDay, day)}
                          onMouseDown={(e) => handleMouseDown(e, day)}
                          onSlotClick={handleSlotClick}
                          isDragging={isDragging}
                          dragDay={dragDay}
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
        />
      )}
    </div>
  );
}