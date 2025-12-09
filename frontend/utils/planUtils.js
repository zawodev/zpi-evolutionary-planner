/* frontend/evoplanner_frontend/utils/planUtils.js */
import { FileText, BookOpen, FlaskConical, Users, MessageCircle } from 'lucide-react';

// --- Date Helpers ---

export const parseStartTime = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export const timeslotToTime = (timeslot, dayStartMinutes = 0) => {
  const totalMinutes = dayStartMinutes + (timeslot * 15);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const getWeekDays = (currDate) => {
  const week = [];
  const date = new Date(currDate);
  const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat) 
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  
  const monday = new Date(date);
  monday.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    week.push(day);
  }
  return week;
};

export const formatWeekHeader = (startDate, endDate) => {
  const options = { month: 'long', year: 'numeric' };
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startLocale = startDate.toLocaleDateString('pl-PL', options);
  const endLocale = endDate.toLocaleDateString('pl-PL', options);

  if (startLocale === endLocale) {
    return `${startDay} - ${endDay} ${startLocale}`;
  } else {
    return `${startDay} ${startLocale} - ${endDay} ${endLocale}`;
  }
};

export const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};

// --- Color & Visual Helpers ---

export const COLOR_PALETTES = {
  type: [
    { bg: '#fee2e2', text: '#991b1b' }, // red
    { bg: '#dbeafe', text: '#1e40af' }, // blue
    { bg: '#d1fae5', text: '#065f46' }, // green
    { bg: '#fef3c7', text: '#92400e' }, // yellow
    { bg: '#f3e8ff', text: '#6b21a8' }, // purple
    { bg: '#fce7f3', text: '#9f1239' }, // pink
    { bg: '#e0e7ff', text: '#3730a3' }, // indigo
    { bg: '#f3f4f6', text: '#374151' }, // gray
  ],
  subject: [
    { bg: '#dbeafe', text: '#1e40af' }, // blue
    { bg: '#d1fae5', text: '#065f46' }, // green
    { bg: '#fef3c7', text: '#92400e' }, // yellow
    { bg: '#f3e8ff', text: '#6b21a8' }, // purple
    { bg: '#fce7f3', text: '#9f1239' }, // pink
    { bg: '#fed7aa', text: '#9a3412' }, // orange
    { bg: '#e0e7ff', text: '#3730a3' }, // indigo
    { bg: '#fecaca', text: '#991b1b' }, // light red
    { bg: '#a7f3d0', text: '#065f46' }, // light green
    { bg: '#fde68a', text: '#78350f' }, // light yellow
  ],
  room: [
    { bg: '#e0e7ff', text: '#3730a3' }, // indigo
    { bg: '#dbeafe', text: '#1e40af' }, // blue
    { bg: '#d1fae5', text: '#065f46' }, // green
    { bg: '#fed7aa', text: '#9a3412' }, // orange
    { bg: '#f3e8ff', text: '#6b21a8' }, // purple
    { bg: '#fef3c7', text: '#92400e' }, // yellow
    { bg: '#fce7f3', text: '#9f1239' }, // pink
    { bg: '#f3f4f6', text: '#374151' }, // gray
  ],
  host: [
    { bg: '#fce7f3', text: '#9f1239' }, // pink
    { bg: '#dbeafe', text: '#1e40af' }, // blue
    { bg: '#d1fae5', text: '#065f46' }, // green
    { bg: '#f3e8ff', text: '#6b21a8' }, // purple
    { bg: '#fed7aa', text: '#9a3412' }, // orange
    { bg: '#e0e7ff', text: '#3730a3' }, // indigo
    { bg: '#fef3c7', text: '#92400e' }, // yellow
    { bg: '#f3f4f6', text: '#374151' }, // gray
  ],
  group: [
    { bg: '#fed7aa', text: '#9a3412' }, // orange
    { bg: '#dbeafe', text: '#1e40af' }, // blue
    { bg: '#d1fae5', text: '#065f46' }, // green
    { bg: '#f3e8ff', text: '#6b21a8' }, // purple
    { bg: '#fce7f3', text: '#9f1239' }, // pink
    { bg: '#fef3c7', text: '#92400e' }, // yellow
    { bg: '#e0e7ff', text: '#3730a3' }, // indigo
    { bg: '#f3f4f6', text: '#374151' }, // gray
  ]
};

export const getColorByValue = (value, coloringMode) => {
  if (!value) return COLOR_PALETTES[coloringMode][7]; // default gray
  
  let hash = 0;
  const str = String(value);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES[coloringMode].length;
  return COLOR_PALETTES[coloringMode][index];
};

export const getEventVisuals = (item, coloringMode = 'type') => {
  const typeLower = item.type ? item.type.toLowerCase() : '';
  let icon = FileText;
  
  if (typeLower.includes('egzamin')) icon = FileText;
  else if (typeLower.includes('wykład') || typeLower.includes('wyklad')) icon = BookOpen;
  else if (typeLower.includes('lab') || typeLower.includes('proj')) icon = FlaskConical;
  else if (typeLower.includes('sem') || typeLower.includes('ćw')) icon = Users;
  else if (typeLower.includes('rozmowa')) icon = MessageCircle;

  let colors;
  switch (coloringMode) {
    case 'type':
      colors = getColorByValue(item.type, 'type');
      break;
    case 'subject':
      colors = getColorByValue(item.title, 'subject');
      break;
    case 'room':
      colors = getColorByValue(item.room, 'room');
      break;
    case 'host':
      colors = getColorByValue(item.hostName, 'host');
      break;
    case 'group':
      colors = getColorByValue(item.group, 'group');
      break;
    default:
      colors = COLOR_PALETTES.type[7]; // default
  }
  
  return { 
    colors,
    icon 
  };
};