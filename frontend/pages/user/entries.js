/* pages/entries.js */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { useRecruitments } from '../../hooks/useRecruitments';
import { usePreferences } from '../../hooks/usePreferences';
import { calculateUsedPriority, addSlot, updateSlot, deleteSlot, createSlotFromType, convertScheduleToWeights, convertWeightsToSchedule } from '../../utils/scheduleOperations';
import { timeToMinutes } from '../../utils/scheduleDisplay';
import { ChevronRight, Info } from 'lucide-react'; // Import icons

// --- Helper Functions ---
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

const formatTimeString = (hour, minute) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const calculateSlotPositionLocal = (start, end, gridStartHour) => {
  const parseTime = (time) => {
    if (typeof time === 'string') {
      const [hours, minutes = '0'] = time.split(':');
      return parseInt(hours) + parseInt(minutes) / 60;
    }
    return time;
  };

  const startHour = parseTime(start);
  const endHour = parseTime(end);
  
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
    startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
    endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
  };
};

const getHeatmapColor = (score) => {
  const rawWeight = score.rawWeight || 0;
  const maxPositiveWeight = Math.abs(score.maxPositiveWeight) || 1;
  const maxNegativeWeight = Math.abs(score.maxNegativeWeight) || 1;
  
  if (rawWeight > 0) {
    const normalized = Math.min(1, rawWeight / maxPositiveWeight);
    const opacity = normalized; // Od 0 do 1
    return `hsla(355, 85%, 70%, ${opacity})`; 
  } else {
    return `hsla(355, 85%, 70%, 0)`; 
  }
};

const EntriesStyles = () => (
  <style>{`
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
      background: #ffffff;
      border: 2px solid #e5e7eb;
      color: #1f2937;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 0.5rem;
      opacity: 1;
    }

    .new-entries-item.read-only {
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        color: #6b7280;
        cursor: default;
    }

    .new-entries-item:hover:not(.read-only) {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    .new-entries-item.active:not(.read-only) {
      background: #ffffff;
      border: 3px solid #3b82f6;
      border-color: #3b82f6;
      color: #1f2937;
    }
    
    .new-entries-item.active.read-only {
        border-color: #9ca3af;
        border: 3px solid #9ca3af;
        background: #f9fafb;
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

    .new-entries-btn--secondary {
      background: #8b5cf6;
      color: white;
    }

    .new-entries-btn--secondary:hover:not(:disabled) {
      background: #7c3aed;
    }

    .new-entries-btn--secondary:active:not(:disabled) {
      background: #6d28d9;
    }

    .new-entries-btn--heatmap {
      background: #8b5cf6;
      color: white;
      border: 2px solid #8b5cf6;
    }

    .new-entries-btn--heatmap:hover:not(:disabled) {
      background: #7c3aed;
      border-color: #7c3aed;
    }

    .new-entries-btn--heatmap:active:not(:disabled) {
      background: #6d28d9;
      border-color: #6d28d9;
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

    .new-entries-heatmap-cell {
      position: absolute;
      left: 4px;
      right: 4px;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: transparent;
      text-shadow: none;
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(2px);
    }

    .new-entries-heatmap-cell:hover {
      transform: scale(1.08) translateY(-2px);
      z-index: 10;
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.7);
    }

    .new-entries-heatmap-legend {
      background: white;
      border-radius: 0.875rem;
      padding: 1.25rem 1.75rem;
      margin-top: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #f3f4f6;
    }

    .new-entries-heatmap-legend-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .new-entries-heatmap-legend-gradient {
      height: 32px;
      border-radius: 0.625rem;
      background: linear-gradient(to right, 
        rgba(247, 106, 106, 1) 0%,
        rgba(255, 255, 255, 1) 100%
      );
      margin-bottom: 0.75rem;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1),
                  0 2px 4px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .new-entries-heatmap-legend-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: #6b7280;
      font-weight: 500;
    }

    .new-entries-heatmap-legend-labels span {
      padding: 0.25rem 0.5rem;
      background: #f9fafb;
      border-radius: 0.375rem;
      border: 1px solid #e5e7eb;
    }

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

    .new-entries-priority-slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .new-entries-priority-slider-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .new-entries-priority-slider-value {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1f2937;
      padding: 0.25rem 0.625rem;
      background: white;
      border-radius: 0.375rem;
      border: 1px solid #e5e7eb;
    }

    .new-entries-priority-slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      appearance: none;
      background: linear-gradient(to right, #dbeafe 0%, #3b82f6 50%, #1e40af 100%);
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .new-entries-priority-slider:hover:not(.disabled) {
      opacity: 0.9;
    }

    .new-entries-priority-slider:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .new-entries-priority-slider::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 3px solid #2563eb;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: all 0.2s;
    }

    .new-entries-priority-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }

    .new-entries-priority-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 3px solid #2563eb;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: all 0.2s;
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

    .new-entries-modal-btn.primary:hover:not(.disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .new-entries-modal-btn.primary:active:not(.disabled) {
      transform: translateY(0);
    }

    .new-entries-modal-btn.secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .new-entries-modal-btn.secondary:hover:not(.disabled) {
      background: #e5e7eb;
    }

    .new-entries-modal-btn.danger {
      background: #dc2626;
      color: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .new-entries-modal-btn.danger:hover:not(.disabled) {
      background: #b91c1c;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .new-entries-modal-btn.danger:active:not(.disabled) {
      transform: translateY(0);
    }
    
    .new-entries-input-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .modal-input {
      width: 100%;
      padding: 10px;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      outline: none;
      box-sizing: border-box;
    }

    .advanced-preferences-container {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-top: 1.5rem;
      width: 100%;
    }

    .advanced-preferences-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      padding: 0.5rem;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }

    .advanced-preferences-header:hover {
      background: #f9fafb;
    }

    .advanced-preferences-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .advanced-preferences-toggle {
      transition: transform 0.2s;
      color: #6b7280;
    }

    .advanced-preferences-toggle.expanded {
      transform: rotate(90deg);
    }

    .advanced-preferences-content {
      margin-top: 1.5rem;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
    }

    .preference-group {
      border-top: 2px solid #f3f4f6;
      padding-top: 1.5rem;
    }

    .preference-group-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #374151;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .preference-group-title::before {
      content: '';
      width: 4px;
      height: 1.25rem;
      background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
      border-radius: 2px;
    }

    .preference-item {
      margin-bottom: 1.5rem;
    }

    .preference-item:last-child {
      margin-bottom: 0;
    }

    .preference-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.375rem;
      display: block;
    }

    .preference-description {
      font-size: 0.8125rem;
      color: #6b7280;
      line-height: 1.5;
      margin-bottom: 0.875rem;
    }

    .preference-slider-container {
      background: #f9fafb;
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      border: 1px solid #e5e7eb;
    }

    .preference-slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .preference-slider-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .preference-slider-value {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1f2937;
      padding: 0.25rem 0.625rem;
      background: white;
      border-radius: 0.375rem;
      border: 1px solid #e5e7eb;
    }

    .preference-slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      appearance: none;
      background: linear-gradient(to right, 
        #ef4444 0%, 
        #f59e0b 35%, 
        #9ca3af 50%, 
        #a3e635 65%, 
        #22c55e 100%
      );
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .preference-slider:hover {
      opacity: 0.9;
    }

    .preference-slider:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .preference-slider::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 3px solid #3b82f6;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: all 0.2s;
    }

    .preference-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }

    .preference-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 3px solid #3b82f6;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: all 0.2s;
    }

    .preference-slider-markers {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      padding: 0 0.25rem;
    }

    .preference-slider-marker {
      font-size: 0.6875rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .preference-complex-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .preference-input-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .preference-input-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .preference-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: all 0.2s;
      background: white;
      color: #1f2937;
    }

    .preference-input:hover:not(.disabled) {
      border-color: #d1d5db;
    }

    .preference-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .preference-input:disabled {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .preference-hint {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.5rem;
      line-height: 1.5;
    }

    .preference-hint strong {
      color: #1f2937;
      font-weight: 600;
    }

    .advanced-preferences-info {
      background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
      border: 1px solid #bfdbfe;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 0.75rem;
      grid-column: 1 / -1;
    }

    .advanced-preferences-info-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      color: #3b82f6;
    }

    .advanced-preferences-info-text {
      font-size: 0.8125rem;
      line-height: 1.6;
      color: #1e40af;
    }

    .advanced-preferences-info-text strong {
      font-weight: 700;
    }

    .new-entries-loading-panel {
      padding: 20px;
      margin-top: 15px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
      display: flex;
      flex-direction: column;
      gap: 15px;
      animation: pulse-border 1.5s infinite alternate;
    }
    
    @keyframes pulse-border {
        from { border: 2px solid #3b82f633; }
        to { border: 2px solid #3b82f688; }
    }

    .new-entries-progress-bar-wrapper {
      background: #bfdbfe;
      border-radius: 8px;
      overflow: hidden;
      height: 16px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .new-entries-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563eb, #3b82f6);
      transition: width 0.5s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .new-entries-progress-text {
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .new-entries-remaining-time {
      text-align: center;
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e40af;
      margin: 0;
    }

    @media (max-width: 1200px) {
      .advanced-preferences-content {
        grid-template-columns: 1fr;
      }
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
      .advanced-preferences-content {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .preference-complex-inputs {
        grid-template-columns: 1fr;
      }
      .advanced-preferences-container {
        padding: 1rem;
      }
    }
  `}</style>
);

