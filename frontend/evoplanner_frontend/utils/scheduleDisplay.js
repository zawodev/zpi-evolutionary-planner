/* utils/schedule.js */

export const calculateSlotPosition = (startTime, endTime) => {
  if (!startTime || !endTime || startTime.includes("NaN") || endTime.includes("NaN")) {
    return { top: 0, height: 0 };
  }

  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const startMinutes = parseInt(startTime.split(':')[1]) || 0;
  const endMinutes = parseInt(endTime.split(':')[1]) || 0;
  
  const gridStart = 7;
  const hourHeight = 50;
  
  const top = ((startHour - gridStart) + (startMinutes / 60)) * hourHeight + 5;
  const height = ((endHour - startHour) + ((endMinutes - startMinutes) / 60)) * hourHeight;
  
  return { 
    top: isNaN(top) ? 0 : top, 
    height: isNaN(height) ? 0 : height 
  };
};

export const timeToMinutes = (time) => {
  if (typeof time !== 'string' || !time.includes(':')) {
    console.error("timeToMinutes received invalid value:", time);
    return NaN;
  }
  
  const [hours, minutes] = time.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return NaN;
  }
  
  return hours * 60 + (minutes || 0);
};

export const minutesToTime = (minutes) => {
  if (isNaN(minutes)) {
    return "NaN:NaN";
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

