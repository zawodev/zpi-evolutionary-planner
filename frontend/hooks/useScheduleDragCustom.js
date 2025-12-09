/* hooks/useScheduleDragCustom.js */

import { useState, useEffect } from 'react';

const formatTimeString = (hour, minute) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export const useScheduleDragCustom = (onDragComplete, isEditable, gridStartHour, gridEndHour) => {
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