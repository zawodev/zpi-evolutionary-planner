/* components/admin/SingleRoom.js */

import { useState, useEffect } from "react";
import MsgModal from "./modals/NotificationModal";
import ConfirmModal from "./modals/ConfirmationModal";

export default function SingleRoom({ room, onBack, onUpdate }) {
  const [roomTags, setRoomTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [roomName, setRoomName] = useState(room.building_name || "");
  const [roomSubName, setRoomSubName] = useState(room.room_number || "");
  const [capacity, setCapacity] = useState(room.capacity || 30);

  const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");

  const openModal = (text, type = "info") => {
    setModalMessage(text);
    setModalType(type);
    setIsModalOpen(true);
  };

  const fetchRoomTags = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/tags/`,
        {
          method: 'GET',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRoomTags(data);
      }
    } catch (error) {
      console.error("Error fetching room tags:", error);
    }
  };

  const fetchTags = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/scheduling/tags/',
        {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const addRoomTag = async (tag_id) => {
    const repeat = roomTags.some((t) => t.tag_id === tag_id);
    if (repeat) return;

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/scheduling/room-tags/',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ tag: tag_id, room: room.room_id })
        }
      );
      if (response.ok) {
        fetchRoomTags();
      }
    } catch (error) {
      console.error("Error adding room tag:", error);
    }
  };

  const deleteRoomTag = async (room_tag_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/room-tags/${room_tag_id}/`,
        {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      if (response.ok) {
        fetchRoomTags();
      }
    } catch (error) {
      console.error("Error deleting room tag:", error);
    }
  };

  const editRoom = async () => {
    if (!roomName || !roomSubName || !capacity) {
      openModal("Wypełnij wszystkie pola", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/`,
        {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            building_name: roomName, 
            room_number: roomSubName, 
            capacity: capacity 
          })
        }
      );
      if (response.ok) {
        openModal("Pokój zaktualizowany", "success");
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error editing room:", error);
      openModal("Błąd podczas aktualizacji pokoju", "error");
    }
  };

  const deleteRoom = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/`,
        {
          method: "DELETE",
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      if (response.ok) {
        setIsWarnModalOpen(false);
        openModal("Pokój usunięty", "success");
        setTimeout(() => {
          if (onBack) onBack();
          if (onUpdate) onUpdate();
        }, 1500);
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      openModal("Błąd podczas usuwania pokoju", "error");
    }
  };

  useEffect(() => {
    fetchRoomTags();
    fetchTags();
  }, []);

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Edycja Pokoju</h2>
        <p className="admin-content-description">
          {roomName} {roomSubName}
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
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Numer sali *</label>
            <input
              type="text"
              className="admin-input"
              placeholder="np. 101"
              value={roomSubName}
              onChange={(e) => setRoomSubName(e.target.value)}
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
          <div className="admin-form-group">
            <label className="admin-label">Dodaj cechy pokoju</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addRoomTag(e.target.value);
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

            {roomTags.length > 0 && (
              <div className="admin-tags">
                {roomTags.map((tag) => (
                  <span key={tag.tag_id} className="admin-tag">
                    {tag.tag_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => deleteRoomTag(tag.tag_id)}
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
        {onBack && (
          <button onClick={onBack} className="admin-btn secondary">
            Powrót
          </button>
        )}
        <button onClick={editRoom} className="admin-btn primary">
          Zapisz Zmiany
        </button>
        <button
          onClick={() => {
            setModalMessage("Czy na pewno chcesz usunąć ten pokój?");
            setIsWarnModalOpen(true);
          }}
          className="admin-btn danger"
        >
          Usuń Pokój
        </button>
      </div>

      <MsgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
        type={modalType}
      />

      <ConfirmModal
        isOpen={isWarnModalOpen}
        onCloseYes={deleteRoom}
        onCloseNo={() => setIsWarnModalOpen(false)}
        message={modalMessage}
      />
    </>
  );
}