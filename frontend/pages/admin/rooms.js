/* pages/admin/rooms.js */

import React, { useState, useEffect } from 'react';
import MsgModal from '@/components/admin/MsgModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

const RoomsPage = () => {
  // ===== NAVIGATION STATE =====
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedRoom, setSelectedRoom] = useState(null);

  // ===== DATA STATE =====
  const [rooms, setRooms] = useState([]);
  const [tags, setTags] = useState([]);
  const [roomTags, setRoomTags] = useState([]);

  // ===== FORM STATE =====
  const [buildingName, setBuildingName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [selectedTags, setSelectedTags] = useState([]);

  // ===== MODAL STATE =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [confirmAction, setConfirmAction] = useState(null);

  // ===== UTILITY FUNCTIONS =====
  const openModal = (text, type = "info") => {
    setModalMessage(text);
    setModalType(type);
    setIsModalOpen(true);
  };

  const openConfirmModal = (text, action) => {
    setModalMessage(text);
    setConfirmAction(() => action);
    setIsConfirmModalOpen(true);
  };

  const clearForm = () => {
    setBuildingName("");
    setRoomNumber("");
    setCapacity(30);
    setSelectedTags([]);
    setSelectedRoom(null);
  };

  // ===== API CALLS =====
  const fetchRooms = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchTags = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/tags/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  // POPRAWIONA: pobiera klucz relacji RoomTag dla poprawnego usuwania
  const fetchRoomTags = async (room_id) => {
    const token = localStorage.getItem("access_token");
    try {
      // 1. Pobierz wszystkie relacje RoomTag (lub z filtrem, jeśli backend wspiera)
      const relationsResponse = await fetch(
        'http://127.0.0.1:8000/api/v1/scheduling/room-tags/',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );

      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        // 2. Filtruj tylko relacje dla bieżącego pokoju
        const roomRelations = allRelations.filter(rel => rel.room === room_id);
        
        // 3. Wzbogać dane o nazwę tagu, używając stanu tags
        const tagMap = new Map(tags.map(tag => [tag.tag_id, tag.tag_name]));

        const detailedTags = roomRelations.map(rel => ({
            id: rel.id,             // Klucz relacji RoomTag (niezbędny do usunięcia)
            tag_id: rel.tag,        // Klucz Tag (niezbędny do porównania)
            tag_name: tagMap.get(rel.tag) || 'Nieznana Cechą',
        }));

        setRoomTags(detailedTags);
        setSelectedTags(detailedTags);
      }
    } catch (error) {
      console.error("Error fetching room tags:", error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchTags();
  }, []);

  // ===== ROOM OPERATIONS =====
  const createRoom = async () => {
    if (!buildingName || !roomNumber || !capacity) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const orgId = localStorage.getItem("org_id");

    if (!orgId) {
        openModal("Brak ID organizacji w lokalnym magazynie. Spróbuj się przelogować.", "error");
        return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          building_name: buildingName,
          room_number: roomNumber,
          capacity: parseInt(capacity),
          organization: orgId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const newRoomId = data.room_id; 
        
        if (!newRoomId) {
            console.error("API Error: Room created but missing room_id in response data.", data);
            openModal("Pokój utworzony, ale wystąpił błąd przy pobieraniu ID. Nie można dodać cech.", "warning");
        } else {
            // Dodanie tagów do pokoju
            for (const tag of selectedTags) {
              const tagResponse = await fetch('http://127.0.0.1:8000/api/v1/scheduling/room-tags/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tag: tag.tag_id, room: newRoomId }) 
              });
              if (!tagResponse.ok) {
                const tagError = await tagResponse.text();
                console.error("Error adding tag to room:", tagResponse.status, tagError);
              }
            }
        }

        openModal(`Dodano pokój: ${buildingName} ${roomNumber}`, "success");
        fetchRooms();
        clearForm();
        setActiveView('list');
      } else {
        let errorData;
        try {
          errorData = await response.json();
          const errorMessage = errorData.detail || JSON.stringify(errorData);
          openModal(`Błąd podczas tworzenia pokoju: ${errorMessage}`, "error");
        } catch (e) {
          errorData = { detail: await response.text() };
          openModal(`Błąd podczas tworzenia pokoju: Status ${response.status}. Sprawdź konsolę.`, "error");
        }
        console.error("API Error creating room:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      openModal("Błąd podczas tworzenia pokoju (błąd sieci/serwera)", "error");
    }
  };

  const updateRoom = async () => {
    if (!buildingName || !roomNumber || !capacity) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${selectedRoom.room_id}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            building_name: buildingName,
            room_number: roomNumber,
            capacity: parseInt(capacity)
          })
        }
      );

      if (response.ok) {
        // Sync tags - remove old ones, add new ones
        const currentTagIds = roomTags.map(t => t.tag_id);
        const newTagIds = selectedTags.map(t => t.tag_id);

        // Usuń tagi, które nie są już wybrane. Używa 'tag.id' (ID relacji RoomTag).
        for (const tag of roomTags) {
          if (!newTagIds.includes(tag.tag_id)) {
            await fetch(
              `http://127.0.0.1:8000/api/v1/scheduling/room-tags/${tag.id}/`,
              {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              }
            );
          }
        }

        // Dodaj nowe tagi, których nie było wcześniej.
        for (const tag of selectedTags) {
          if (!currentTagIds.includes(tag.tag_id)) {
            await fetch('http://127.0.0.1:8000/api/v1/scheduling/room-tags/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ tag: tag.tag_id, room: selectedRoom.room_id })
            });
          }
        }

        openModal("Pokój zaktualizowany", "success");
        fetchRooms();
        clearForm();
        setActiveView('list');
      }
    } catch (error) {
      console.error("Error updating room:", error);
      openModal("Błąd podczas aktualizacji pokoju", "error");
    }
  };

  const deleteRoom = async (roomIdFromList) => {
    const roomIdToDelete = roomIdFromList || (selectedRoom && selectedRoom.room_id);
    
    if (!roomIdToDelete) {
        console.error("Attempted to delete room without a valid ID.");
        openModal("Błąd: Nie można ustalić ID pokoju do usunięcia.", "error");
        return;
    }

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${roomIdToDelete}/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setIsConfirmModalOpen(false);
        openModal("Pokój usunięty", "success");
        fetchRooms();
        
        if (selectedRoom && selectedRoom.room_id === roomIdToDelete) {
            setTimeout(() => {
                clearForm();
                setActiveView('list');
            }, 1500);
        }
      } else {
         let errorData;
         try {
            errorData = await response.json();
            openModal(`Błąd usuwania: ${errorData.detail || JSON.stringify(errorData)}`, "error");
         } catch (e) {
            openModal(`Błąd usuwania (Status: ${response.status})`, "error");
         }
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      openModal("Błąd podczas usuwania pokoju", "error");
    }
  };

  const loadRoomForEdit = (room) => {
    setSelectedRoom(room);
    setBuildingName(room.building_name || "");
    setRoomNumber(room.room_number || "");
    setCapacity(room.capacity || 30);
    fetchRoomTags(room.room_id);
    setActiveView('edit');
  };

  // ===== TAG OPERATIONS =====
  const addTag = (tag_id) => {
    // Poprawka: Użycie stringowego UUID
    const tag = tags.find(t => t.tag_id === tag_id);
    if (tag && !selectedTags.some(t => t.tag_id === tag.tag_id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag_id) => {
    setSelectedTags(selectedTags.filter(t => t.tag_id !== tag_id));
  };

  // ===== RENDER FUNCTIONS =====
  const renderRoomsList = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Pokoi</h2>
        <p className="admin-content-description">
          Wszystkie pokoje w systemie ({rooms.length})
        </p>
      </div>

      {rooms.length > 0 ? (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Budynek
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Numer Sali
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Pojemność
                </th>
                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.room_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {room.building_name}
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {room.room_number}
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {room.capacity}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => loadRoomForEdit(room)}
                      className="admin-btn-icon"
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        openConfirmModal(
                          `Czy na pewno chcesz usunąć pokój ${room.building_name} ${room.room_number}?`,
                          () => deleteRoom(room.room_id)
                        );
                      }}
                      className="admin-btn-icon danger"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">🏢</div>
          <h3 className="admin-empty-title">Brak pokoi</h3>
          <p className="admin-empty-description">
            Dodaj pierwszy pokój do systemu
          </p>
        </div>
      )}
    </>
  );

  const renderRoomForm = (isEditing) => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Pokój' : 'Nowy Pokój'}
        </h2>
        <p className="admin-content-description">
          {isEditing 
            ? `${selectedRoom?.building_name} ${selectedRoom?.room_number}` 
            : 'Wypełnij dane nowego pokoju'
          }
        </p>
      </div>

      <form className="admin-form">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Nazwa budynku *</label>
            <input
              type="text"
              className="admin-input"
              placeholder="np. Budynek A"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Numer sali *</label>
            <input
              type="text"
              className="admin-input"
              placeholder="np. 101"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Pojemność *</label>
          <input
            type="number"
            className="admin-input"
            min="1"
            placeholder="30"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>

        {tags.length > 0 && (
          <div className="admin-form-group full-width">
            <label className="admin-label">Dodaj cechy pokoju</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addTag(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz cechę...</option>
              {tags.map((tag) => (
                <option key={tag.tag_id} value={tag.tag_id}>
                  {tag.tag_name}
                </option>
              ))}
            </select>

            {selectedTags.length > 0 && (
              <div className="admin-tags">
                {selectedTags.map((tag) => (
                  <span key={tag.tag_id} className="admin-tag">
                    {tag.tag_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => removeTag(tag.tag_id)}
                    >
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      <div className="admin-actions">
        <button
          onClick={() => {
            clearForm();
            setActiveView('list');
          }}
          className="admin-btn secondary"
        >
          Anuluj
        </button>
        <button
          onClick={isEditing ? updateRoom : createRoom}
          className="admin-btn primary"
        >
          {isEditing ? 'Zapisz Zmiany' : 'Utwórz Pokój'}
        </button>
        {isEditing && (
          <button
            onClick={() => {
              openConfirmModal(
                `Czy na pewno chcesz usunąć pokój ${buildingName} ${roomNumber}?`,
                deleteRoom
              );
            }}
            className="admin-btn danger"
          >
            Usuń Pokój
          </button>
        )}
      </div>
    </>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Header */}
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

        {/* Main Content */}
        <div className="admin-main">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja</h3>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('list');
                }}
                className={`admin-sidebar-button ${activeView === 'list' ? 'active' : ''}`}
              >
                🏢 Lista Pokoi
              </button>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('create');
                }}
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowy Pokój
              </button>
            </div>

            {rooms.length > 0 && (
              <div className="admin-sidebar-section">
                <h3 className="admin-sidebar-title">Statystyki</h3>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Łącznie pokoi:</strong> {rooms.length}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Łączna pojemność:</strong>{' '}
                    {rooms.reduce((sum, r) => sum + r.capacity, 0)}
                  </p>
                </div>
              </div>
            )}
          </aside>

          {/* Content Area */}
          <main className="admin-content">
            {activeView === 'list' && renderRoomsList()}
            {activeView === 'create' && renderRoomForm(false)}
            {activeView === 'edit' && renderRoomForm(true)}
          </main>
        </div>
      </div>

      {/* Modals */}
      <MsgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
        type={modalType}
      />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCloseYes={() => {
          confirmAction && confirmAction();
          setIsConfirmModalOpen(false);
        }}
        onCloseNo={() => setIsConfirmModalOpen(false)}
        message={modalMessage}
      />
    </div>
  );
};

export default RoomsPage;