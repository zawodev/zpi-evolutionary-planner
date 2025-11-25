import styles from '@/styles/components/_admin.module.css';
import { useState } from "react";
import { useEffect } from 'react';
import BanSlotsModal from '@/components/adminsubpgs/RecBanHours';

export default function createRec() {
    const [selectedCategory, setSelectedCategory] = useState("AddSubject");
    const [subjects, setSubjects] = useState([]);
    const [subName, setSubName] = useState("");
    const [subTags, setSubTags] = useState([]);
    const [capacity, setCapacity] = useState("");
    const [selectedTag, setSelectedTag] = useState("");

    const [tags, setTags] = useState([]);

    const [recruitmentName, setRecruitmentName] = useState("");
    const [dayStartTime, setDayStartTime] = useState("08:00");
    const [dayEndTime, setDayEndTime] = useState("16:00");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [cycleType, setCycleType] = useState("weekly");
    const [planStatus, setPlanStatus] = useState("draft");
    const [defaultTokenCount, setDefaultTokenCount] = useState(40);
    const [roundCount, setRoundCount] = useState(3);
    const [roundBreakLength, setRoundBreakLength] = useState(10);
    const [bannedBlocks, setBannedBlocks] = useState([[]]);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
    };

    const addSubTag = (tag_id) => {
        const tag = tags.find((t) => t.tag_id === tag_id);
        const repeat = subTags.some((t) => t.tag_id === tag_id);
        if (!repeat) {
            setSubTags([...subTags, tag]);
        }
        setSelectedTag("");
    }

    const addSub = () => {
        if (!subName) return;
        const newSub = {
            subject_name: subName,
            capacity: capacity,
            tags: subTags
        }
        setSubjects([...subjects, newSub]);
        setSubName("");
        setSubTags([]);
        setCapacity("");
        console.log(subjects);
    }

    const addRec = () => {
        if (!subName) return;
        const newSub = {
            subject_name: subName,
            capacity: capacity,
            tags: subTags
        }
        setSubjects([...subjects, newSub]);
        setSubName("");
        setSubTags([]);
        setCapacity("");
        console.log(subjects);
    }

    useEffect(() => {
        fetchTags();
    }, []);

    return (
        <div className={`${styles.background} ${styles.grid}`}>
            <div className={styles.left}>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("AddSubject")}
                        className="btn btn--secondary btn--form"
                    >
                        Dodaj Przedmiot
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { setSelectedCategory("AddRec"); }}
                        className="btn btn--secondary btn--form"
                    >
                        Stwórz rekrutacje
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { setSelectedCategory("Recs"); }}
                        className="btn btn--secondary btn--form"
                    >
                        Zarządzaj rekrutacjami
                    </button>
                </div>
            </div>

            <div className={styles.right}>
                {selectedCategory === "AddSubject" && (
                    <div>
                        <h2 >Dodaj przedmiot</h2>
                        <div>
                            <div className="login-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Nazwa przedmiotu"
                                    className="input input--login"
                                    value={subName}
                                    onChange={(e) => setSubName(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Ile uczestników w jednej grupie"
                                    className="input input--login"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                />
                            </div>
                            {tags.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj cechy wymagane do prowadzenia przedmiotu pokoju:
                                    </label>
                                    <select
                                        value={selectedTag}
                                        onChange={(e) => addSubTag(e.target.value)}
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
                                <h3>Cechy przedmiotu</h3>
                                <ul>
                                    {subTags.map((g, i) => (
                                        <li key={i}>
                                            {g.tag_name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                                <button
                                    onClick={addSub}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Dodaj przedmiot
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedCategory === "AddRec" && (
                    <div>
                        <h2>Stwórz rekrutacje</h2>

                        <div className="login-input-wrapper">
                            <input
                                type="text"
                                placeholder="Nazwa"
                                value={recruitmentName}
                                onChange={(e) => setRecruitmentName(e.target.value)}
                                className="login-input-wrapper"
                            />

                            <label>Początek dnia</label>
                            <input
                                type="time"
                                min="00:00"
                                step="900"
                                value={dayStartTime}
                                onChange={(e) => setDayStartTime(e.target.value)}
                                className="login-input-wrapper"
                            />

                            <label>Koniec dnia</label>
                            <input
                                type="time"
                                min="00:00"
                                step="900"
                                value={dayEndTime}
                                onChange={(e) => setDayEndTime(e.target.value)}
                                className="login-input-wrapper"
                            />

                            <label>Początek harmonogramu</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="login-input-wrapper"
                            />

                            <label>Koniec harmonogramu</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="login-input-wrapper"
                            />

                            <label>Typ harmonogramu</label>
                            <select
                                value={cycleType}
                                onChange={(e) => setCycleType(e.target.value)}
                                className="login-input-wrapper"
                            >
                                <option value="weekly">Tygodniowy</option>
                                <option value="biweekly">Dwutygodniowy</option>
                                <option value="monthly">Miesięczny</option>
                            </select>

                            <label>Status rekrutacji</label>
                            <select
                                value={planStatus}
                                onChange={(e) => setPlanStatus(e.target.value)}
                                className="login-input-wrapper"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                            </select>
                            <label>Dopuszczona liczba punktów preferencji</label>
                            <input
                                type="number"
                                placeholder="Dopuszczona liczba preferencji"
                                value={defaultTokenCount}
                                onChange={(e) => setDefaultTokenCount(e.target.value)}
                                className="login-input-wrapper"
                            />
                            <label>Liczba tur</label>
                            <input
                                type="number"
                                placeholder="Liczba tur"
                                value={roundCount}
                                onChange={(e) => setRoundCount(e.target.value)}
                                className="login-input-wrapper"
                            />
                            <label>Długość tury - sekundyi</label>
                            <input
                                type="number"
                                placeholder="Długość tury - sekundy"
                                value={roundBreakLength}
                                onChange={(e) => setRoundBreakLength(e.target.value)}
                                className="login-input-wrapper"
                            />
                            <div className={styles.namegrid}>
                                <button
                                    onClick={addRec}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Dodaj przedmioty
                                </button><button
                                    type="button"
                                    onClick={() => { setIsModalOpen(true); console.log(isModalOpen) }}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Ustal niedostępne godziny
                                </button>
                            </div>
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                                <button
                                    onClick={addRec}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Stwórz
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        <BanSlotsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={(grid) => {
                setBannedBlocks(grid);
                setIsModalOpen(false);
                console.log("Banned slots saved:", grid);
            }}
            startTime={dayStartTime}
            endTime={dayEndTime}
            mode={cycleType}
            initialBannedSlots={bannedBlocks}
        />
        </div>
    );
}