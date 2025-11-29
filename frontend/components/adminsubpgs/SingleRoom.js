import { useState } from "react";
import { useEffect } from "react";
import styles from '@/styles/components/_admin.module.css';
import MsgModal from "./MsgModal";
export default function SingleRoom({ room }) {
    const [roomTags, setRoomTags] = useState([]);
    const [tags, setTags] = useState([]);
    const [roomName, setRoomName] = useState(room.building_name);
    const [roomSubName, setRoomSubName] = useState(room.room_number);
    const [capacity, setCapacity] = useState(room.capacity);


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [MMessage, SetMM] = useState("");
    const openModal = (text) => {
        SetMM(text)
        setIsModalOpen(true);
    }
    const closeModal = () => setIsModalOpen(false);
    const fetchRoomTags = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/tags/`, {
                method: 'GET',
                credentials: include,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                console.log(data);
                setRoomTags(data);
            }
        } catch (error) {
            console.log(error)
        }
    }

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
            console.log(error)
        }
    }

    const addRoomTag = async (tag_id) => {
        const tag = tags.find((t) => t.tag_id === tag_id);
        const repeat = roomTags.some((t) => t.tag_id === tag_id);
        const token = localStorage.getItem("access_token");
        if (!repeat) {
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/room-tags/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ tag: tag_id, room: room.room_id })
                });
                if (response.ok) {
                    fetchRoomTags();
                }
            } catch (error) {
                console.log(error)
            }
        }
    }
    const editRoom = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ building_name: roomName, room_number: roomSubName, capacity: capacity })
            });
            if (response.ok) {
                openModal("Pokój zmieniony");
            }
        } catch (error) {
            console.log(error)
        }
    };
    const deleteRoomTag = async (room_tag_id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/room-tags/${room_tag_id}/`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                fetchRoomTags();
            }
        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        fetchRoomTags();
        fetchTags();
    }, []);
    return (
        <div>
            <h2>Edytuj pokój</h2>
            <div>
                <div className={styles.namegrid}>
                    <div className="login-input-wrapper">
                        <input
                            type="text"
                            placeholder="Nazwa pokoju np.: nr. budynku"
                            className="input input--login"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                        />
                    </div>
                    <div className="login-input-wrapper">
                        <input
                            type="text"
                            placeholder="Podnazwa pokoju np.: numer sali"
                            className="input input--login"
                            value={roomSubName}
                            onChange={(e) => setRoomSubName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="login-input-wrapper">
                    <input
                        type="number"
                        placeholder="Pojemność pokoju"
                        className="input input--login"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                    />
                </div>
                {tags.length > 0 && (
                    <div>
                        <label>
                            Dodaj cechy pokoju:
                        </label>
                        <select
                            onChange={(e) => addRoomTag(e.target.value)}
                        >
                            <option value="">Dodaj cechę</option>
                            {tags.map((g, i) => (
                                <option key={i} value={g.tag_id}>
                                    {g.tag_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <h3>Cechy pokoju</h3>
                    <ul>
                        {roomTags.map((g, i) => (
                            <li key={i}>
                                {g.tag_name}
                                <button onClick={() => deleteRoomTag(g.tag_id)}>
                                    Usuń
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                    <button
                        onClick={editRoom}
                        className={`btn btn--form ${styles.btnadd}`}
                    >
                        Wprowadź zmiany
                    </button>
                </div>
            </div>
            <MsgModal
                isOpen={isModalOpen}
                onClose={closeModal}
                message={MMessage}
            />
        </div>
    );
}