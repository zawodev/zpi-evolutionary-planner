/* pages/entries.js - Refactored */

import React, { useState, useRef } from "react";
import EntriesSidebar from "../components/EntriesSidebar";
import ScheduleHeader from "../components/ScheduleHeader";
import ScheduleColumn from "../components/ScheduleColumn";
import PreferenceModal from "../components/PreferenceModal";
import { useAuth } from '../contexts/AuthContext';
import { useRecruitments } from '../hooks/useRecruitments';
import { usePreferences } from '../hooks/usePreferences';
import { useScheduleDrag } from '../hooks/useScheduleDrag';
import {
  calculateUsedPriority,
  addSlot,
  updateSlot,
  deleteSlot,
  createSlotFromType,
  getDragPreview
} from '../utils/scheduleOperations';

export default function EntriesPage() {
  const { user } = useAuth();
  const calendarRef = useRef(null);

  // Stałe
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];
  const hours = ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  // Rekrutacje
  const { 
    recruitments, 
    isLoading: isLoadingRecruitments, 
    error: recruitmentsError 
  } = useRecruitments(user?.id);
  
  const [selectedRecruitment, setSelectedRecruitment] = useState(null);

  // Preferencje
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

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [pendingSlot, setPendingSlot] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [maxPriority] = useState(40);

  // Drag & Drop
  const {
    isDragging,
    dragStart,
    dragEnd,
    dragDay,
    handleMouseDown,
    resetDrag
  } = useScheduleDrag((dragResult) => {
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

  // Obsługa zapisywania
  const handleSave = async () => {
    const success = await savePreferences();
    if (success) {
      alert('Zmiany zapisane pomyślnie!');
    }
  };

  // Obsługa czyszczenia
  const handleClear = () => {
    if (window.confirm('Czy na pewno chcesz usunąć wszystkie preferencje? Ta akcja jest nieodwracalna.')) {
      clearAllPreferences();
      alert('Wszystkie preferencje zostały wyczyszczone. Kliknij "Zachowaj zmiany", aby zapisać.');
    }
  };

  // Obsługa slotów
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
    if (!editingSlot) return;

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

  // Błędy
  const displayError = recruitmentsError || preferencesError || saveError;

  return (
    <div className="entries-container">
      <div className="entries-content">
        <div className="entries-main">
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
          <main className="entries-schedule">
            {isLoadingRecruitments ? (
              <div className="entries-loading-indicator">
                <p>Ładowanie rekrutacji...</p>
              </div>
            ) : !selectedRecruitment ? (
              <div className="entries-loading-indicator">
                <p>Proszę wybrać rekrutację z listy po lewej stronie.</p>
              </div>
            ) : isLoadingSchedule ? (
              <div className="entries-loading-indicator">
                <p>Ładowanie preferencji dla {selectedRecruitment.recruitment_name}...</p>
              </div>
            ) : (
              <React.Fragment>
                <ScheduleHeader
                  selectedRecruitment={selectedRecruitment}
                  usedPriority={calculateUsedPriority(scheduleData, days)}
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
                      {days.map((day) => (
                        <ScheduleColumn
                          key={day}
                          day={day}
                          slots={(scheduleData[day] || []).filter(Boolean)}
                          dragPreview={getDragPreview(isDragging, dragStart, dragEnd, dragDay, day)}
                          onMouseDown={(e) => handleMouseDown(e, day)}
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