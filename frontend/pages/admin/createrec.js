import styles from '@/styles/components/_admin.module.css';
import { useState } from "react";
import { useEffect } from 'react';
import BanSlotsModal from '@/components/adminsubpgs/RecBanHours';
import MsgModal from '@/components/adminsubpgs/MsgModal';
export default function createRec() {
    const [selectedCategory, setSelectedCategory] = useState("AddSubject");
    //Subject
    const [subjects, setSubjects] = useState([]);
    const [subName, setSubName] = useState("");
    const [capacity, setCapacity] = useState("");
    const [duration, setDuration] = useState("");
    const [minParp, setParp] = useState("");
    const [breakB, setBreakB] = useState("");
    const [breakA, setBreakA] = useState("");
    //susbset of tags, hosts and groups for subject
    const [subTags, setSubTags] = useState([]);
    const [subTeachers, setTeachers] = useState([]);
    const [subGroups, setSubGroups] = useState([]); //groups for subject (ignores global groups)
    //all hosts and tags and groups
    const [hosts, setHosts] = useState([]);
    const [tags, setTags] = useState([]);
    const [groups, setGroups] = useState([]);
    //recruitment
    const [recruitmentName, setRecruitmentName] = useState("");
    const [dayStartTime, setDayStartTime] = useState("08:00");
    const [dayEndTime, setDayEndTime] = useState("16:00");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [prefDate, setPrefDate] = useState("");
    const [prefDateEnd, setPrefDateEnd] = useState("");
    const [cycleType, setCycleType] = useState("weekly");
    const [planStatus, setPlanStatus] = useState("draft");
    const [defaultTokenCount, setDefaultTokenCount] = useState(40);
    const [roundBreakLength, setRoundBreakLength] = useState(10);
    const [bannedBlocks, setBannedBlocks] = useState([[]]); // is this real?
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recGroups, setRecGroups] = useState([]); //global groups (all subjects)
    //copying recs states
    const [recs, setRecs] = useState([]);
    const [prevSubs, setPrevSubs] = useState([]);
    const [isMModalOpen, setIsMModalOpen] = useState(false);
    const [MMessage, SetMM] = useState("");
    //editing subject state
    const [editIndex, setEditIndex] = useState("");
    const openModal = (text) => {
        SetMM(text)
        setIsMModalOpen(true);
    }
    const closeModal = () => setIsMModalOpen(false);

    const fetchRecs = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/recruitments/', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setRecs(data);
            }
        } catch (error) {
            console.log(error)
        }
        console.log(tags);
    };
    const fetchPrevSubs = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/subjects/', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setPrevSubs(data);
            }
        } catch (error) {
            console.log(error)
        }
        console.log(tags);
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
    };
    const fetchGroups = async () => {
        const token = localStorage.getItem("access_token");
        const org_id = localStorage.getItem("org_id");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/groups/`, {
                method: "GET",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setGroups(data);
            }
        } catch (error) {
            console.log(error)
        }
    };
    const fetchHosts = async () => {
        const token = localStorage.getItem("access_token");
        const org = localStorage.getItem("org_id");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${org}/hosts/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setHosts(data);
            }
        } catch (error) {
            console.log(error)
        }
    };
    const addTagtoSub = async (subject_id, tag_id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/subject-tags/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subject: subject_id,
                    tag: tag_id
                })
            });
            if (response.ok) {

            }
        } catch (error) {
            console.log(error)
        }
    }
    const addHosttoSub = async (subject_id, id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/subject-groups/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subject: subject_id,
                    host_user: id
                })
            });
            if (response.ok) {
            }
        } catch (error) {
            console.log(error)
        }
    }
    const addGrouptoSub = async (rec_id, group_id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/identity/user-recruitments/bulk_add_group/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    recruitment: rec_id,
                    group: group_id
                })
            });
            if (response.ok) {
            }
        } catch (error) {
            console.log(error)
        }
    }
    const createSub = async (rec_id, name, part, cap, dur, tags, hosts, break_before, break_after) => {
        const token = localStorage.getItem("access_token");
        console.log(rec_id)
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/subjects/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subject_name: name,
                    duration_blocks: dur,
                    capacity: cap,
                    min_students: part,
                    recruitment: rec_id,
                    break_before: break_before,
                    break_after: break_after
                })
            });
            if (response.ok) {
                const data = await response.json();
                tags.forEach(t => {
                    addTagtoSub(data.subject_id, t.tag_id);
                });
                hosts.forEach(h => {
                    addHosttoSub(data.subject_id, h.id);
                });
                //im going to kill kacper zakrzewski
                //if (groups.length === 0) {
                //    groups.forEach(g => addGrouptoSub(data.subject_id, g.group_id));
                //} else {
                //    recGroups.forEach(g => addGrouptoSub(data.subject_id, g.group_id));
                //}
                setRecGroups([]);
                setSubjects([]);
            }
        } catch (error) {
            console.log(error)
        }
    };
    const addRec = async () => {
        if (
            !recruitmentName || !dayStartTime || !dayEndTime || !prefDate || !startDate ||
            !prefDateEnd || !endDate || !cycleType || !planStatus || defaultTokenCount === "" || roundBreakLength === ""
        ) {
            openModal('Wypełnij wszystkie pola');
            return;
        }
        if (dayStartTime >= dayEndTime) {
            openModal("Godzina rozpoczęcia dnia nie może być późniejsza niż godzina zakończenia.");
            return;
        }
        if (!(prefDate < prefDateEnd && prefDateEnd <= startDate && startDate < endDate)) {
            openModal("Daty muszą być w kolejności: start preferencji < koniec preferencji < start planu < koniec planu.");
            return;
        }
        const token = localStorage.getItem("access_token");
        const org = localStorage.getItem("org_id");
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/recruitments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    recruitment_name: recruitmentName,
                    organization: org,
                    day_start_time: dayStartTime,
                    day_end_time: dayEndTime,
                    user_prefs_start_date: prefDate,
                    plan_start_date: startDate,
                    user_prefs_end_date: prefDateEnd,
                    expiration_date: endDate,
                    cycle_type: cycleType,
                    plan_status: planStatus,
                    default_token_count: defaultTokenCount,
                    max_round_execution_time: roundBreakLength
                })
            });
            if (response.ok) {
                const data = await response.json();
                console.log(subjects);
                subjects.forEach(sub => {
                    createSub(data.recruitment_id, sub.subject_name, sub.min_students, sub.capacity, sub.duration, sub.tags, sub.hosts, sub.break_before, sub.break_after);
                });
                recGroups.forEach(g => addGrouptoSub(data.recruitment_id, g.group_id));
                openModal(`Dodano rekrutacje ${data.recruitment_name}`);
                fetchRecs();
            }
        } catch (error) {
            console.log(error)
        }
    };

    const addSubTag = (tag_id) => {
        const repeat = subTags.some((t) => t.tag_id === tag_id);
        if (!repeat) {
            const tag = tags.find(t => t.tag_id === tag_id);
            setSubTags([...subTags, tag]);
        }
    }
    const deleteSubTag = (tag_id) => {
        const newst = subTags.filter(obj => obj.tag_id !== tag_id);
        setSubTags(newst);
    }
    const addSubTeach = (host_id) => {
        const repeat = subTeachers.some((t) => t.id === host_id);
        if (!repeat) {
            const host = hosts.find(h => h.id === host_id)
            setTeachers([...subTeachers, host]);
        }
    }
    const deleteSubTeach = (host_id) => {
        const newt = subTeachers.filter(obj => obj.id !== host_id);
        setTeachers(newt);
    }
    /*
    const addSubGroup = (group_id) => {
        const repeat = subGroups.some((t) => t.id === group_id);
        if (!repeat) {
            const group = groups.find(h => h.group_id === group_id)
            setSubGroups([...subGroups, group]);
        }
    }
    const deleteSubGroup = (group_id) => {
        const newt = subGroups.filter(obj => obj.group_id !== group_id);
        setSubGroups(newt);
    }*/
    const addRecGroup = (group_id) => {
        const repeat = recGroups.some((t) => t.group_id === group_id);
        if (!repeat) {
            const group = groups.find(h => h.group_id === group_id)
            setRecGroups([...recGroups, group]);
        }
    }
    const deleteRecGroup = (group_id) => {
        const newt = recGroups.filter(obj => obj.group_id !== group_id);
        setRecGroups(newt);
    }
    const setEditSub = (s) => {
        setSubName(s.subject_name);
        setCapacity(s.capacity);
        setDuration(s.duration);
        setSubTags(s.tags);
        setParp(s.min_students);
        setTeachers(s.hosts);
        setSubGroups(s.groups);
        setBreakB(s.break_before);
        setBreakA(s.break_after);
    }
    const addSub = () => {
        if (!subName || !capacity || !duration) {
            openModal("Wypełnij pola");
            return;
        };
        if (Number(capacity) < Number(minParp)) {
            openModal("Minimalna liczba studentów nie może przkraczać maksymalnej");
            return;
        };
        if (subTeachers.length === 0) {
            openModal("Co najmniej jeden prowadzący wymagany");
            return;
        }
        const newSub = {
            subject_name: subName,
            capacity: capacity,
            duration: duration,
            tags: subTags,
            min_students: minParp,
            hosts: subTeachers,
            groups: subGroups,
            break_before: breakB,
            break_after: breakA
        }
        openModal(`Dodano przedmiot ${newSub.subject_name}`);
        setSubjects([...subjects, newSub]);
        setSubName("");
        setSubTags([]);
        setTeachers([]);
        setSubGroups([]);
        setCapacity("");
        setParp("");
        setDuration("");
        console.log(subjects);
    }
    const copyRec = (rec_id) => {
        setSubjects([]);
        const rec = recs.find(r => r.recruitment_id === rec_id);
        const subs = prevSubs.filter(s => s.recruitment === rec_id);
        console.log(subs);
        setRecruitmentName(rec.recruitment_name);
        setDayStartTime(rec.day_start_time);
        setDayEndTime(rec.day_end_time);
        setDefaultTokenCount(rec.default_token_count);
        setPlanStatus("draft");
        setRoundBreakLength(rec.max_round_execution_time);
        const newSub = subs.map(s => ({
            subject_name: s.subject_name,
            capacity: s.capacity,
            duration: s.duration_blocks,
            tags: subTags,
            min_students: s.min_students,
            hosts: subTeachers,
            groups: subGroups,
            break_before: s.break_before,
            break_after: s.break_after
        }));
        setSubjects(newSub);
        openModal(`Skopiowano ustawienia z ${rec.recruitment_name}. Dodaj czasy rozpoczęcia w zakładce Stwórz rekrutacje`);
    }
    const editSubject = () => {
        if (subTeachers.length === 0) {
            openModal("Co najmniej jeden prowadzący wymagany");
            return;
        }
        const newSub = {
            subject_name: subName,
            capacity: capacity,
            duration: duration,
            tags: subTags,
            min_students: minParp,
            hosts: subTeachers,
            groups: subGroups,
            break_before: breakB,
            break_after: breakA
        }
        setSubjects(subjects.map((s, i) => {
            if (i === editIndex) {
                return newSub;
            }
            return s;
        }));
        openModal('Edycja zakończona');
        setSelectedCategory("MngSub");
    }

    useEffect(() => {
        fetchTags();
        fetchHosts();
        fetchGroups();
        fetchRecs();
        fetchPrevSubs();
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
                        onClick={() => { setSelectedCategory("MngSub"); console.log(subjects) }}
                        className="btn btn--secondary btn--form"
                    >
                        Zarządzaj przedmiotami
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { setSelectedCategory("CopyRec"); console.log(subjects) }}
                        className="btn btn--secondary btn--form"
                    >
                        Skopiuj ustawienia z poprzedniej rekrutacji
                    </button>
                </div>
            </div>

            <div className={styles.right}>
                {selectedCategory === "CopyRec" && (
                    <div>
                        {recs.length > 0 ? (
                            <div>
                                {recs.map((r, i) => (
                                    <li key={i}>
                                        <div className="login-button-wrapper">
                                            <button
                                                type="button"
                                                onClick={() => { copyRec(r.recruitment_id) }}
                                                className="btn btn--secondary btn--form"
                                            >
                                                {r.recruitment_name}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </div>
                        ) : (
                            <p>Brak poprzednich rekrutacji.</p>
                        )}
                    </div>
                )}
                {selectedCategory === "MngSub" && (
                    <div>
                        {subjects.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Przedmiot</th>
                                        <th>Maksymalna liczba uczestników</th>
                                        <th>Długość (15 minutowe bloki)</th>
                                        <th>Wymagane cechy sali</th>
                                        <th>Minimum uczestników</th>
                                        <th>Prowadzący</th>
                                        <th>Przerwa przed</th>
                                        <th>Przerwa po</th>
                                        <th>Edytuj</th>
                                        <th>Usuń</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.map((s, i) => (
                                        <tr>
                                            <td>{s.subject_name}</td>
                                            <td>{s.capacity}</td>
                                            <td>{s.duration}</td>
                                            <td>
                                                <ul>
                                                    {s.tags.length === 0 ? (<p>Brak</p>) :
                                                        (
                                                            s.tags.map((t) => (
                                                                <li>
                                                                    {t.tag_name}
                                                                </li>
                                                            ))
                                                        )
                                                    }
                                                </ul>
                                            </td>
                                            <td>{s.min_students}</td>
                                            <td>
                                                <ul>
                                                    {s.hosts.length === 0 ? (<p>Brak</p>) :
                                                        (
                                                            s.hosts.map((h) => (
                                                                <li>
                                                                    {h.first_name} {h.last_name} ({h.email})
                                                                </li>
                                                            ))
                                                        )
                                                    }
                                                </ul>
                                            </td>
                                            <td>{s.break_before}</td>
                                            <td>{s.break_after}</td>
                                            <td><button onClick={() => { setEditSub(s); setEditIndex(i); setSelectedCategory("EditSubject") }}>Edytuj</button></td>
                                            <td><button onClick={() => setSubjects(subjects.filter(sub => sub !== s))}>Usuń</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>Brak przedmiotów dla tej rekrutacji.</p>
                        )}
                    </div>
                )}
                {selectedCategory === "EditSubject" && (
                    <div>
                        <h2 >Edytuj przedmiot</h2>
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
                                    placeholder="Ile uczestników maksymalnie w jednej grupie"
                                    className="input input--login"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Ile 15 minutowych 'bloków trwa spotkanie"
                                    className="input input--login"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Minimalna liczba uczestników do stworzenia grupy"
                                    className="input input--login"
                                    value={minParp}
                                    onChange={(e) => setParp(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Liczba bloków przerwy przed"
                                    className="input input--login"
                                    value={breakB}
                                    onChange={(e) => setBreakB(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Liczba bloków przerwy po"
                                    className="input input--login"
                                    value={breakA}
                                    onChange={(e) => setBreakA(e.target.value)}
                                />
                            </div>
                            {tags.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj cechy pokoju wymagane do prowadzenia spotkania:
                                    </label>
                                    <select
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
                            {hosts.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj prowadzących którzy prowadzą spotkanie:
                                    </label>
                                    <select
                                        onChange={(e) => { addSubTeach(e.target.value); e.target.value = ""; }}
                                    >
                                        <option >Dodaj prowadzącego</option>
                                        {hosts.map((u, i) => (
                                            <option key={i} value={u.id}>
                                                {u.first_name} {u.last_name} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/*{groups.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj uczestników którzy muszą być na tym spotkaniu (ta opcja nadpisuje globalne grupy rekrutacji):
                                    </label>
                                    <select
                                        onChange={(e) => addSubGroup(e.target.value)}
                                    >
                                        <option>Dodaj grupę uczestników</option>
                                        {groups.map((u, i) => (
                                            <option key={i} value={u.group_id}>
                                                {u.group_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )} */}
                            <div>
                                <h3>Cechy spotkania</h3>
                                <ul>
                                    {subTags.map((g, i) => (
                                        <li key={i}>
                                            {g.tag_name} <button onClick={() => deleteSubTag(g.tag_id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3>Prowadzący spotkania - każdy prowadzi inne</h3>
                                <ul>
                                    {subTeachers.map((u, i) => (
                                        <li key={i}>
                                            {u.first_name} {u.last_name} ({u.email}) <button onClick={() => deleteSubTeach(u.id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/*<div>
                                <h3>Uczestnicy spotkania</h3>
                                <ul>
                                    {subGroups.map((u, i) => (
                                        <li key={i}>
                                            {u.group_name} <button onClick={() => deleteSubGroup(u.group_id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div> */}
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                                <button
                                    onClick={editSubject}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Edytuj przedmiot
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
                                    placeholder="Ile uczestników maksymalnie w jednej grupie"
                                    className="input input--login"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Ile 15 minutowych 'bloków trwa spotkanie"
                                    className="input input--login"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Minimalna liczba uczestników do stworzenia grupy"
                                    className="input input--login"
                                    value={minParp}
                                    onChange={(e) => setParp(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Liczba bloków przerwy przed"
                                    className="input input--login"
                                    value={breakB}
                                    onChange={(e) => setBreakB(e.target.value)}
                                />
                            </div>
                            <div className="login-input-wrapper">
                                <input
                                    type="number"
                                    placeholder="Liczba bloków przerwy po"
                                    className="input input--login"
                                    value={breakA}
                                    onChange={(e) => setBreakA(e.target.value)}
                                />
                            </div>
                            {tags.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj cechy pokoju wymagane do prowadzenia spotkania:
                                    </label>
                                    <select
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
                            {hosts.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj prowadzących którzy prowadzą spotkanie:
                                    </label>
                                    <select
                                        onChange={(e) => { addSubTeach(e.target.value); e.target.value = ""; }}
                                    >
                                        <option >Dodaj prowadzącego</option>
                                        {hosts.map((u, i) => (
                                            <option key={i} value={u.id}>
                                                {u.first_name} {u.last_name} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/*{groups.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj uczestników którzy muszą być na tym spotkaniu (ta opcja nadpisuje globalne grupy rekrutacji):
                                    </label>
                                    <select
                                        onChange={(e) => addSubGroup(e.target.value)}
                                    >
                                        <option>Dodaj grupę uczestników</option>
                                        {groups.map((u, i) => (
                                            <option key={i} value={u.group_id}>
                                                {u.group_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )} */}
                            <div>
                                <h3>Cechy spotkania</h3>
                                <ul>
                                    {subTags.map((g, i) => (
                                        <li key={i}>
                                            {g.tag_name} <button onClick={() => deleteSubTag(g.tag_id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3>Prowadzący spotkania - każdy prowadzi inne</h3>
                                <ul>
                                    {subTeachers.map((u, i) => (
                                        <li key={i}>
                                            {u.first_name} {u.last_name} ({u.email}) <button onClick={() => deleteSubTeach(u.id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/*<div>
                                <h3>Uczestnicy spotkania</h3>
                                <ul>
                                    {subGroups.map((u, i) => (
                                        <li key={i}>
                                            {u.group_name} <button onClick={() => deleteSubGroup(u.group_id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div> */}
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
                            <label>Początek wybierania preferencji</label>
                            <input
                                type="datetime-local"
                                value={prefDate}
                                onChange={(e) => setPrefDate(e.target.value)}
                                className="login-input-wrapper"
                            />
                            <label>Koniec wybierania preferencji</label>
                            <input
                                type="datetime-local"
                                value={prefDateEnd}
                                onChange={(e) => setPrefDateEnd(e.target.value)}
                                className="login-input-wrapper"
                            />
                            <label>Początek harmonogramu</label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="login-input-wrapper"
                            />

                            <label>Koniec harmonogramu</label>
                            <input
                                type="datetime-local"
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
                            <label>Długość tury - sekundy</label>
                            <input
                                type="range" min="120" max="7200"
                                placeholder="Długość tury - sekundy"
                                value={roundBreakLength}
                                onChange={(e) => setRoundBreakLength(e.target.value)}
                                className="login-input-wrapper"
                            />
                            {groups.length > 0 && (
                                <div>
                                    <label>
                                        Dodaj uczestników którzy biorą udział w rekrutacji
                                    </label>
                                    <select
                                        onChange={(e) => addRecGroup(e.target.value)}
                                    >
                                        <option>Dodaj grupę uczestników</option>
                                        {groups.map((u, i) => (
                                            <option key={i} value={u.group_id}>
                                                {u.group_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <h3>Uczestnicy rekrutacji</h3>
                                <ul>
                                    {recGroups.map((u, i) => (
                                        <li key={i}>
                                            {u.group_name} <button onClick={() => deleteRecGroup(u.group_id)}>Usuń</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/*<div className={styles.namegrid}>
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
                            </div>*/}
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
            <MsgModal
                isOpen={isMModalOpen}
                onClose={closeModal}
                message={MMessage}
            />
        </div>
    );
}