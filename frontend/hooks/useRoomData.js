import { useState, useCallback } from 'react';

export const useRoomData = () => {
  const [rooms, setRooms] = useState([]);
  const [tags, setTags] = useState([]);
  
  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    };
  };

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/tags/', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  }, []);

  const fetchRoomTags = async (roomId) => {
    try {
      const relationsResponse = await fetch(
        'http://127.0.0.1:8000/api/v1/scheduling/room-tags/',
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (relationsResponse.ok) {
        const allRelations = await relationsResponse.json();
        return allRelations.filter(rel => rel.room === roomId);
      }
      return [];
    } catch (error) {
      console.error("Error fetching room tags:", error);
      return [];
    }
  };

  const createRoom = async (roomData, selectedTags) => {
    const orgId = localStorage.getItem("org_id");
    if (!orgId) return { success: false, message: "Brak ID organizacji. Spróbuj się przelogować." };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...roomData, organization: orgId })
      });

      if (response.ok) {
        const data = await response.json();
        const newRoomId = data.room_id;

        if (newRoomId && selectedTags.length > 0) {
          for (const tag of selectedTags) {
            await fetch('http://127.0.0.1:8000/api/v1/scheduling/room-tags/', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ tag: tag.tag_id, room: newRoomId })
            });
          }
        }
        await fetchRooms();
        return { success: true, message: `Dodano pokój: ${roomData.building_name} ${roomData.room_number}` };
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        return { success: false, message: errorData.detail || "Błąd tworzenia pokoju" };
      }
    } catch (error) {
      return { success: false, message: "Błąd sieci/serwera" };
    }
  };

  const updateRoom = async (roomId, roomData, currentRoomTags, newSelectedTags) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${roomId}/`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(roomData)
        }
      );

      if (response.ok) {
        const currentTagIds = currentRoomTags.map(t => t.tag_id);
        const newTagIds = newSelectedTags.map(t => t.tag_id);

        for (const tag of currentRoomTags) {
          if (!newTagIds.includes(tag.tag_id)) {
            await fetch(
              `http://127.0.0.1:8000/api/v1/scheduling/room-tags/${tag.id}/`,
              { method: 'DELETE', headers: getAuthHeaders() }
            );
          }
        }

        for (const tag of newSelectedTags) {
          if (!currentTagIds.includes(tag.tag_id)) {
            await fetch('http://127.0.0.1:8000/api/v1/scheduling/room-tags/', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ tag: tag.tag_id, room: roomId })
            });
          }
        }

        await fetchRooms();
        return { success: true, message: "Pokój zaktualizowany" };
      }
      return { success: false, message: "Błąd aktualizacji API" };
    } catch (error) {
      return { success: false, message: "Błąd podczas aktualizacji pokoju" };
    }
  };

  const deleteRoom = async (roomId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/rooms/${roomId}/`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        await fetchRooms();
        return { success: true, message: "Pokój usunięty" };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.detail || "Błąd usuwania" };
      }
    } catch (error) {
      return { success: false, message: "Błąd podczas usuwania pokoju" };
    }
  };

  return {
    rooms,
    tags,
    fetchRooms,
    fetchTags,
    fetchRoomTags,
    createRoom,
    updateRoom,
    deleteRoom
  };
};