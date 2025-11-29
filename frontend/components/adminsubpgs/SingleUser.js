import { useState } from "react";
import { useEffect } from 'react';
import styles from '@/styles/components/_admin.module.css';
import MsgModal from "./MsgModal";
export default function SingleUser({ user }) {
    const [firstName, setFName] = useState(user.first_name);
    const [surName, setSName] = useState(user.last_name);
    const [userEmail, setUserEmail] = useState(user.email);
    const [userRole, setUserRole] = useState(user.role);
    const [userWeight, setUserWeight] = useState(user.weight);
    const [userGroups, setUgroups] = useState([]);
    const [groups, setGroups] = useState([]);


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [MMessage, SetMM] = useState("");
    const openModal = (text) => {
        SetMM(text)
        setIsModalOpen(true);
    }
    const closeModal = () => setIsModalOpen(false);
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
    }
    const fetchUGroups = async () => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/groups/`, {
                method: "GET",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUgroups(data);
            }
        } catch (error) {
            console.log(error)
        }
    }
    const addUtoGroup = async (user_id, group_id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/user-groups/add/`, {
                method: "POST",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    user: user_id,
                    group: group_id
                })
            });
            if (response.ok) {
                fetchUGroups();
            }
        } catch (error) {
            console.log(error)
        }
    }
    const editUser = async () => {
        if (!firstName || !surName || !userEmail) {
            openModal("Dodaj brakujące pola");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            openModal("Niepoprawny adres email");
            return;
        }
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/update/`, {
                method: "PATCH",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    email: userEmail,
                    first_name: firstName,
                    last_name: surName,
                    role: userRole,
                    weight: userWeight
                })
            });
            if (response.ok) {
                openModal("Uzytkownik zmieniony");
            }
        } catch (error) {
            console.log(error)
        }
    };
    const deleteGroupFromUser = async (group_id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/user-groups/delete/`, {
                method: "DELETE",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    user: user.id,
                    group: group_id
                })
            });
            if (response.ok) {
                fetchUGroups();
            }
        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        fetchUGroups();
        fetchGroups();
    }, []);

    return (
        <div>
            <h2>Edytuj użytkownika</h2>
            <div >
                <div className={styles.namegrid}>
                    <div className="login-input-wrapper">
                        <input
                            type="text"
                            placeholder="Imię"
                            className="input input--login"
                            value={firstName}
                            onChange={(e) => setFName(e.target.value)}
                        />
                    </div>
                    <div className="login-input-wrapper">
                        <input
                            type="text"
                            placeholder="Nazwisko"
                            className="input input--login"
                            value={surName}
                            onChange={(e) => setSName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="login-input-wrapper">
                    <input
                        type="email"
                        placeholder="Adres email"
                        className="input input--login"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                    />
                </div>
                <div className="login-button-wrapper" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <button
                        onClick={() => setUserRole("participant")}
                        className={`btn btn--form ${userRole === "participant"
                            ? styles.btnselect
                            : styles.btn
                            }`}
                    >
                        Uczestniczący
                    </button>
                    <button
                        onClick={() => setUserRole("host")}
                        className={`btn btn--form ${userRole === "host"
                            ? styles.btnselect
                            : styles.btn
                            }`}
                    >
                        Prowadzący
                    </button>
                    <button
                        onClick={() => setUserRole("office")}
                        className={`btn btn--form ${userRole === "office"
                            ? styles.btnselect
                            : styles.btn
                            }`}
                    >
                        Sekretariat
                    </button>
                </div>
                <h3>Waga użytkownika:{userWeight} (użytkownicy z większą wagą dostają lepsze plany)</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button type="button" onClick={() => {
                        setUserWeight((prev) => {
                            const newVal = parseInt((prev - 1));
                            return newVal < 1 ? 1 : newVal;
                        });
                    }}>
                        -
                    </button>
                    <input
                        type="range"
                        min={"1"}
                        max={"500"}
                        step={"1"}
                        value={userWeight}
                        onChange={(e) => setUserWeight(parseInt(e.target.value))}
                        className="login-input-wrapper"
                        style={{ flexGrow: 1 }}
                    />
                    <button type="button" onClick={() => {
                        setUserWeight((prev) => {
                            const newVal = parseFloat((prev + 1));
                            return newVal > 100 ? 100 : newVal;
                        });
                    }}>
                        +
                    </button>
                </div>
                {userRole === "participant" && groups.length > 0 && (
                    <div>
                        <label>
                            Dodaj do grupy:
                        </label>
                        <select
                            onChange={(e) => { addUtoGroup(user.id, e.target.value); }}
                        >
                            <option >Zaznacz grupę</option>
                            {groups.map((g, i) => (
                                <option key={i} value={g.group_id}>
                                    {g.group_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {userGroups.length != 0 && (
                    <div>
                        <h3>Grupy użytkownika</h3>
                        <ul>
                            {userGroups.map((g, i) => (
                                <li key={i} value={g.group_id}>
                                    {g.group_name} ({g.category})
                                    <button onClick={() => deleteGroupFromUser(g.group_id)}>
                                        Usuń
                                    </button>
                                </li>
                            ))}
                        </ul></div>
                )}
                <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                    <button
                        onClick={editUser}
                        className={`btn btn--form ${styles.btnadd}`}
                    >
                        Edytuj użytkownika
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