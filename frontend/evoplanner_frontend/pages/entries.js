/* pages/entries.js */

import React, { useState, useEffect, useRef } from "react";
import EntriesSidebar from "../components/EntriesSidebar";
import ScheduleHeader from "../components/ScheduleHeader";
import ScheduleColumn from "../components/ScheduleColumn";
import PreferenceModal from "../components/PreferenceModal";
import { calculateSlotPosition, timeToMinutes, minutesToTime } from "../utils/schedule";

export default function EntriesPage() {
  const [scheduleData, setScheduleData] = useState({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
  });

  const [fileError, setFileError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [dragDay, setDragDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [pendingSlot, setPendingSlot] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [maxPriority, setMaxPriority] = useState(40);

  const calendarRef = useRef(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];
  const hours = ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  const JSON_FILE_PATH = '/json/report-schedule.json';

  const calculateUsedPriority = () => {
    let total = 0;
    days.forEach(day => {
      const validSlots = (scheduleData[day] || []).filter(Boolean);
      validSlots.forEach(slot => {
        total += slot.priority || 0;
      });
    });
    return total;
  };

  const saveScheduleToFile = async () => {
    try {
      const response = await fetch('/api/save-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        alert('Harmonogram został zapisany pomyślnie!');
      } else {
        throw new Error('Błąd podczas zapisywania');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Nie udało się zapisać harmonogramu. Używam zapisu lokalnego...');
      
      const dataStr = JSON.stringify(scheduleData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'schedule-data.json';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const clearAllPreferences = () => {
    if (window.confirm('Czy na pewno chcesz usunąć wszystkie preferencje? Ta akcja jest nieodwracalna.')) {
      setScheduleData({
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: []
      });
      alert('Wszystkie preferencje zostały usunięte.');
    }
  };

  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        const response = await fetch(JSON_FILE_PATH);
        
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const jsonData = await response.json();
        
        if (typeof jsonData !== 'object') {
          throw new Error('Invalid JSON structure: expected an object');
        }

        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const newScheduleData = {};

        validDays.forEach(day => {
          if (jsonData[day] && Array.isArray(jsonData[day])) {
            newScheduleData[day] = jsonData[day].filter(Boolean).map(slot => {
              if (!slot || !slot.start || !slot.end || !slot.type || !slot.label) {
                console.warn(`Invalid slot structure in ${day}, skipping:`, slot);
                return null;
              }
              return {
                start: slot.start,
                end: slot.end,
                type: slot.type,
                label: slot.label,
                priority: slot.priority || 1
              };
            }).filter(Boolean);
          } else {
            newScheduleData[day] = [];
          }
        });

        setScheduleData(newScheduleData);
        setIsLoading(false);
      } catch (error) {
        setFileError(`Error loading schedule: ${error.message}`);
        setIsLoading(false);
        console.error('File loading error:', error);
      }
    };

    loadScheduleData();
  }, []);

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

  const handleMouseDown = (e, day, columnIndex) => {
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

  const handleMouseMove = (e) => {
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
    if (!isDragging || !dragStart || !dragEnd || !dragDay || isNaN(dragStart.minutes) || isNaN(dragEnd.minutes)) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragDay(null);
      return;
    }

    const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes);
    const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes);
    
    if (endMinutes - startMinutes < 15) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragDay(null);
      return;
    }

    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(endMinutes);

    setPendingSlot({
      day: dragDay,
      start: startTime,
      end: endTime,
      type: 'prefer',
      priority: 1
    });
    
    setModalMode('create');
    setShowModal(true);
    setIsDragging(false);
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

    const label = pendingSlot.type === 'prefer' ? 'Chce mieć zajęcia' : 'Brak zajęć';
    const newSlot = {
      start: pendingSlot.start,
      end: pendingSlot.end,
      type: pendingSlot.type,
      label: label,
      priority: pendingSlot.priority || 1
    };

    setScheduleData(prev => {
      const daySlots = (prev[pendingSlot.day] || []).filter(Boolean); 
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
        ...prev,
        [pendingSlot.day]: filteredSlots
      };
    });

    handleCloseModal();
  };

  const handleUpdateSlot = () => {
    if (!editingSlot) return;

    const label = editingSlot.type === 'prefer' ? 'Chce mieć zajęcia' : 'Brak zajęć';
    
    setScheduleData(prev => {
      const daySlots = (prev[editingSlot.day] || []).filter(Boolean);
      
      daySlots[editingSlot.index] = {
        start: editingSlot.start,
        end: editingSlot.end,
        type: editingSlot.type,
        label: label,
        priority: editingSlot.priority || 1
      };
      
      return {
        ...prev,
        [editingSlot.day]: daySlots.filter(Boolean)
      };
    });

    handleCloseModal();
  };

  const handleDeleteSlot = () => {
    if (!editingSlot) return;

    setScheduleData(prev => {
      const daySlots = (prev[editingSlot.day] || []).filter(Boolean);
      const newDaySlots = daySlots.filter((_, index) => index !== editingSlot.index);
      
      return {
        ...prev,
        [editingSlot.day]: newDaySlots
      };
    });

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPendingSlot(null);
    setEditingSlot(null);
    setDragStart(null);
    setDragEnd(null);
    setDragDay(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, dragEnd, dragDay]);

  const getDragPreview = () => {
    if (!isDragging || !dragStart || !dragEnd || !dragDay || isNaN(dragStart.minutes) || isNaN(dragEnd.minutes)) {
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

  return (
    <div className="entries-container">
      <div className="entries-background">
        <div className="entries-content">
          <div className="entries-main">
            <EntriesSidebar
              fileError={fileError}
              onSave={saveScheduleToFile}
              onClear={clearAllPreferences}
            />
            <main className="entries-schedule">
              {isLoading ? (
                <div className="entries-loading-indicator">
                  <p>Ładowanie harmonogramu...</p>
                </div>
              ) : (
                <React.Fragment>
                  <ScheduleHeader
                    usedPriority={calculateUsedPriority()}
                    maxPriority={maxPriority}
                  />
                  <div className="schedule-grid">
                    <div className="schedule-times">
                      {hours.map(time => (
                        <div key={time} className="schedule-time">{time}</div>
                      ))}
                    </div>
                    <div className="schedule-week">
                      <div className="schedule-days">
                        {dayLabels.map(day => (
                          <span key={day} className="schedule-day">{day}</span>
                        ))}
                      </div>
                      <div className="schedule-calendar" ref={calendarRef}>
                        {days.map((day, index) => (
                          <ScheduleColumn
                            key={day}
                            day={day}
                            slots={(scheduleData[day] || []).filter(Boolean)}
                            dragPreview={(isDragging && dragDay === day) ? getDragPreview() : null}
                            onMouseDown={(e) => handleMouseDown(e, day, index)}
                            onSlotClick={handleSlotClick}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </main>
          </div>
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

