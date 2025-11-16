import styles from '@/styles/components/_admin.module.css';
import { useState } from "react";
import { useEffect } from 'react';
import SingleRoom from '@/components/adminsubpgs/SingleRoom';
export default function Rooms() {
    const [selectedCategory, setSelectedCategory] = useState("AddRoom");
    const [rooms, setRooms] = useState([]);
    const [tags, setTags] = useState([]);
    const [roomTags, setRoomTags] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [room, setRoom] = useState([]);

    // Form states
    const [roomName, setRoomName] = useState("");
    const [roomSubName, setRoomSubName] = useState("");
    const [capacity, setCapacity] = useState("");
    const [tagName, setTagName] = useState("");
    const [selectedTag, setSelectedTag] = useState("");
    const fetchRooms = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
                METHOD: "GET",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRooms(data)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const addTagsToRoom = async (room_id) => {
        const token = localStorage.getItem("access_token");
        for (const RTag of roomTags) {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/room-tags/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tag: RTag.tag_id, room: room_id })
            });
            setRoomTags([]);
        }
    };

    const addRoom = async () => {
        if (!roomName) return;
        const token = localStorage.getItem("access_token");
        const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ building_name: roomName, room_number: roomSubName, capacity: capacity })
        });
        if (response.ok) {
            const room = await response.json();
            await addTagsToRoom(room.room_id)
        }

        fetchRooms();
        setRoomName("");
        setRoomSubName("");
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
            console.log(error)
        }
        console.log(tags);
    }
    const addRoomTag = (tag_id) => {
        const tag = tags.find((t) => t.tag_id === tag_id);
        const repeat = roomTags.some((t) => t.tag_id === tag_id);
        if (!repeat) {
            setRoomTags([...roomTags, tag]);
        }
        setSelectedTag("");
    }

    const addTag = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/tags/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tag_name: tagName })
            });
            if (response.ok) {
                const data = await response.json();
                await setRoomTags([...roomTags, data]);
                await fetchTags();
            }
        } catch (error) {
            console.log(error)
        }
        setTags([...tags,]);
        setTagName("");
    };

    const filteredRooms = rooms.filter(
        (u) =>
        (u.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.room_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        fetchRooms();
        fetchTags();
    }, []);

    return (
        <div className={`${styles.background} ${styles.grid}`}>
            <div className={styles.left}>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("AddRoom")}
                        className="btn btn--secondary btn--form"
                    >
                        Dodaj Pokój
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { setSelectedCategory("Rooms"); fetchRooms(); }}
                        className="btn btn--secondary btn--form"
                    >
                        Pokoje
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { setSelectedCategory("Tags"); fetchTags(); }}
                        className="btn btn--secondary btn--form"
                    >
                        Cechy pokoi
                    </button>
                </div>
            </div>

            <div className={styles.right}>
                {selectedCategory === "AddRoom" && (
                    <div>
                        <h2>Dodaj pokój</h2>
                        <h3> Tutaj możesz dodawać pokoje. Jeśli chcesz dodać cechy do pokoi udaj sie na podstronę "Cechy pokoi"</h3>
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
                                    {roomTags.map((g, i) => (
                                        <li key={i}>
                                            {g.tag_name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                                <button
                                    onClick={addRoom}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Dodaj pokój
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedCategory === "Rooms" && (
                    <div >
                        <h2>Pokoje</h2>
                        <input
                            type="text"
                            placeholder="Search attendees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <ul>
                            {filteredRooms.map((u, i) => (
                                <li key={i} onClick={() => {
                                    setRoom(u);
                                    setSelectedCategory("EditRoom");
                                }}>
                                    {u.building_name} ({u.room_number})
                                </li>
                            ))}
                            {filteredRooms.length === 0 && (
                                <p>Nie znaleziono pokoju.</p>
                            )}
                        </ul>
                    </div>
                )}

                {selectedCategory === "Tags" && (
                    <div>
                        <h2>Dodaj cechę</h2>
                        <div>
                            <div className="login-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Nazwa cechy"
                                    className="input input--login"
                                    value={tagName}
                                    onChange={(e) => setTagName(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center" }}>
                                <button
                                    onClick={addTag}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Dodaj Cechę
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3>Dostępne cechy</h3>
                            <ul>
                                {tags.map((g, i) => (
                                    <li key={i}>
                                        {g.tag_name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {selectedCategory === "EditRoom" && (
                    <SingleRoom room={room}></SingleRoom>
                )}
            </div>
        </div>
    );
}