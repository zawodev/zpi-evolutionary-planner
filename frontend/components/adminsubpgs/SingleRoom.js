import { useState } from "react";
import { useEffect } from "react";
import styles from '@/styles/components/_admin.module.css';

export default function SingleRoom({ room }) {
    const [roomTags, setRoomTags] = useState([]);
    const [addTags, setATags] = useState([]);
    const [tags, setTags] = useState([]);
    const [roomName, setRoomName] = useState(room.building_name);
    const [roomSubName, setRoomSubName] = useState(room.room_number);
    const [capacity, setCapacity] = useState(room.capacity);
    const [selectedTag, setSelectedTag] = useState("");

    const fetchRoomTags = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/tags/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
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

    const addRoomTag = (tag_id) => {
        const tag = tags.find((t) => t.tag_id === tag_id);
        const repeat = roomTags.some((t) => t.tag_id === tag_id);
        if (!repeat) {
            setATags([...addTags, tag]);
        }
        setSelectedTag("");
    }
    const editRoom = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/rooms/${room.room_id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:  JSON.stringify({ building_name: roomName, room_number: roomSubName, capacity: capacity })
            });
            for (const aTag of addTags) {
                const response2 = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/room-tags/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:  JSON.stringify({ tag: aTag.tag_id, room:room.room_id })
            });
            }
        } catch (error) {
            console.log(error)
        }
    };
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
                            value={selectedTag}
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
                        {[...addTags,...roomTags].map((g, i) => (
                            <li key={i}>
                                {g.tag_name}
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
        </div>
    );
}