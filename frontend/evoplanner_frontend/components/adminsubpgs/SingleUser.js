import { useState } from "react";
import styles from '@/styles/components/_admin.module.css';

export default function SingleUser({ user }) {
    const [firstName, setFName] = useState(user.first_name);
    const [surName, setSName] = useState(user.last_name);
    const [userEmail, setUserEmail] = useState(user.email);
    const [userRole, setUserRole] = useState(user.role);

    const editUser = async () => {
        if (!firstName || !surName || !userEmail) return;
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
                    role: userRole
                })
            });
            if (response.ok) {

            }
        } catch (error) {
            console.log(error)
        }
    };

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
                {userRole === "attendee" && groups.length > 0 && (
                    <div>
                        <label>
                            Assign to Group:
                        </label>
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                        >
                            <option value="">Select a group</option>
                            {groups.map((g, i) => (
                                <option key={i} value={g.name}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </div>
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
        </div>
    );
}