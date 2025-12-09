import React, { useState, useEffect } from 'react';
import MsgModal from '@/components/admin/modals/NotificationModal';
import ConfirmModal from '@/components/admin/modals/ConfirmationModal';
import RoomList from '@/components/admin/rooms/RoomList';
import RoomForm from '@/components/admin/rooms/RoomForm';
import RoomStats from '@/components/admin/rooms/RoomStats';
import { useRoomData } from '@/hooks/useRoomData';

const RoomsPage = () => {
  const { 
    rooms, 
    tags, 
    fetchRooms, 
    fetchTags, 
    fetchRoomTags, 
    createRoom, 
    updateRoom, 
    deleteRoom 
  } = useRoomData();

  const [activeView, setActiveView] = useState('list');
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [formData, setFormData] = useState({
    buildingName: "",
    roomNumber: "",
    capacity: 30
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [originalRoomTags, setOriginalRoomTags] = useState([]);

  const [modal, setModal] = useState({ isOpen: false, message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: "", action: null });

  useEffect(() => {
    fetchRooms();
    fetchTags();
  }, [fetchRooms, fetchTags]);

  const showModal = (message, type = "info") => {
    setModal({ isOpen: true, message, type });
  };

  const clearForm = () => {
    setFormData({ buildingName: "", roomNumber: "", capacity: 30 });
    setSelectedTags([]);
    setSelectedRoom(null);
    setOriginalRoomTags([]);
  };

  const handleSwitchView = (view) => {
    clearForm();
    setActiveView(view);
  };

  const handleTagAdd = (tag_id) => {
    const tag = tags.find(t => t.tag_id === tag_id);
    if (tag && !selectedTags.some(t => t.tag_id === tag.tag_id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tag_id) => {
    setSelectedTags(selectedTags.filter(t => t.tag_id !== tag_id));
  };

  const handleEditClick = async (room) => {
    setSelectedRoom(room);
    setFormData({
      buildingName: room.building_name || "",
      roomNumber: room.room_number || "",
      capacity: room.capacity || 30
    });
    
    const rawRelations = await fetchRoomTags(room.room_id);
    const tagMap = new Map(tags.map(tag => [tag.tag_id, tag.tag_name]));
    
    const detailedTags = rawRelations.map(rel => ({
        id: rel.id,
        tag_id: rel.tag,
        tag_name: tagMap.get(rel.tag) || 'Nieznana Cechą',
    }));

    setOriginalRoomTags(detailedTags);
    setSelectedTags(detailedTags);
    setActiveView('edit');
  };

  const handleDeleteClick = (room) => {
    setConfirmModal({
      isOpen: true,
      message: `Czy na pewno chcesz usunąć pokój ${room.building_name} ${room.room_number}?`,
      action: async () => {
        const result = await deleteRoom(room.room_id);
        if (result.success) {
          showModal(result.message, "success");
          if (selectedRoom?.room_id === room.room_id) {
            handleSwitchView('list');
          }
        } else {
          showModal(result.message, "error");
        }
      }
    });
  };

  const handleSubmit = async () => {
    const { buildingName, roomNumber, capacity } = formData;
    
    if (!buildingName || !roomNumber || !capacity) {
      showModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    const roomPayload = {
      building_name: buildingName,
      room_number: roomNumber,
      capacity: parseInt(capacity)
    };

    let result;
    if (activeView === 'create') {
      result = await createRoom(roomPayload, selectedTags);
    } else {
      result = await updateRoom(selectedRoom.room_id, roomPayload, originalRoomTags, selectedTags);
    }

    if (result.success) {
      showModal(result.message, "success");
      handleSwitchView('list');
    } else {
      showModal(result.message, "error");
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header-section">
          <div className="admin-header-wrapper">
            <div className="admin-header-gradient">
              <div className="admin-header-content">
                <div className="admin-header-title">
                  <h1>Zarządzanie Pokojami</h1>
                  <p className="admin-header-subtitle">
                    Dodawaj i edytuj pokoje oraz ich cechy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-main">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja</h3>
              <button
                onClick={() => handleSwitchView('list')}
                className={`admin-sidebar-button ${activeView === 'list' ? 'active' : ''}`}
              >
                🏢 Lista Pokoi
              </button>
              <button
                onClick={() => handleSwitchView('create')}
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowy Pokój
              </button>
            </div>
            <RoomStats rooms={rooms} />
          </aside>

          <main className="admin-content">
            {activeView === 'list' && (
              <RoomList 
                rooms={rooms} 
                onEdit={handleEditClick} 
                onDelete={handleDeleteClick} 
              />
            )}
            
            {(activeView === 'create' || activeView === 'edit') && (
              <RoomForm
                isEditing={activeView === 'edit'}
                formData={formData}
                setFormData={setFormData}
                tags={tags}
                selectedTags={selectedTags}
                onAddTag={handleTagAdd}
                onRemoveTag={handleTagRemove}
                onSubmit={handleSubmit}
                onCancel={() => handleSwitchView('list')}
                onDelete={() => handleDeleteClick(selectedRoom)}
              />
            )}
          </main>
        </div>
      </div>

      <MsgModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        message={modal.message}
        type={modal.type}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCloseYes={() => {
          confirmModal.action && confirmModal.action();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onCloseNo={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        message={confirmModal.message}
      />
    </div>
  );
};

export default RoomsPage;