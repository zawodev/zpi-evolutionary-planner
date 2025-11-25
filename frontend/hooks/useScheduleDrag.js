/* hooks/useScheduleDrag.js */

import { useState, useEffect } from 'react';
import { minutesToTime } from '../utils/scheduleDisplay';

export const useScheduleDrag = (onDragComplete) => {
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
    const hourHeight = 50;
    const gridStart = 7;
    const gridEnd = 18;

    const clampedY = Math.max(0, Math.min(y, (gridEnd - gridStart) * hourHeight));

    if (isNaN(clampedY)) {
      console.error("getPositionInfo calculated NaN for clampedY");
      return { time: "NaN:NaN", minutes: NaN };
    }

    const totalMinutes = Math.floor((clampedY / hourHeight) * 60);
    const hour = gridStart + Math.floor(totalMinutes / 60);
    const minutes = Math.floor((totalMinutes % 60) / 15) * 15;

    const finalHour = Math.max(gridStart, Math.min(hour, gridEnd));

    if (isNaN(finalHour) || isNaN(minutes)) {
      console.error("getPositionInfo calculated NaN for time");
      return { time: "NaN:NaN", minutes: NaN };
    }

    return {
      time: `${finalHour}:${minutes.toString().padStart(2, '0')}`,
      minutes: finalHour * 60 + minutes
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

    const columns = document.querySelectorAll('.schedule-column');
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

    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(endMinutes);

    onDragComplete({
      day: dragDay,
      start: startTime,
      end: endTime
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