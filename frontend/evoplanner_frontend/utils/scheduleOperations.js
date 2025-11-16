/* utils/scheduleOperations.js */

import { timeToMinutes, minutesToTime, calculateSlotPosition } from './scheduleDisplay';

export const calculateUsedPriority = (scheduleData, days) => {
  let total = 0;
  days.forEach(day => {
    const validSlots = (scheduleData[day] || []).filter(Boolean);
    validSlots.forEach(slot => {
      total += slot.priority || 0;
    });
  });
  return total;
};

export const addSlot = (scheduleData, day, newSlot) => {
  const daySlots = (scheduleData[day] || []).filter(Boolean);
  const newSlotStart = timeToMinutes(newSlot.start);
  const newSlotEnd = timeToMinutes(newSlot.end);

  const filteredSlots = daySlots.filter(slot => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    return !(
      (newSlotStart <= slotStart && newSlotEnd >= slotEnd) ||
      (newSlotStart >= slotStart && newSlotEnd <= slotEnd) ||
      (newSlotStart < slotEnd && newSlotEnd > slotStart)
    );
  });

  filteredSlots.push(newSlot);
  filteredSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  return {
    ...scheduleData,
    [day]: filteredSlots
  };
};

export const updateSlot = (scheduleData, day, slotIndex, updatedSlot) => {
  const daySlots = (scheduleData[day] || []).filter(Boolean);
  daySlots[slotIndex] = updatedSlot;

  return {
    ...scheduleData,
    [day]: daySlots.filter(Boolean)
  };
};

export const deleteSlot = (scheduleData, day, slotIndex) => {
  const daySlots = (scheduleData[day] || []).filter(Boolean);
  const newDaySlots = daySlots.filter((_, index) => index !== slotIndex);

  return {
    ...scheduleData,
    [day]: newDaySlots
  };
};

export const createSlotFromType = (type) => {
  return type === 'prefer' ? 'Chce mieć zajęcia' : 'Brak zajęć';
};

export const getDragPreview = (isDragging, dragStart, dragEnd, dragDay, currentDay) => {
  if (!isDragging || !dragStart || !dragEnd || dragDay !== currentDay ||
      isNaN(dragStart.minutes) || isNaN(dragEnd.minutes)) {
    return null;
  }

  const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes);
  const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes);

  const startTime = minutesToTime(startMinutes);
  const endTimeString = minutesToTime(endMinutes);

  const { top, height } = calculateSlotPosition(startTime, endTimeString);

  if (height === 0) return null;

  return {
    top,
    height,
    startTime,
    endTime: endTimeString
  };
};