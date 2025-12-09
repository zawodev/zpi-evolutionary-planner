/* hooks/useScheduleModal.js */

import { useState } from 'react';
import { addSlot, updateSlot, deleteSlot, createSlotFromType } from '../utils/scheduleOperations';

export const useScheduleModal = (setScheduleData, resetDrag, isEditable) => {
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [pendingSlot, setPendingSlot] = useState(null);
    const [editingSlot, setEditingSlot] = useState(null);

    const openForCreate = (dragResult) => {
        setPendingSlot({ 
            day: dragResult.day, 
            start: dragResult.start, 
            end: dragResult.end, 
            type: 'prefer', 
            priority: 1 
        });
        setModalMode('create');
        setShowModal(true);
    };

    const openForEdit = (e, day, slotIndex, scheduleData) => {
        if (e) e.stopPropagation();
        if (!isEditable) return;

        const daySlots = scheduleData[day];
        if (!daySlots) return;

        const slot = daySlots[slotIndex];
        if (!slot) return;
        
        console.log("Edycja slotu:", slot); 

        setEditingSlot({ ...slot, priority: slot.priority || 1, day, index: slotIndex });
        setModalMode('edit');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setPendingSlot(null);
        setEditingSlot(null);
        if (resetDrag) resetDrag();
    };

    const handleAdd = () => {
        if (!pendingSlot) return;
        const label = createSlotFromType(pendingSlot.type);
        const newSlot = { ...pendingSlot, label };
        setScheduleData(prev => addSlot(prev, pendingSlot.day, newSlot));
        closeModal();
    };

    const handleUpdate = () => {
        if (!editingSlot) return;
        const label = createSlotFromType(editingSlot.type);
        const updatedSlot = { ...editingSlot, label };
        setScheduleData(prev => updateSlot(prev, editingSlot.day, editingSlot.index, updatedSlot));
        closeModal();
    };

    const handleDelete = () => {
        if (!editingSlot) return;
        setScheduleData(prev => deleteSlot(prev, editingSlot.day, editingSlot.index));
        closeModal();
    };

    return {
        showModal,
        modalMode,
        pendingSlot,
        setPendingSlot,
        editingSlot,
        setEditingSlot,
        openForCreate,
        openForEdit,
        modalActions: {
            close: closeModal,
            add: handleAdd,
            update: handleUpdate,
            delete: handleDelete
        }
    };
};