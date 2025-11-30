import styles from '@/styles/components/_admin.module.css';
import { useState } from "react";
import { useEffect } from 'react';
import MsgModal from '@/components/adminsubpgs/MsgModal';
import SingleUser from '@/components/adminsubpgs/SingleUser';
export default function Users() {
    const [selectedCategory, setSelectedCategory] = useState("Users");
    //data
    const [participants, setParticipants] = useState([]);
    const [hosts, setHosts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchTermH, setSearchTermH] = useState("");

    // Form states - user
    const [firstName, setFName] = useState("");
    const [surName, setSName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("participant");
    const [userWeight, setUserWeight] = useState(250);
    // Form states - group
    const [groupName, setGroupName] = useState("");
    const [groupCat, setGroupCat] = useState("");
    const [uGroups, setUGroups] = useState([]);

    const isValidEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    //stupid fucking state
    const [user, setUser] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [MMessage, SetMM] = useState("");
    const openModal = (text) => {
        SetMM(text)
        setIsModalOpen(true);
    }
    const closeModal = () => setIsModalOpen(false);

    const fetchUsers = async () => {
        setParticipants([]);
        setHosts([]);
        const token = localStorage.getItem("access_token");
        const org_id = localStorage.getItem("org_id");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/users/`, {
                method: "GET",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const hostsArr = [];
                const participantsArr = [];
                data.forEach(user => {
                    if (user.role === 'host') {
                        hostsArr.push(user);
                    } else if (user.role === 'participant') {
                        participantsArr.push(user);
                    }
                });
                setHosts(hostsArr);
                setParticipants(participantsArr);
            }
        } catch (error) {
            console.log(error)
        }
    }
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
                const filteredData = data.filter(g => g.category!=='meeting')
                setGroups(filteredData);
            }
        } catch (error) {
            console.log(error)
        }
    }
    const deleteGroup = async (group_id) => {
        const token = localStorage.getItem("access_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/groups/delete/${group_id}/`, {
                method: "DELETE",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                openModal("grupa usunięta");
                fetchGroups();
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
            }
        } catch (error) {
            console.log(error)
        }
    }
    const addUser = async () => {
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
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/create/random/`, {
                method: "POST",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    email: userEmail,
                    first_name: firstName,
                    last_name: surName,
                    role: userRole,
                    weight: userWeight,
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user.role === 'host') {
                    setHosts([...hosts, data.user]);
                }
                if (data.user.role === 'participant') {
                    setParticipants([...participants, data.user]);
                }
                const promises = uGroups.map(group => addUtoGroup(data.user.id, group.group_id));
                Promise.all(promises)
                    .then(() => {
                        setUGroups([]);
                    })
                    .catch(error => {
                        console.log(error);
                    });
                openModal("Użytkownik dodany");
            }
        } catch (error) {
            console.log(error)
        }

        setFName("");
        setSName("");
        setUserEmail("");
        setUserWeight(250);
    };

    const addGroup = async () => {
        if (!groupName) return;
        const token = localStorage.getItem("access_token");
        const org_id = localStorage.getItem("org_id");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/groups/add/`, {
                method: "POST",
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    group_name: groupName,
                    organization_id: org_id,
                    category: groupCat
                })
            });
            if (response.ok) {
                const data = await response.json();
                console.log(data);
                fetchGroups();
                openModal("grupa Dodana");
            }
        } catch (error) {
            console.log(error)
        }
        setGroupName("");
        setGroupCat("");
    };
    const addGtoUGroup = (group_id) => {
        const group = groups.find(g => g.group_id === group_id);
        setUGroups([...uGroups, group]);
    }
    const filteredParticipants = participants.filter(
        (u) =>
        (u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const filteredHosts = hosts.filter(
        (u) =>
        (u.first_name.toLowerCase().includes(searchTermH.toLowerCase()) || u.last_name.toLowerCase().includes(searchTermH.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTermH.toLowerCase()))
    );
    useEffect(() => {
        fetchUsers();
        fetchGroups();
    }, []);

    return (
        <div className={`${styles.background} ${styles.grid}`}>
            <div className={styles.left}>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("Users")}
                        className="btn btn--secondary btn--form"
                    >
                        Dodaj użytkownika
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { fetchUsers(); setSelectedCategory("participants"); }}
                        className="btn btn--secondary btn--form"
                    >
                        Uczestniczący
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { fetchUsers(); setSelectedCategory("hosts"); }}
                        className="btn btn--secondary btn--form"
                    >
                        Prowadzący
                    </button>
                </div>
                <div className="login-button-wrapper">
                    <button
                        type="button"
                        onClick={() => { fetchGroups(); setSelectedCategory("Groups") }}
                        className="btn btn--secondary btn--form"
                    >
                        Grupy
                    </button>
                </div>
            </div>

            <div className={styles.right}>
                {selectedCategory === "Users" && (
                    <div>
                        <h2>Dodaj użytkownika</h2>
                        <h3> Tutaj możesz dodawać użytkowników. Po wypełnieniu formularza nasz system automatycznie wyśle email zawierający login i hasło na podany adres. Jeśli chcesz dodać uczestników do grup udaj sie na podstronę "Grupy"</h3>
                        <div >
                            <div className={styles.namegrid}>
                                <div className="login-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Imię"
                                        className="input input--login"
                                        style={!firstName ? { border: "2px solid red" } : {}}
                                        value={firstName}
                                        onChange={(e) => setFName(e.target.value)}
                                    />
                                </div>
                                <div className="login-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Nazwisko"
                                        className="input input--login"
                                        style={!surName ? { border: "2px solid red" } : {}}
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
                                    style={userEmail && !isValidEmail(userEmail) ? { border: "2px solid red" } : {}}
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
                                        onChange={(e) => { const id = e.target.value; addGtoUGroup(id); }}
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
                            {uGroups.length != 0 && (
                                <div>
                                    <h3>Grupy użytkownika</h3>
                                    <ul>
                                        {uGroups.map((g, i) => (
                                            <li key={i}>
                                                {g.group_name} ({g.category})
                                                <button onClick={() => setUGroups(uGroups.filter(group => group.group_id !== g.group_id))}>
                                                    Usuń
                                                </button>
                                            </li>
                                        ))}
                                    </ul></div>
                            )}
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center", padding: "10vh" }}>
                                <button
                                    onClick={addUser}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Dodaj użytkownika
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedCategory === "participants" && (
                    <div>
                        <h2>Uczestniczący</h2>
                        <input
                            type="text"
                            placeholder="Search participants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <ul>
                            {filteredParticipants.map((u, i) => (
                                <li key={i} >
                                    {u.first_name} {u.last_name} ({u.email}) <button onClick={() => {
                                        setUser(u);
                                        setSelectedCategory("EditUser");
                                    }} > Edytuj</button>
                                </li>
                            ))}
                            {filteredParticipants.length === 0 && (
                                <p>Nie znaleziono uczestników dla tych parametrów.</p>
                            )}
                        </ul>
                    </div>
                )}

                {selectedCategory === "hosts" && (
                    <div>
                        <h2>Prowadzący</h2>
                        <input
                            type="text"
                            placeholder="Search participants..."
                            value={searchTermH}
                            onChange={(e) => setSearchTermH(e.target.value)}
                        />
                        <ul>
                            {filteredHosts
                                .map((u, i) => (
                                    <li key={i} >
                                        {u.first_name} {u.last_name} ({u.email}) <button onClick={() => {
                                            setUser(u);
                                            setSelectedCategory("EditUser");
                                        }} > Edytuj</button>
                                    </li>
                                ))}
                            {hosts.length === 0 && (
                                <p>Nie ma jeszcze prowadzących.</p>
                            )}
                        </ul>
                    </div>
                )}

                {selectedCategory === "Groups" && (
                    <div>
                        <h2>Dodaj grupę</h2>
                        <div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Nazwa grupy"
                                    className="input input--login"
                                    style={!groupName ? { border: "2px solid red" } : {}}
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Kategoria grupy"
                                    className="input input--login"
                                    style={!groupCat ? { border: "2px solid red" } : {}}
                                    value={groupCat}
                                    onChange={(e) => setGroupCat(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '100%', display: 'flex', justifyContent: "center" }}>
                                <button
                                    onClick={addGroup}
                                    className={`btn btn--form ${styles.btnadd}`}
                                >
                                    Dodaj grupę
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3>Wszystkie grupy</h3>
                            <ul>
                                {groups.map((g, i) => (
                                    <li key={i}>
                                        {g.group_name} ({g.category})
                                        <button onClick={() => deleteGroup(g.group_id)}>
                                            Usuń
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {selectedCategory === "EditUser" && (
                    <SingleUser user={user}></SingleUser>
                )}
            </div>
            <MsgModal
                isOpen={isModalOpen}
                onClose={closeModal}
                message={MMessage}
            />
        </div>
    );
}