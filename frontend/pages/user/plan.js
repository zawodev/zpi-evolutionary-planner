/* frontend/evoplanner_frontend/pages/plan.js */
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Filter, Calendar, Clock, MapPin, BookOpen, Users, FlaskConical, MessageCircle, FileText, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// --- Helper Functions ---

const parseStartTime = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const timeslotToTime = (timeslot, dayStartMinutes = 0) => {
  const totalMinutes = dayStartMinutes + (timeslot * 15);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getWeekDays = (currDate) => {
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

const formatWeekHeader = (startDate, endDate) => {
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

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};

// Color palette for different criteria
const COLOR_PALETTES = {
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

const getColorByValue = (value, coloringMode) => {
  if (!value) return COLOR_PALETTES[coloringMode][7]; // default gray
  
  // Simple hash function to consistently assign colors
  let hash = 0;
  const str = String(value);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES[coloringMode].length;
  return COLOR_PALETTES[coloringMode][index];
};

const getEventVisuals = (item, coloringMode = 'type') => {
  // Determine icon based on type
  const typeLower = item.type ? item.type.toLowerCase() : '';
  let icon = FileText;
  
  if (typeLower.includes('egzamin')) icon = FileText;
  else if (typeLower.includes('wykład') || typeLower.includes('wyklad')) icon = BookOpen;
  else if (typeLower.includes('lab') || typeLower.includes('proj')) icon = FlaskConical;
  else if (typeLower.includes('sem') || typeLower.includes('ćw')) icon = Users;
  else if (typeLower.includes('rozmowa')) icon = MessageCircle;

  // Determine color based on coloring mode
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

// --- Styles Component ---
const PlanStyles = () => (
  <style>{`
    /* --- Global & Reset --- */
    .plan-container * {
      box-sizing: border-box;
    }
    
    /* --- Main Container --- */
    .plan-container {
      min-height: 100vh;
      padding: 1rem;
      padding-top: 6rem;
    }
    
    .plan-wrapper {
      max-width: 1600px;
      margin-left: auto;
      margin-right: auto;
    }

    /* --- Header --- */
    .plan-header-section {
      margin-bottom: 1.5rem;
    }
    
    .plan-header-wrapper {
      background-color: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .plan-header-gradient {
      background: white;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .plan-header-content {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }
    
    .plan-header-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .plan-filter-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-end;
    }
    
    .plan-filter-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    
    .plan-filter-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .plan-filter-select {
      background-color: #eff6ff;
      border: 2px solid #dbeafe;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #1e40af;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .plan-filter-select:hover {
      background-color: #dbeafe;
      border-color: #bfdbfe;
    }
    
    .plan-filter-select:focus {
      outline: none;
      border-color: #3b82f6;
    }

    /* --- Week Navigation --- */
    .plan-nav-wrapper {
      margin-bottom: 1.5rem;
      background-color: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1rem 1.5rem;
    }
    
    .plan-nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .plan-nav-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
      border: 1px solid #e5e7eb;
      cursor: pointer;
      background: white;
      color: #374151;
    }
    
    .plan-nav-button:hover {
      background: #f9fafb;
    }
    
    .plan-nav-center {
      text-align: center;
    }
    
    .plan-nav-center h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .plan-nav-week-badge {
      background: #dbeafe;
      color: #1e40af;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      display: inline-block;
    }

    /* --- Calendar Grid --- */
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 1rem;
    }

    /* --- Day Column --- */
    .day-column {
      border-radius: 0.75rem;
      overflow: hidden;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .day-column.today {
      border: 2px solid #3b82f6;
    }
    
    .day-column-header {
      padding: 1rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .day-column-header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .day-column-weekday {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
    }
    
    .day-column-day {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }
    
    .day-column-body {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 180px;
    }
    
    .day-column-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-top: 3rem;
      color: #9ca3af;
    }
    
    .day-column-empty-icon {
      background-color: #f3f4f6;
      border-radius: 9999px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      opacity: 0.4;
    }

    /* --- Schedule Item --- */
    .schedule-item {
      border-radius: 0.5rem;
      padding: 0.75rem;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .schedule-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    }
    
    .schedule-item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    
    .schedule-item-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin: 0 0 0.5rem 0;
    }
    
    .schedule-item-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
    }
    
    .schedule-item-detail-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* --- Responsive --- */
    @media (max-width: 1024px) {
      .plan-header-content {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .plan-filter-container {
        align-items: flex-start;
        width: 100%;
      }
    }
    
    @media (min-width: 640px) {
      .calendar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .plan-filter-container { flex-direction: row; gap: 1rem; }
    }
    @media (min-width: 768px) {
      .calendar-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    }
    @media (min-width: 1200px) {
      .calendar-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); }
    }

    /* --- Modal Popup --- */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal-content {
      background: white;
      border-radius: 1rem;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .modal-header-content {
      flex: 1;
    }
    
    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }
    
    .modal-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    
    .modal-close-button {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      color: #6b7280;
      border-radius: 0.375rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-close-button:hover {
      background: #f3f4f6;
      color: #1f2937;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .modal-section {
      margin-bottom: 1.5rem;
    }
    
    .modal-section:last-child {
      margin-bottom: 0;
    }
    
    .modal-section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.75rem 0;
    }
    
    .modal-info-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 0.75rem;
    }
    
    @media (min-width: 640px) {
      .modal-info-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    .modal-info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 0.5rem;
    }
    
    .modal-info-icon {
      color: #6b7280;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    
    .modal-info-content {
      flex: 1;
    }
    
    .modal-info-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0 0 0.25rem 0;
    }
    
    .modal-info-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
    
    .modal-participants-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .modal-participant-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }
    
    .modal-participant-item:hover {
      background: #f3f4f6;
    }
    
    .modal-participant-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 9999px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    
    .modal-participant-info {
      flex: 1;
    }
    
    .modal-participant-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.125rem 0;
    }
    
    .modal-participant-email {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0;
    }
    
    .modal-expandable-section {
      margin-top: 1rem;
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
    }
    
    .modal-expand-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }
    
    .modal-expand-button:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    
    .modal-expand-button-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .modal-expand-icon {
      transition: transform 0.2s;
    }
    
    .modal-expand-icon.expanded {
      transform: rotate(180deg);
    }
    
    .modal-expand-count {
      background: #e5e7eb;
      color: #374151;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .modal-expandable-content {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      animation: slideDown 0.2s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .modal-category-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.5rem;
      margin-bottom: 0.25rem;
    }
    
    .modal-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .modal-loading {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }
    
    .modal-loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 9999px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .modal-error {
      text-align: center;
      padding: 2rem;
      color: #dc2626;
    }
  `}</style>
);

const ScheduleItem = ({ item, coloringMode, onClick }) => {
  const visuals = getEventVisuals(item, coloringMode);
  const IconComponent = visuals.icon;

  return (
    <div 
      className="schedule-item"
      style={{
        backgroundColor: visuals.colors.bg,
        color: visuals.colors.text
      }}
      onClick={() => onClick(item)}
    >
      <div className="schedule-item-header">
        <div className="schedule-item-icon-wrapper">
          <IconComponent size={16} />
        </div>
      </div>
      
      <h3 className="schedule-item-title">
        {item.title}
      </h3>
      
      <div className="schedule-item-details">
        <div className="schedule-item-detail-row">
          <Clock size={12} />
          <span>{item.startTime} - {item.endTime}</span>
        </div>
        <div className="schedule-item-detail-row">
          <MapPin size={12} />
          <span>{item.room}</span>
        </div>
        {item.group && (
          <div className="schedule-item-detail-row">
            <Users size={12} />
            <span>{item.group}</span>
          </div>
        )}
        {item.hostName && (
          <div className="schedule-item-detail-row">
            <User size={12} />
            <span>{item.hostName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const EventModal = ({ item, onClose, meetingData }) => {
  const [groupDetails, setGroupDetails] = useState(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    teachers: false,
    assistants: false,
    observers: false
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!meetingData?.group?.group_id || !user) return;
      
      setIsLoadingGroup(true);
      
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        // Try to fetch group details with students
        const groupRes = await fetch(
          `http://127.0.0.1:8000/api/v1/groups/${meetingData.group.group_id}/`,
          { headers }
        );
        
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupDetails(groupData);
        }
      } catch (err) {
        console.error("Error fetching group details:", err);
      } finally {
        setIsLoadingGroup(false);
      }
    };

    fetchGroupDetails();
  }, [meetingData, user]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const visuals = getEventVisuals(item, 'type');
  const IconComponent = visuals.icon;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-header-content">
            <h2 className="modal-title">{item.title}</h2>
            <p className="modal-subtitle">
              <Calendar size={14} />
              {formatDate(item.date)}
            </p>
          </div>
          <button 
            className="modal-close-button" 
            onClick={onClose}
            aria-label="Zamknij"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Basic Info Section */}
          <div className="modal-section">
            <h3 className="modal-section-title">Informacje podstawowe</h3>
            <div className="modal-info-grid">
              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <IconComponent size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Typ zajęć</p>
                  <p className="modal-info-value">{item.type}</p>
                </div>
              </div>

              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <Clock size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Godziny</p>
                  <p className="modal-info-value">{item.startTime} - {item.endTime}</p>
                </div>
              </div>

              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <MapPin size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Sala</p>
                  <p className="modal-info-value">{item.room}</p>
                </div>
              </div>

              {item.group && (
                <div className="modal-info-item">
                  <div className="modal-info-icon">
                    <Users size={20} />
                  </div>
                  <div className="modal-info-content">
                    <p className="modal-info-label">Grupa</p>
                    <p className="modal-info-value">{item.group}</p>
                  </div>
                </div>
              )}

              {item.hostName && (
                <div className="modal-info-item">
                  <div className="modal-info-icon">
                    <User size={20} />
                  </div>
                  <div className="modal-info-content">
                    <p className="modal-info-label">Prowadzący</p>
                    <p className="modal-info-value">{item.hostName}</p>
                  </div>
                </div>
              )}

              {meetingData?.recruitment && (
                <div className="modal-info-item">
                  <div className="modal-info-icon">
                    <BookOpen size={20} />
                  </div>
                  <div className="modal-info-content">
                    <p className="modal-info-label">Rekrutacja</p>
                    <p className="modal-info-value">{meetingData.recruitment.recruitment_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participants Section */}
          {isLoadingGroup && (
            <div className="modal-section">
              <h3 className="modal-section-title">Uczestnicy</h3>
              <div className="modal-loading">
                <div className="modal-loading-spinner"></div>
                <p>Ładowanie listy uczestników...</p>
              </div>
            </div>
          )}

          {groupDetails?.students && groupDetails.students.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">
                Studenci ({groupDetails.students.length})
              </h3>
              <div className="modal-participants-list">
                {groupDetails.students.map((student, index) => (
                  <div key={student.id || index} className="modal-participant-item">
                    <div 
                      className="modal-participant-avatar"
                      style={{
                        background: `linear-gradient(135deg, ${visuals.colors.bg} 0%, ${visuals.colors.text} 100%)`
                      }}
                    >
                      {getInitials(`${student.first_name} ${student.last_name}`)}
                    </div>
                    <div className="modal-participant-info">
                      <p className="modal-participant-name">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.email && (
                        <p className="modal-participant-email">{student.email}</p>
                      )}
                      {student.username && !student.email && (
                        <p className="modal-participant-email">@{student.username}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expandable sections for other categories */}
              <div className="modal-expandable-section">
                {/* Teachers Section */}
                {groupDetails.teachers && groupDetails.teachers.length > 0 && (
                  <div style={{marginBottom: '0.75rem'}}>
                    <button 
                      className="modal-expand-button"
                      onClick={() => toggleSection('teachers')}
                    >
                      <div className="modal-expand-button-content">
                        <User size={16} />
                        <span>Prowadzący</span>
                        <span className="modal-expand-count">{groupDetails.teachers.length}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`modal-expand-icon ${expandedSections.teachers ? 'expanded' : ''}`}
                      />
                    </button>
                    {expandedSections.teachers && (
                      <div className="modal-expandable-content">
                        {groupDetails.teachers.map((teacher, index) => (
                          <div key={teacher.id || index} className="modal-participant-item">
                            <div 
                              className="modal-participant-avatar"
                              style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                              }}
                            >
                              {getInitials(`${teacher.first_name} ${teacher.last_name}`)}
                            </div>
                            <div className="modal-participant-info">
                              <p className="modal-participant-name">
                                {teacher.first_name} {teacher.last_name}
                              </p>
                              {teacher.email && (
                                <p className="modal-participant-email">{teacher.email}</p>
                              )}
                              {teacher.username && !teacher.email && (
                                <p className="modal-participant-email">@{teacher.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assistants Section */}
                {groupDetails.assistants && groupDetails.assistants.length > 0 && (
                  <div style={{marginBottom: '0.75rem'}}>
                    <button 
                      className="modal-expand-button"
                      onClick={() => toggleSection('assistants')}
                    >
                      <div className="modal-expand-button-content">
                        <Users size={16} />
                        <span>Asystenci</span>
                        <span className="modal-expand-count">{groupDetails.assistants.length}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`modal-expand-icon ${expandedSections.assistants ? 'expanded' : ''}`}
                      />
                    </button>
                    {expandedSections.assistants && (
                      <div className="modal-expandable-content">
                        {groupDetails.assistants.map((assistant, index) => (
                          <div key={assistant.id || index} className="modal-participant-item">
                            <div 
                              className="modal-participant-avatar"
                              style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                              }}
                            >
                              {getInitials(`${assistant.first_name} ${assistant.last_name}`)}
                            </div>
                            <div className="modal-participant-info">
                              <p className="modal-participant-name">
                                {assistant.first_name} {assistant.last_name}
                              </p>
                              {assistant.email && (
                                <p className="modal-participant-email">{assistant.email}</p>
                              )}
                              {assistant.username && !assistant.email && (
                                <p className="modal-participant-email">@{assistant.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Observers Section */}
                {groupDetails.observers && groupDetails.observers.length > 0 && (
                  <div>
                    <button 
                      className="modal-expand-button"
                      onClick={() => toggleSection('observers')}
                    >
                      <div className="modal-expand-button-content">
                        <Users size={16} />
                        <span>Obserwatorzy</span>
                        <span className="modal-expand-count">{groupDetails.observers.length}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`modal-expand-icon ${expandedSections.observers ? 'expanded' : ''}`}
                      />
                    </button>
                    {expandedSections.observers && (
                      <div className="modal-expandable-content">
                        {groupDetails.observers.map((observer, index) => (
                          <div key={observer.id || index} className="modal-participant-item">
                            <div 
                              className="modal-participant-avatar"
                              style={{
                                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                              }}
                            >
                              {getInitials(`${observer.first_name} ${observer.last_name}`)}
                            </div>
                            <div className="modal-participant-info">
                              <p className="modal-participant-name">
                                {observer.first_name} {observer.last_name}
                              </p>
                              {observer.email && (
                                <p className="modal-participant-email">{observer.email}</p>
                              )}
                              {observer.username && !observer.email && (
                                <p className="modal-participant-email">@{observer.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoadingGroup && groupDetails && (!groupDetails.students || groupDetails.students.length === 0) && (
            <div className="modal-section">
              <h3 className="modal-section-title">Uczestnicy</h3>
              <p style={{color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '1rem'}}>
                Brak informacji o uczestnikach
              </p>
            </div>
          )}

          {/* Additional Details Section */}
          {meetingData?.subject_group?.subject && (
            <div className="modal-section">
              <h3 className="modal-section-title">Szczegóły przedmiotu</h3>
              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <BookOpen size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Nazwa przedmiotu</p>
                  <p className="modal-info-value">
                    {meetingData.subject_group.subject.subject_name}
                  </p>
                  {meetingData.subject_group.subject.subject_code && (
                    <p className="modal-info-label" style={{marginTop: '0.25rem'}}>
                      Kod: {meetingData.subject_group.subject.subject_code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DayColumn = ({ day, events, coloringMode, onEventClick }) => {
  const isToday = new Date().toDateString() === day.toDateString();
  const dayFormat = day.getDate();
  const monthFormat = day.toLocaleDateString('pl-PL', { month: '2-digit' });
  const weekdayFormat = day.toLocaleDateString('pl-PL', { weekday: 'short' }).toUpperCase();

  return (
    <div className={`day-column ${isToday ? 'today' : ''}`}>
      <div className={`day-column-header ${isToday ? 'today' : ''}`}>
        <div className="day-column-header-content">
          <div>
            <div className="day-column-weekday">{weekdayFormat}</div>
            <div className="day-column-day">{dayFormat}</div>
          </div>
          <div className="day-column-month">{monthFormat}</div>
        </div>
        {isToday && <div style={{marginTop:'5px', fontSize:'0.7rem', color:'#2563eb', fontWeight:'bold'}}>DZIŚ</div>}
      </div>
      
      <div className="day-column-body">
        {events.length > 0 ? (
          events.map(item => (
            <ScheduleItem 
              key={item.id} 
              item={item} 
              coloringMode={coloringMode}
              onClick={onEventClick}
            />
          ))
        ) : (
          <div className="day-column-empty">
            <div className="day-column-empty-icon">
              <Calendar size={32} />
            </div>
            <p>Brak zajęć</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function PlanUzytkownika() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecruitmentId, setSelectedRecruitmentId] = useState('all');
  const [coloringMode, setColoringMode] = useState('type');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Data states
  const [recruitments, setRecruitments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.id) return;
      
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        // Fetch recruitments
        const recRes = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/recruitments/`, { headers });
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecruitments(recData);
        }

      } catch (error) {
        console.error("Błąd pobierania danych planu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchWeekData = async () => {
      if (!user || !user.id) return;
      
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        // Calculate week boundaries
        const week = getWeekDays(currentDate);
        const startDate = week[0].toISOString().split('T')[0]; // YYYY-MM-DD format
        const endDate = week[6].toISOString().split('T')[0];
        
        // Fetch meetings with date range
        const meetRes = await fetch(
          `http://127.0.0.1:8000/api/v1/identity/users/${user.id}/availability/?start_date=${startDate}&end_date=${endDate}`,
          { headers }
        );
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          setMeetings(meetData.results || []);
          console.log("Fetched meetings:", meetData);
        }
      } catch (error) {
        console.error("Błąd odświeżania danych tygodnia:", error);
      }
    };

    fetchWeekData();
  }, [currentDate, user]);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const scheduleEvents = useMemo(() => {
    if (!meetings.length || !recruitments.length) return [];

    return meetings.map(meeting => {
      const eventDate = weekDays[meeting.day_of_week];
      const dateStr = eventDate ? eventDate.toISOString().split('T')[0] : 'Unknown';

      // Use start_time and end_time directly from the API
      const startT = meeting.start_time ? meeting.start_time.substring(0, 5) : '00:00';
      const endT = meeting.end_time ? meeting.end_time.substring(0, 5) : '00:15';

      let eventType = 'Zajęcia';
      if (meeting.group?.group_name) {
        const groupLower = meeting.group.group_name.toLowerCase();
        if (groupLower.includes('wykład') || groupLower.includes('wyklad')) {
          eventType = 'Wykład';
        } else if (groupLower.includes('lab')) {
          eventType = 'Laboratorium';
        } else if (groupLower.includes('proj')) {
          eventType = 'Projekt';
        } else if (groupLower.includes('ćw') || groupLower.includes('cw')) {
          eventType = 'Ćwiczenia';
        } else if (groupLower.includes('sem')) {
          eventType = 'Seminarium';
        }
      }

      let roomDisplay = 'TBA';
      if (meeting.room) {
        roomDisplay = meeting.room.building_name 
          ? `${meeting.room.building_name} ${meeting.room.room_number}`
          : meeting.room.room_number || 'TBA';
      }

      // Extract host name
      let hostName = null;
      if (meeting.subject_group?.host_user) {
        const host = meeting.subject_group.host_user;
        hostName = `${host.first_name} ${host.last_name}`.trim() || host.username;
      }

      // Extract subject name
      const subjectName = meeting.subject_group?.subject?.subject_name || 'Zajęcia';

      return {
        id: meeting.meeting_id,
        recruitmentId: meeting.recruitment.recruitment_id,
        title: subjectName,
        type: eventType,
        group: meeting.group?.group_name || '',
        room: roomDisplay,
        date: dateStr,
        startTime: startT,
        endTime: endT,
        hostName: hostName
      };
    });
  }, [meetings, weekDays, recruitments]);

  // Applying Filters
  const filteredSchedule = useMemo(() => {
    let data = scheduleEvents;
    if (selectedRecruitmentId !== 'all') {
      data = data.filter(item => item.recruitmentId === selectedRecruitmentId);
    }
    return data;
  }, [scheduleEvents, selectedRecruitmentId]);

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleRecruitmentChange = (e) => {
    setSelectedRecruitmentId(e.target.value);
  };

  const handleColoringModeChange = (e) => {
    setColoringMode(e.target.value);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  // Find full meeting data for selected event
  const selectedMeetingData = useMemo(() => {
    if (!selectedEvent) return null;
    return meetings.find(m => m.meeting_id === selectedEvent.id);
  }, [selectedEvent, meetings]);

  return (
    <div className="plan-container">
      <PlanStyles />
      
      <div className="plan-wrapper">
        
        {/* Header Section */}
        <div className="plan-header-section">
          <div className="plan-header-wrapper">
            <div className="plan-header-gradient">
              <div className="plan-header-content">
                <div className="plan-header-title">
                  <h1>Twój Plan Tygodniowy</h1>
                  {isLoading && <p style={{fontSize: '0.9rem', color: '#6b7280'}}>Ładowanie danych z bazy...</p>}
                </div>
                
                <div className="plan-filter-container">
                  {/* Recruitment Filter */}
                  <div className="plan-filter-box">
                    <span className="plan-filter-label">
                      Rekrutacja:
                    </span>
                    <select
                      value={selectedRecruitmentId}
                      onChange={handleRecruitmentChange}
                      className="plan-filter-select"
                      disabled={isLoading}
                    >
                      <option value="all">Wszystkie rekrutacje</option>
                      {recruitments.map(rec => (
                        <option key={rec.recruitment_id} value={rec.recruitment_id}>
                          {rec.recruitment_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Mode Filter */}
                  <div className="plan-filter-box">
                    <span className="plan-filter-label">
                      Koloruj według:
                    </span>
                    <select
                      value={coloringMode}
                      onChange={handleColoringModeChange}
                      className="plan-filter-select"
                    >
                      <option value="type">Typ zajęć</option>
                      <option value="subject">Przedmiot</option>
                      <option value="room">Sala</option>
                      <option value="host">Prowadzący</option>
                      <option value="group">Grupa</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="plan-nav-wrapper">
          <div className="plan-nav-content">
            <button onClick={handlePrevWeek} className="plan-nav-button prev">
              <ChevronLeft size={16} />
              <span className="plan-nav-button-text">Poprzedni tydzień</span>
            </button>
            
            <div className="plan-nav-center">
              <h2>{formatWeekHeader(weekDays[0], weekDays[6])}</h2>
              <div className="plan-nav-week-badge">
                Tydzień {getWeekNumber(weekDays[0])}
              </div>
            </div>

            <button onClick={handleNextWeek} className="plan-nav-button next">
              <span className="plan-nav-button-text">Następny tydzień</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {weekDays.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const eventsForDay = filteredSchedule
              .filter(item => item.date === dateStr)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <DayColumn
                key={dateStr}
                day={day}
                events={eventsForDay}
                coloringMode={coloringMode}
                onEventClick={handleEventClick}
              />
            );
          })}
        </div>

      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventModal 
          item={selectedEvent}
          meetingData={selectedMeetingData}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}