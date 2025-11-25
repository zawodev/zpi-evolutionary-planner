/* utils/scheduleOperations.js */

import { timeToMinutes, minutesToTime, calculateSlotPosition } from './scheduleDisplay';

export const createSlotFromType = (type) => {
  return type === 'prefer' ? 'Chce mieć zajęcia' : 'Brak zajęć';
};

export const convertScheduleToWeights = (scheduleData, days, dayStartTime = "08:00", timeslotsPerDay = 32) => {
    
    const totalSlots = days.length * timeslotsPerDay;
    const weightsArray = new Array(totalSlots).fill(0);
    const startMinutesBase = timeToMinutes(dayStartTime); 

    days.forEach((day, dayIndex) => {
        const slots = (scheduleData[day] || []).filter(Boolean);
        
        slots.forEach(slot => {
            if (!slot) return;

            const startMin = timeToMinutes(slot.start);
            const endMin = timeToMinutes(slot.end);
            
            const startSlotIndex = Math.floor((startMin - startMinutesBase) / 15);
            const endSlotIndex = Math.floor((endMin - startMinutesBase) / 15);
            
            const weight = slot.type === 'prefer' ? slot.priority : -slot.priority;

            const dayOffset = dayIndex * timeslotsPerDay;
            
            for (let i = startSlotIndex; i < endSlotIndex; i++) {
                const globalIndex = dayOffset + i;
                if (globalIndex >= 0 && globalIndex < weightsArray.length) {
                    weightsArray[globalIndex] += weight; 
                }
            }
        });
    });

    return weightsArray;
};

export const convertWeightsToSchedule = (weightsArray, days, dayStartTime = "08:00", timeslotsPerDay = 32) => {
    const scheduleData = days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
    const startMinutesBase = timeToMinutes(dayStartTime);

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        const dayOffset = dayIndex * timeslotsPerDay;
        const slots = [];

        let currentSlot = null;

        for (let i = 0; i < timeslotsPerDay; i++) {
            const globalIndex = dayOffset + i;
            const weight = parseFloat(weightsArray[globalIndex]) || 0; 
            const absoluteWeight = Math.abs(weight);
            const type = weight > 0 ? 'prefer' : 'avoid';

            const blockStartMin = startMinutesBase + i * 15;
            const blockEndMin = blockStartMin + 15;

            if (absoluteWeight > 0) {
                if (currentSlot && 
                    currentSlot.priority === absoluteWeight && 
                    currentSlot.type === type) 
                {
                    currentSlot.endMin = blockEndMin;
                } else {
                    if (currentSlot) {
                        slots.push({
                            start: minutesToTime(currentSlot.startMin),
                            end: minutesToTime(currentSlot.endMin),
                            type: currentSlot.type,
                            label: createSlotFromType(currentSlot.type),
                            priority: currentSlot.priority,
                        });
                    }

                    currentSlot = {
                        startMin: blockStartMin,
                        endMin: blockEndMin,
                        type: type,
                        priority: absoluteWeight,
                    };
                }
            } else {
                if (currentSlot) {
                    slots.push({
                        start: minutesToTime(currentSlot.startMin),
                        end: minutesToTime(currentSlot.endMin),
                        type: currentSlot.type,
                        label: createSlotFromType(currentSlot.type),
                        priority: currentSlot.priority,
                    });
                    currentSlot = null;
                }
            }
        }

        if (currentSlot) {
            slots.push({
                start: minutesToTime(currentSlot.startMin),
                end: minutesToTime(currentSlot.endMin),
                type: currentSlot.type,
                label: createSlotFromType(currentSlot.type),
                priority: currentSlot.priority,
            });
        }
        
        scheduleData[day] = slots;
    }
    
    return scheduleData;
};

export const calculateUsedPriority = (scheduleData, days) => {
  let total = 0;
  days.forEach(day => {
    const validSlots = (scheduleData[day] || []).filter(Boolean);
    validSlots.forEach(slot => {
      total += Math.abs(slot.priority) || 0; 
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