const ChevronRightIcon = ({ size, style, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const InfoIcon = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const WEIGHT_LABELS = {
  '-5': 'Duża niechęć',
  '-3': 'Średnia niechęć',
  '0': 'Neutralne',
  '3': 'Średnia chęć',
  '5': 'Duża chęć',
};

const SimplePreferenceInput = ({ title, weight, onWeightChange, description, isEditable }) => {
    return (
        <div className="preference-item">
            <label className="preference-label">{title}</label>
            <p className="preference-description">{description}</p>
            <div className="preference-slider-container">
                <div className="preference-slider-header">
                    <span className="preference-slider-label">Waga</span>
                    <span className="preference-slider-value">
                        {weight} ({WEIGHT_LABELS[weight] || 'Niestandardowa'})
                    </span>
                </div>
                <input
                    type="range"
                    min="-5"
                    max="5"
                    step="1"
                    value={weight}
                    onChange={(e) => onWeightChange(parseInt(e.target.value))}
                    className="preference-slider"
                    disabled={!isEditable}
                />
                <div className="preference-slider-markers">
                    <span className="preference-slider-marker">-5</span>
                    <span className="preference-slider-marker">0</span>
                    <span className="preference-slider-marker">5</span>
                </div>
            </div>
        </div>
    );
};

const ComplexPreferenceInput = ({ 
    title, 
    value, 
    weight, 
    onValueChange, 
    onWeightChange, 
    description, 
    min, 
    max, 
    step, 
    unit,
    isEditable 
}) => {
    const isNeutral = weight === 0;

    return (
        <div className="preference-item">
            <label className="preference-label">{title}</label>
            <p className="preference-description">{description}</p>
            
            <div className="preference-complex-inputs">
                <div className="preference-input-group">
                    <label className="preference-input-label">Wartość ({unit})</label>
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onValueChange(parseInt(e.target.value) || 0)}
                        className="preference-input"
                        disabled={!isEditable || isNeutral}
                    />
                </div>
                <div className="preference-input-group">
                    <label className="preference-input-label">Waga</label>
                    <input
                        type="range"
                        min="-5"
                        max="5"
                        step="1"
                        value={weight}
                        onChange={(e) => onWeightChange(parseInt(e.target.value))}
                        className="preference-slider"
                        disabled={!isEditable}
                    />
                    <div className="preference-slider-markers">
                        <span className="preference-slider-marker">-5</span>
                        <span className="preference-slider-marker">0</span>
                        <span className="preference-slider-marker">5</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdvancedPreferencesSection = ({ complexPrefs, setComplexPrefs, isEditable }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const lengthUnit = "bloków (15 min)";
    const slotUnit = "slotów (15 min)";

    const updateSimpleWeight = (key, weight) => {
        if (isEditable) {
            setComplexPrefs(prev => ({ ...prev, [key]: weight }));
        }
    };

    const updateComplexValue = (key, index, value) => {
        if (isEditable) {
            setComplexPrefs(prev => {
                const newArray = [...(prev[key] || [0, 0])];
                newArray[index] = value;
                if (newArray.length < 2) {
                    newArray.push(0);
                }
                return { ...prev, [key]: newArray };
            });
        }
    };

    return (
        <div className="advanced-preferences-container">
            <div 
                className="advanced-preferences-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="advanced-preferences-title">
                    Zaawansowane Preferencje
                </h3>
                <ChevronRightIcon 
                    size={20} 
                    className={`advanced-preferences-toggle ${isExpanded ? 'expanded' : ''}`}
                />
            </div>
            
            {isExpanded && (
                <div className="advanced-preferences-content">
                    <div className="advanced-preferences-info">
                        <InfoIcon size={20} className="advanced-preferences-info-icon" />
                        <div className="advanced-preferences-info-text">
                            Ustaw wagi dla preferencji. <strong>5</strong> to silna <strong>preferencja</strong>, 
                            <strong> -5</strong> to silna <strong>niechęć</strong>, <strong>0</strong> to neutralność.
                        </div>
                    </div>

                    {/* GRUPA 1: Ogólne Wagi Dnia */}
                    <div className="preference-group">
                        <h4 className="preference-group-title">Ogólne Wagi Dnia</h4>
                        
                        <SimplePreferenceInput 
                            title="Dni wolne (FreeDays)"
                            weight={complexPrefs.FreeDays}
                            onWeightChange={(w) => updateSimpleWeight('FreeDays', w)}
                            description="Jak bardzo chcesz mieć całkowicie wolne dni (ujemna wartość promuje codzienną aktywność)."
                            isEditable={isEditable}
                        />
                        
                        <SimplePreferenceInput 
                            title="Krótkie dni (ShortDays)"
                            weight={complexPrefs.ShortDays}
                            onWeightChange={(w) => updateSimpleWeight('ShortDays', w)}
                            description="Preferencja dni z małą liczbą godzin (ujemna promuje długie dni)."
                            isEditable={isEditable}
                        />
                        
                        <SimplePreferenceInput 
                            title="Równomierne obciążenie (UniformDays)"
                            weight={complexPrefs.UniformDays}
                            onWeightChange={(w) => updateSimpleWeight('UniformDays', w)}
                            description="Chęć, by każdy dzień pracy miał podobną liczbę godzin."
                            isEditable={isEditable}
                        />
                        
                        <SimplePreferenceInput 
                            title="Skupienie dni (ConcentratedDays)"
                            weight={complexPrefs.ConcentratedDays}
                            onWeightChange={(w) => updateSimpleWeight('ConcentratedDays', w)}
                            description="Chęć grupowania dni pracujących i dni wolnych."
                            isEditable={isEditable}
                        />
                    </div>
                    
                    {/* GRUPA 2: Precyzyjne Ramy Czasowe i Przerwy */}
                    <div className="preference-group">
                        <h4 className="preference-group-title">Precyzyjne Ramy Czasowe i Przerwy</h4>

                        <ComplexPreferenceInput
                            title="Minimalna przerwa (MinGapsLength)"
                            value={complexPrefs.MinGapsLength[0]}
                            weight={complexPrefs.MinGapsLength[1]}
                            onValueChange={(v) => updateComplexValue('MinGapsLength', 0, v)}
                            onWeightChange={(w) => updateComplexValue('MinGapsLength', 1, w)}
                            description="Minimalna pożądana długość przerwy między zajęciami."
                            min={0}
                            max={32} 
                            step={1}
                            unit={lengthUnit}
                            isEditable={isEditable}
                        />

                        <ComplexPreferenceInput
                            title="Maksymalna przerwa (MaxGapsLength)"
                            value={complexPrefs.MaxGapsLength[0]}
                            weight={complexPrefs.MaxGapsLength[1]}
                            onValueChange={(v) => updateComplexValue('MaxGapsLength', 0, v)}
                            onWeightChange={(w) => updateComplexValue('MaxGapsLength', 1, w)}
                            description="Maksymalna tolerowana długość okienka. Pomaga unikać zbyt długiego czekania."
                            min={0}
                            max={32}
                            step={1}
                            unit={lengthUnit}
                            isEditable={isEditable}
                        />

                        <ComplexPreferenceInput
                            title="Minimalna długość dnia (MinDayLength)"
                            value={complexPrefs.MinDayLength[0]}
                            weight={complexPrefs.MinDayLength[1]}
                            onValueChange={(v) => updateComplexValue('MinDayLength', 0, v)}
                            onWeightChange={(w) => updateComplexValue('MinDayLength', 1, w)}
                            description="Minimalna liczba czasu spędzonego na zajęciach w dniu. Pomocne dla dojeżdżających."
                            min={0}
                            max={32}
                            step={1}
                            unit={lengthUnit}
                            isEditable={isEditable}
                        />
                        
                        <ComplexPreferenceInput
                            title="Maksymalna długość dnia (MaxDayLength)"
                            value={complexPrefs.MaxDayLength[0]}
                            weight={complexPrefs.MaxDayLength[1]}
                            onValueChange={(v) => updateComplexValue('MaxDayLength', 0, v)}
                            onWeightChange={(w) => updateComplexValue('MaxDayLength', 1, w)}
                            description="Preferowana maksymalna liczba godzin zajęć w jednym dniu."
                            min={0}
                            max={32}
                            step={1}
                            unit={lengthUnit}
                            isEditable={isEditable}
                        />
                        
                        <ComplexPreferenceInput
                            title="Preferowany początek dnia (PreferredDayStartTimeslot)"
                            value={complexPrefs.PreferredDayStartTimeslot[0]}
                            weight={complexPrefs.PreferredDayStartTimeslot[1]}
                            onValueChange={(v) => updateComplexValue('PreferredDayStartTimeslot', 0, v)}
                            onWeightChange={(w) => updateComplexValue('PreferredDayStartTimeslot', 1, w)}
                            description="Numer slotu rozpoczęcia pierwszych zajęć (0 to początek dnia)."
                            min={0}
                            max={31} 
                            step={1}
                            unit={slotUnit}
                            isEditable={isEditable}
                        />

                        <ComplexPreferenceInput
                            title="Preferowany koniec dnia (PreferredDayEndTimeslot)"
                            value={complexPrefs.PreferredDayEndTimeslot[0]}
                            weight={complexPrefs.PreferredDayEndTimeslot[1]}
                            onValueChange={(v) => updateComplexValue('PreferredDayEndTimeslot', 0, v)}
                            onWeightChange={(w) => updateComplexValue('PreferredDayEndTimeslot', 1, w)}
                            description="Numer slotu zakończenia ostatnich zajęć dnia."
                            min={0}
                            max={31}
                            step={1}
                            unit={slotUnit}
                            isEditable={isEditable}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


const EntriesSidebar = ({ 
  fileError, 
  onSave, 
  onClear, 
  recruitments, 
  isLoading, 
  selectedRecruitment, 
  onSelectRecruitment, 
  isSaving,
  onHeatmapMouseDown,
  onHeatmapMouseUp,
  showingHeatmap
}) => {
    const editableRecruitments = recruitments.filter(rec => rec.plan_status === 'draft' || rec.plan_status === 'optimizing');
    const readOnlyRecruitments = recruitments.filter(rec => rec.plan_status !== 'draft' && rec.plan_status !== 'optimizing');
    
    const isEditableNow = selectedRecruitment?.plan_status === 'draft' || selectedRecruitment?.plan_status === 'optimizing';

    return (
        <aside className="new-entries-sidebar">
            <div className="new-entries-section">
                <h3 className="new-entries-section-title"> Otwarte</h3>
                {isLoading && <div className="new-entries-item">Ładowanie...</div>}
                {fileError && <div className="new-entries-error-message">{fileError}</div>}
                {!isLoading && !fileError && editableRecruitments.length > 0 ? (
                    editableRecruitments.map(rec => {
                        const getStatusBadge = (status) => {
                            switch(status) {
                                case 'draft': return { label: 'szkic', color: '#fef9c3', textColor: '#92400e' };
                                case 'active': return { label: 'W użyciu', color: '#bbf7d0', textColor: '#065f46' };
                                case 'optimizing': return { label: 'opt.', color: '#bbf7d0', textColor: '#065f46'};
                                default: return { label: status, color: '#e5e7eb', textColor: '#374151' };
                            }
                        };
                        const badge = getStatusBadge(rec.plan_status);
                        return (
                            <div
                                key={rec.recruitment_id}
                                className={`new-entries-item ${selectedRecruitment?.recruitment_id === rec.recruitment_id ? 'active' : ''} ${!isEditableNow ? 'read-only' : ''}`}
                                onClick={() => onSelectRecruitment(rec)}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'}}
                            >
                                <span style={{flex: 1}}>{rec.recruitment_name}</span>
                                <span style={{background: badge.color, color: badge.textColor, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap'}}>
                                    {badge.label}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    !isLoading && !fileError && <div className="new-entries-item read-only">Brak aktywnych rekrutacji.</div>
                )}
            </div>

            <div className="new-entries-section">
                <h3 className="new-entries-section-title">Zamknięte</h3>
                {isLoading && <div className="new-entries-item">Ładowanie...</div>}
                {!isLoading && !fileError && readOnlyRecruitments.length > 0 ? (
                    readOnlyRecruitments.map(rec => {
                        const getStatusBadge = (status) => {
                            switch(status) {
                                case 'active': return { label: 'akt.', color: '#fecaca', textColor: '#991b1b' };
                                case 'completed': return { label: 'Ukończona', color: '#d1d5db', textColor: '#374151' };
                                case 'failed': return { label: 'Błąd', color: '#fee2e2', textColor: '#dc2626' };
                                case 'cancelled': return { label: 'Anulowana', color: '#e0e7ff', textColor: '#3730a3' };
                                case 'archived': return { label: 'arch.', color: '#f3f4f6', textColor: '#6b7280' };
                                default: return { label: status, color: '#e5e7eb', textColor: '#374151' };
                            }
                        };
                        const badge = getStatusBadge(rec.plan_status);
                        return (
                            <div
                                key={rec.recruitment_id}
                                className={`new-entries-item read-only ${selectedRecruitment?.recruitment_id === rec.recruitment_id ? 'active' : ''}`}
                                onClick={() => onSelectRecruitment(rec)}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'}}
                            >
                                <span style={{flex: 1}}>{rec.recruitment_name}</span>
                                <span style={{background: badge.color, color: badge.textColor, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap'}}>
                                    {badge.label}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    !isLoading && !fileError && <div className="new-entries-item read-only">Brak zakończonych rekrutacji.</div>
                )}
            </div>
        </aside>
    );
};

const ScheduleHeader = ({ 
  selectedRecruitment, 
  usedPriority, 
  maxPriority, 
  optimizationStatus,
  isLoadingStatus,
  timeUntilNextJob,
  isSaving,
  onSave,
  onClear,
  onHeatmapMouseDown,
  onHeatmapMouseUp,
  showingHeatmap
}) => {
  const recruitmentName = selectedRecruitment ? selectedRecruitment.recruitment_name : '...';
  
  const status = selectedRecruitment?.plan_status || 'brak statusu';
  const isOptimizationActive = status === 'optimizing';
  const isStatusAvailable = optimizationStatus && !isLoadingStatus;

  // Live countdown timer and progress
  const [liveCountdown, setLiveCountdown] = React.useState({
    totalRemaining: 0,
    currentJobRemaining: 0
  });
  
  const [liveProgress, setLiveProgress] = React.useState(0);
  const [lastApiUpdate, setLastApiUpdate] = React.useState(null);

  React.useEffect(() => {
    if (isStatusAvailable) {
      // Initialize countdown and progress from API data
      setLiveCountdown({
        totalRemaining: optimizationStatus.estimates.total_remaining_seconds,
        currentJobRemaining: optimizationStatus.estimates.current_job_remaining_seconds
      });
      setLiveProgress(optimizationStatus.meta.now_progress);
      setLastApiUpdate(Date.now()); // Mark that we received new data
    }
  }, [optimizationStatus, isStatusAvailable]);

  React.useEffect(() => {
    if (!isStatusAvailable) return;

    // Update countdown and progress every second
    const interval = setInterval(() => {
      setLiveCountdown(prev => ({
        totalRemaining: Math.max(0, prev.totalRemaining - 1),
        currentJobRemaining: Math.max(0, prev.currentJobRemaining - 1)
      }));
      
      // Calculate live progress based on current time
      if (optimizationStatus?.meta?.start_date && optimizationStatus?.meta?.estimated_end_date) {
        const startTime = new Date(optimizationStatus.meta.start_date).getTime();
        const endTime = new Date(optimizationStatus.meta.estimated_end_date).getTime();
        const nowTime = Date.now();
        const totalSpan = endTime - startTime;
        
        if (totalSpan > 0) {
          const elapsed = nowTime - startTime;
          const progress = Math.max(0, Math.min(1, elapsed / totalSpan));
          setLiveProgress(progress);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStatusAvailable, optimizationStatus]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak';
    try {
      return new Date(dateString).toLocaleDateString('pl-PL', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Błąd daty';
    }
  };

  const formatRemainingTime = (seconds) => {
    if (typeof seconds !== 'number' || seconds < 0) return 'Brak';
    const totalSeconds = Math.floor(seconds);
    
    // If less than 60 minutes, show minutes and seconds
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      }
      return `${secs}s`;
    }
    
    // Otherwise show hours and minutes
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    
    return `${minutes}m`;
  };

  const getStatusLabel = (status) => {
      switch (status) {
          case 'draft': return 'Draft';
          case 'active': return 'W użyciu';
          case 'optimizing': return 'Optymalizacja w toku';
          case 'completed': return 'Zakończona (sukces)';
          case 'failed': return 'Zakończona (błąd)';
          case 'cancelled': return 'Anulowana';
          case 'archived': return 'Zarchiwizowana';
          default: return 'Nieznany status';
      }
  };

  const isEditable = status === 'draft' || status === 'active' || status === 'optimizing';
  
  const showProgressPanel = isOptimizationActive && (isLoadingStatus || isStatusAvailable);


  return (
    <div className="new-entries-header">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px'}}>
        <h2 className="new-entries-title">Wybrana Rekrutacja: {recruitmentName}</h2>
        
        <div style={{display: 'flex', gap: '8px'}}>
          <button
              onMouseDown={onHeatmapMouseDown}
              onMouseUp={onHeatmapMouseUp}
              onMouseLeave={onHeatmapMouseUp}
              onTouchStart={onHeatmapMouseDown}
              onTouchEnd={onHeatmapMouseUp}
              className="new-entries-btn new-entries-btn--heatmap"
              disabled={!selectedRecruitment}
              style={{width: 'auto', padding: '0.5rem 1rem'}}
          >
              {showingHeatmap ? 'Wyświetlanie Heatmapy' : 'Pokaż Heatmapę'}
          </button>
          
          <button
              onClick={onSave}
              className="new-entries-btn new-entries-btn--primary"
              disabled={!selectedRecruitment || isSaving || !isEditable}
              style={{width: 'auto', padding: '0.5rem 1rem'}}
          >
              {isSaving ? 'Zapisywanie...' : 'Zachowaj'}
          </button>
          
          <button
              onClick={onClear}
              className="new-entries-btn new-entries-btn--delete"
              disabled={!selectedRecruitment || !isEditable}
              style={{width: 'auto', padding: '0.5rem 1rem'}}
          >
              Wyczyść
          </button>
        </div>
      </div>

      <div className="new-entries-stats" style={{flexDirection: 'column', gap: '20px'}}>

        {/* Sekcja 1: Podstawowe informacje o rekrutacji */}
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <div className="new-entries-label soft-blue">
                Status: <span style={{fontWeight: 'bold'}}>{getStatusLabel(status)}</span>
            </div>
            <div className="new-entries-label soft-blue">
                Punkty Priorytetu: <span style={{fontWeight: 'bold'}}>{usedPriority}</span>
            </div>
            <div className="new-entries-label soft-blue">
                Edycja: <span style={{fontWeight: 'bold'}}>{isEditable ? 'Włączona' : 'Wyłączona'}</span>
            </div>
        </div>

        {/* Panel Ładowania - W trakcie optymalizacji (tylko optimizing) */}
        {showProgressPanel && (
            <div className="new-entries-loading-panel" key={`progress-${lastApiUpdate}`}>
                {isLoadingStatus ? (
                     <p className="new-entries-remaining-time" style={{color: '#92400e'}}>Ładowanie metryk optymalizacji...</p>
                ) : (
                    <>
                        {/* Nagłówek z głównymi informacjami */}
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                            <div>
                                <span style={{fontSize: '0.85rem', color: '#374151', fontWeight: '500'}}>
                                    Postęp: <strong style={{color: '#1f2937'}}>{optimizationStatus.counts.current}/{optimizationStatus.counts.total}</strong>
                                </span>
                            </div>
                            <div>
                                <span style={{fontSize: '0.85rem', color: '#374151', fontWeight: '500'}}>
                                    Czas do końca: <strong style={{color: '#1f2937'}}>{formatRemainingTime(liveCountdown.totalRemaining)}</strong>
                                </span>
                            </div>
                        </div>
                        
                        {/* Pasek postępu z segmentami jobów */}
                        <div className="new-entries-progress-bar-wrapper" style={{position: 'relative', marginBottom: '8px'}}>
                            {/* Główny pasek bazowy */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#e5e7eb',
                                borderRadius: '8px'
                            }}></div>
                            
                            {/* Segmenty dla każdego joba */}
                            {optimizationStatus.timeline && optimizationStatus.timeline.map((event, idx) => {
                                // Determine segment type based on live progress position
                                const segmentMiddle = (event.start + event.end) / 2;
                                let effectiveType = event.type;
                                
                                // Override type based on current progress
                                if (liveProgress > event.end) {
                                    effectiveType = 'past'; // Progress bar has passed this segment
                                } else if (liveProgress >= event.start && liveProgress <= event.end) {
                                    effectiveType = 'current'; // Progress bar is within this segment
                                } else {
                                    effectiveType = 'future'; // Progress bar hasn't reached this yet
                                }
                                
                                const getSegmentColor = (type) => {
                                    if (type === 'past') return 'rgba(59, 130, 246, 0.4)'; // niebieski z opacity - zakończone
                                    if (type === 'current') return '#3b82f6'; // pełny niebieski - w trakcie
                                    return '#d1d5db'; // jasny szary - przyszłe
                                };
                                
                                const getSegmentBorder = (type) => {
                                    if (type === 'current') return '2px solid #2563eb';
                                    return '1px solid rgba(255,255,255,0.4)';
                                };
                                
                                return (
                                    <div 
                                        key={idx}
                                        style={{
                                            position: 'absolute',
                                            left: `${event.start * 100}%`,
                                            width: `${(event.end - event.start) * 100}%`,
                                            height: '100%',
                                            backgroundColor: getSegmentColor(effectiveType),
                                            border: getSegmentBorder(effectiveType),
                                            boxSizing: 'border-box',
                                            transition: 'all 0.3s ease'
                                        }}
                                        title={`Job ${idx + 1}: ${effectiveType === 'past' ? 'Zakończony' : effectiveType === 'current' ? 'W trakcie' : 'Planowany'}`}
                                    />
                                );
                            })}
                            
                            {/* Znacznik aktualnego momentu (NOW) */}
                            <div 
                                style={{
                                    position: 'absolute',
                                    left: `${liveProgress * 100}%`,
                                    top: '-4px',
                                    bottom: '-4px',
                                    width: '3px',
                                    backgroundColor: '#dc2626',
                                    borderRadius: '2px',
                                    zIndex: 10,
                                    boxShadow: '0 0 4px rgba(220, 38, 38, 0.5)'
                                }}
                                title="Obecny moment"
                            />
                        </div>
                        
                        {/* Dodatkowe informacje */}
                        <div style={{display: 'flex', justifyContent: 'flex-start', fontSize: '0.75rem', color: '#6b7280'}}>
                            <span>
                                Obecny job: <strong>{formatRemainingTime(liveCountdown.currentJobRemaining)}</strong> do końca
                            </span>
                        </div>
                    </>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

const ScheduleSlot = ({ slot, position, onClick, isEditable }) => {
  const formatTime = (time) => {
    if (typeof time === 'string') {
      const parts = time.split(':');
      if (parts.length === 2) {
        const hour = parts[0].padStart(2, '0');
        const minute = parts[1].padStart(2, '0');
        return `${hour}:${minute}`;
      }
      return time;
    }
    return `${time.toString().padStart(2, '0')}:00`;
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


const HeatmapCell = ({ hour, score, gridStartHour }) => {
  const hourHeight = 60;
  const top = (hour - gridStartHour) * hourHeight;
  const height = hourHeight;
  
  const backgroundColor = getHeatmapColor(score);
  const rawWeight = score.rawWeight || 0;

  return (
    <div
      className="new-entries-heatmap-cell"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: backgroundColor
      }}
      title={`Średnia Waga: ${rawWeight.toFixed(2)}`}
    >
    </div>
  );
};

const ScheduleColumn = ({ 
  day, 
  slots, 
  dragPreview, 
  onMouseDown, 
  onSlotClick, 
  isDragging, 
  dragDay, 
  isEditable, 
  selectedRecruitment,
  showingHeatmap,
  heatmapData,
  gridStartHour
}) => {
  const isBeingDragged = isDragging && dragDay === day;
  
  const gridEndHour = getGridEndHour(selectedRecruitment);
  const hourHeight = 60;
  const columnHeightPx = (gridEndHour - gridStartHour) * hourHeight;

  const dayMapping = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4
  };
  
  const dayOfWeek = dayMapping[day];
  
  const dayHeatmapData = showingHeatmap && heatmapData 
    ? heatmapData.filter(item => item.day_of_week === dayOfWeek)
    : [];

  return (
    <div 
      className={`new-entries-schedule-column ${isBeingDragged ? 'dragging' : ''} ${!isEditable ? 'read-only' : ''}`}
      style={{ height: `${columnHeightPx}px` }}
      onMouseDown={(e) => {
        if (isEditable && !showingHeatmap) {
            onMouseDown(e, day);
        }
      }}
    >
      {showingHeatmap ? (
        dayHeatmapData.map((item, index) => (
          <HeatmapCell
            key={`heatmap-${day}-${item.hour}-${index}`}
            hour={item.hour}
            score={item}
            gridStartHour={gridStartHour}
          />
        ))
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

const HeatmapLegend = () => {
  return (
    <div className="new-entries-heatmap-legend">
      <div className="new-entries-heatmap-legend-title">Legenda popularności:</div>
      <div className="new-entries-heatmap-legend-gradient"></div>
      <div className="new-entries-heatmap-legend-labels">
        <span>Duże zainteresowanie (Czerwień)</span>
        <span>Brak zainteresowania (Biel)</span>
      </div>
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

  const PRIORITY_LABELS = {
    1: 'Bardzo niski',
    2: 'Niski',
    3: 'Średni',
    4: 'Wysoki',
    5: 'Bardzo wysoki'
  };

  if (!currentSlot) return null;
  
  const parseTimeLocal = (timeValue) => {
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

  const startParsed = parseTimeLocal(currentSlot.start);
  const endParsed = parseTimeLocal(currentSlot.end);

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

    const currentStartHour = parseInt(startHour);
    const currentStartMinute = parseInt(startMinute);
    const currentEndHour = parseInt(endHour);
    const currentEndMinute = parseInt(endMinute);

    if (isNaN(currentStartHour) || isNaN(currentStartMinute) || isNaN(currentEndHour) || isNaN(currentEndMinute)) {
        setValidationError('Nieprawidłowy format czasu.');
        return;
    }

    if (currentStartHour < 0 || currentStartHour > 23 || currentStartMinute < 0 || currentStartMinute > 59 ||
        currentEndHour < 0 || currentEndHour > 23 || currentEndMinute < 0 || currentEndMinute > 59) {
        setValidationError('Nieprawidłowa wartość godziny/minuty.');
        return;
    }

    const startTotalMinutes = currentStartHour * 60 + currentStartMinute;
    const endTotalMinutes = currentEndHour * 60 + currentEndMinute;
    const gridStartMinutes = gridStartHour * 60;
    const gridEndMinutes = gridEndHour * 60;

    if (startTotalMinutes < gridStartMinutes || startTotalMinutes >= gridEndMinutes) {
      setValidationError(`Godzina rozpoczęcia musi być między ${gridStartHour.toString().padStart(2, '0')}:00 a ${gridEndHour.toString().padStart(2, '0')}:00.`);
      return;
    }

    if (endTotalMinutes <= gridStartMinutes || endTotalMinutes > gridEndMinutes) {
      setValidationError(`Godzina zakończenia musi być między ${gridStartHour.toString().padStart(2, '0')}:00 a ${gridEndHour.toString().padStart(2, '0')}:00.`);
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
            <p><strong>Priorytet:</strong> {currentSlot.priority} - {PRIORITY_LABELS[currentSlot.priority]}</p>
            <p><strong>Godziny:</strong> {startHour.toString().padStart(2, '0')}:{startMinute.toString().padStart(2, '0')} - {endHour.toString().padStart(2, '0')}:{endMinute.toString().padStart(2, '0')}</p>
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

  const handleHourChange = (value, setter) => {
    const numValue = parseInt(value) || 0;
    setter(Math.max(0, Math.min(23, numValue)));
  };

  const handleMinuteChange = (value, setter) => {
    const numValue = parseInt(value) || 0;
    setter(Math.max(0, Math.min(59, numValue)));
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
              {validationError}
            </div>
          )}
          
          <div className="new-entries-modal-field">
            <label>Typ:</label>
            <select
              value={slotType}
              onChange={(e) => setSlotType(e.target.value)}
              disabled={!isEditable}
            >
              <option value="prefer">Chcę mieć zajęcia</option>
              <option value="avoid">Brak zajęć</option>
            </select>
          </div>

          <div className="new-entries-time-inputs">
            <div className="new-entries-time-input-group">
              <label>Godzina rozpoczęcia:</label>
              <div className="new-entries-time-input-row">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={startHour.toString().padStart(2, '0')}
                  onChange={(e) => handleHourChange(e.target.value, setStartHour)}
                  disabled={!isEditable}
                  placeholder="GG"
                />
                <span className="new-entries-time-separator">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="15"
                  value={startMinute.toString().padStart(2, '0')}
                  onChange={(e) => handleMinuteChange(e.target.value, setStartMinute)}
                  disabled={!isEditable}
                  placeholder="MM"
                />
              </div>
            </div>

            <div className="new-entries-time-input-group">
              <label>Godzina zakończenia:</label>
              <div className="new-entries-time-input-row">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={endHour.toString().padStart(2, '0')}
                  onChange={(e) => handleHourChange(e.target.value, setEndHour)}
                  disabled={!isEditable}
                  placeholder="GG"
                />
                <span className="new-entries-time-separator">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="15"
                  value={endMinute.toString().padStart(2, '0')}
                  onChange={(e) => handleMinuteChange(e.target.value, setEndMinute)}
                  disabled={!isEditable}
                  placeholder="MM"
                />
              </div>
            </div>
          </div>

          <div className="new-entries-priority-field">
            <div className="new-entries-priority-slider-header">
            <label>Priorytet</label>
              <span className="new-entries-priority-slider-value">
                {priority} - {PRIORITY_LABELS[priority]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="new-entries-priority-slider"
              disabled={!isEditable}
            />
            <div className="new-entries-priority-scale">
              <span className="new-entries-priority-marker">1</span>
              <span className="new-entries-priority-marker">3</span>
              <span className="new-entries-priority-marker">5</span>
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
      time: `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`,
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
    
    if (endMinutes - startMinutes < 15) {
      resetDrag();
      return;
    }
    
    const startHour = Math.floor(startMinutes / 60);
    const startMinute = startMinutes % 60;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60; 
    
    onDragComplete({
      day: dragDay,
      start: formatTimeString(startHour, startMinute),
      end: formatTimeString(endHour, endMinute),
    });
    resetDrag();
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

  const resetDrag = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragDay(null);
  };

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
  const [showingHeatmap, setShowingHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState(null); 
  const [isLoadingStatus, setIsLoadingStatus] = useState(false); 

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
  
  const isEditable = selectedRecruitment?.plan_status === 'draft' || 
                     selectedRecruitment?.plan_status === 'active' || 
                     selectedRecruitment?.plan_status === 'optimizing';

  const {
    scheduleData,
    setScheduleData,
    complexPrefs,
    setComplexPrefs,
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
  
  const [timeUntilNextJob, setTimeUntilNextJob] = useState(0);

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

const processWeightsToHeatmap = (weightsArray, gridStartHour, days) => {
    if (!weightsArray || weightsArray.length === 0) return [];

    const normalizedWeights = weightsArray.map(w => parseFloat(w) || 0);
    
    const maxPositiveWeight = Math.max(0, ...normalizedWeights);
    const maxNegativeWeight = Math.min(0, ...normalizedWeights);
    
    const maxAbsWeight = Math.max(maxPositiveWeight, Math.abs(maxNegativeWeight));

    const timeslotsInCycle = normalizedWeights.length;
    const timeslotsPerDay = timeslotsInCycle / days.length;
    
    const slotsPerHour = 4;

    const processedData = [];
    
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const startSlotIndex = dayIndex * timeslotsPerDay;
        const endSlotIndex = startSlotIndex + timeslotsPerDay;

        for (let slotIndexInDay = 0; slotIndexInDay < timeslotsPerDay; slotIndexInDay += slotsPerHour) {
            
            const globalSlotIndex = startSlotIndex + slotIndexInDay;
            
            let hourlyWeight = 0;
            for (let i = 0; i < slotsPerHour; i++) {
                if (globalSlotIndex + i < endSlotIndex) {
                    hourlyWeight += normalizedWeights[globalSlotIndex + i];
                }
            }

            const averageWeight = hourlyWeight / slotsPerHour;
            
            const hour = gridStartHour + Math.floor(slotIndexInDay / slotsPerHour);
            
            if (hour < gridEndHour) {
                processedData.push({
                    day_of_week: dayIndex,
                    hour: hour,
                    rawWeight: averageWeight,
                    maxPositiveWeight: maxAbsWeight,
                    maxNegativeWeight: maxAbsWeight,
                });
            }
        }
    }
    return processedData;
};

const fetchHeatmap = async (recruitmentId) => {
  if (!recruitmentId) return;
  
  setIsLoadingHeatmap(true);
  try {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
    const url = `${baseUrl}/api/v1/preferences/aggregate-preferred-timeslots/${recruitmentId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const weightsArray = await response.json();
    
    const processedData = processWeightsToHeatmap(weightsArray, gridStartHour, days);
    
    setHeatmapData(processedData);
  } catch (error) {
    console.error('Error fetching heatmap:', error);
    alert(`Błąd podczas pobierania danych heatmapy: ${error.message}`);
    setHeatmapData(null);
  } finally {
    setIsLoadingHeatmap(false);
  }
};

  const handleHeatmapMouseDown = () => {
    if (!selectedRecruitment) return;
    
    setShowingHeatmap(true);
    
    if (!heatmapData || heatmapData.recruitmentId !== selectedRecruitment.recruitment_id) {
      fetchHeatmap(selectedRecruitment.recruitment_id);
  }
};

const handleHeatmapMouseUp = () => {
  setShowingHeatmap(false);
};

  useEffect(() => {
    const status = selectedRecruitment?.plan_status;
    
    if (!selectedRecruitment || status === 'draft' || status === 'active' || status === 'archived') {
        setOptimizationStatus(null);
        return;
    }
    
    const fetchOptimizationStatus = async () => {
        setIsLoadingStatus(true);
        setOptimizationStatus(null);
        const recruitmentId = selectedRecruitment.recruitment_id;
        const token = localStorage.getItem('access_token');
        const baseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
        const url = `${baseUrl}/api/v1/optimizer/jobs/recruitment/${recruitmentId}/status/`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setOptimizationStatus(data);
                setTimeUntilNextJob(data.current_job_estimated_to_next_job_start || 0);
            } else if (response.status === 404) {
                 setOptimizationStatus({
                     plan_status: selectedRecruitment.plan_status,
                     jobs_count: 0,
                     max_round_execution_time: selectedRecruitment.max_round_execution_time || 300,
                     estimated_to_end_time: 0,
                     pessimistic_progress_text: '0/0',
                     optimization_start_date: selectedRecruitment.optimization_start_date
                 });
            } else {
                console.error(`Błąd ładowania statusu optymalizacji: ${response.statusText}`);
                setOptimizationStatus(null);
            }
        } catch (error) {
            console.error('Error fetching optimization status:', error);
            setOptimizationStatus(null);
        } finally {
            setIsLoadingStatus(false);
        }
    };
    
    fetchOptimizationStatus();
    
    // Refresh optimization status every 15 seconds for sync
    if (status === 'optimizing') {
        const refreshInterval = setInterval(() => {
            fetchOptimizationStatus();
        }, 15000); // 15 seconds
        
        return () => clearInterval(refreshInterval);
    }
  }, [selectedRecruitment]);

  useEffect(() => {
    if (!optimizationStatus || optimizationStatus.plan_status !== 'optimizing') {
      return;
    }

    const interval = setInterval(() => {
      setTimeUntilNextJob(prev => {
        const newValue = Math.max(0, prev - 1);
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [optimizationStatus]);


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
    "FreeDays": complexPrefs.FreeDays,
    "ShortDays": complexPrefs.ShortDays,
    "UniformDays": complexPrefs.UniformDays,
    "ConcentratedDays": complexPrefs.ConcentratedDays,
    
    "MinGapsLength": complexPrefs.MinGapsLength,
    "MaxGapsLength": complexPrefs.MaxGapsLength,
    
    "MinDayLength": complexPrefs.MinDayLength,
    "MaxDayLength": complexPrefs.MaxDayLength,
    
    "PreferredDayStartTimeslot": complexPrefs.PreferredDayStartTimeslot,
    "PreferredDayEndTimeslot": complexPrefs.PreferredDayEndTimeslot,
    
    "TagOrder": complexPrefs.TagOrder,
    
    "PreferredTimeslots": weightsArray,
    
    "PreferredGroups": complexPrefs.PreferredGroups, 
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
         onHeatmapMouseDown={handleHeatmapMouseDown}
         onHeatmapMouseUp={handleHeatmapMouseUp}
         showingHeatmap={showingHeatmap}
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
              optimizationStatus={optimizationStatus} 
              isLoadingStatus={isLoadingStatus}
              timeUntilNextJob={timeUntilNextJob}
              isSaving={isSaving}
              onSave={handleSave}
              onClear={handleClear}
              onHeatmapMouseDown={handleHeatmapMouseDown}
              onHeatmapMouseUp={handleHeatmapMouseUp}
              showingHeatmap={showingHeatmap}
            />
            
            {isLoadingHeatmap && showingHeatmap && (
              <div className="new-entries-loading-indicator">
                <p>Ładowanie heatmapy...</p>
              </div>
            )}

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
                      showingHeatmap={showingHeatmap}
                      heatmapData={heatmapData}
                      selectedRecruitment={selectedRecruitment} 
                      gridStartHour={gridStartHour} 
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {showingHeatmap && heatmapData && <HeatmapLegend />}
            
            {/* SEKCJA ZAAWANSOWANYCH PREFERENCJI */}
            {selectedRecruitment && (
              <AdvancedPreferencesSection
                complexPrefs={complexPrefs}
                setComplexPrefs={setComplexPrefs}
                isEditable={isEditable}
              />
            )}
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