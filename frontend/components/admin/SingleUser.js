/* components/admin/SingleUser.js */

import { useState, useEffect } from "react";
import MsgModal from "./MsgModal";
import ConfirmModal from "./ConfirmModal";

export default function SingleUser({ user, onBack, onUpdate }) {
  // ZMIANA 1: Bezpieczne parsowanie wagi przy inicjalizacji
  const [firstName, setFName] = useState(user.first_name || "");
  const [surName, setSName] = useState(user.last_name || "");
  const [userEmail, setUserEmail] = useState(user.email || "");
  const [userRole, setUserRole] = useState(user.role || "participant");
  const [userWeight, setUserWeight] = useState(parseInt(user.weight) || 5);
  const [userGroups, setUgroups] = useState([]);
  const [groups, setGroups] = useState([]);

  const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const openModal = (text, type = "info") => {
    setModalMessage(text);
    setModalType(type);
    setIsModalOpen(true);
  };

  const fetchGroups = async () => {
    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/groups/`,
        {
          method: "GET",
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter(g => g.category !== 'meeting');
        setGroups(filtered);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchUGroups = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${user.id}/groups/`,
        {
          method: "GET",
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter(g => g.category !== 'meeting');
        setUgroups(filtered);
      }
    } catch (error) {
      console.error("Error fetching user groups:", error);
    }
  };

  const addUtoGroup = async (user_id, group_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/identity/user-groups/add/',
        {
          method: "POST",
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            user: user_id,
            group: group_id
          })
        }
      );
      if (response.ok) {
        fetchUGroups();
      }
    } catch (error) {
      console.error("Error adding user to group:", error);
    }
  };

  const deleteGroupFromUser = async (group_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/identity/user-groups/delete/',
        {
          method: "DELETE",
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            user: user.id,
            group: group_id
          })
        }
      );
      if (response.ok) {
        fetchUGroups();
      }
    } catch (error) {
      console.error("Error removing user from group:", error);
    }
  };

  const editUser = async () => {
    if (!firstName || !surName || !userEmail) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }
    if (!isValidEmail(userEmail)) {
      openModal("Niepoprawny adres email", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${user.id}/update/`,
        {
          method: "PATCH",
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            email: userEmail,
            first_name: firstName,
            last_name: surName,
            role: userRole,
            // ZMIANA 2: Najbezpieczniejsza konwersja na liczbę całkowitą
            weight: parseInt(userWeight || 5)
          })
        }
      );
      if (response.ok) {
        openModal("Użytkownik zaktualizowany", "success");
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error editing user:", error);
      openModal("Błąd podczas aktualizacji użytkownika", "error");
    }
  };

  const deleteUser = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${user.id}/remove_from_organization/`,
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
        openModal("Użytkownik usunięty", "success");
        setTimeout(() => {
          if (onBack) onBack();
          if (onUpdate) onUpdate();
        }, 1500);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      openModal("Błąd podczas usuwania użytkownika", "error");
    }
  };

  useEffect(() => {
    fetchUGroups();
    fetchGroups();
  }, []);

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Edycja Użytkownika</h2>
        <p className="admin-content-description">
          {firstName} {surName} ({userEmail})
        </p>
      </div>

      <form className="admin-form">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Imię *</label>
            <input
              type="text"
              className={`admin-input ${!firstName ? 'error' : ''}`}
              placeholder="Jan"
              value={firstName}
              onChange={(e) => setFName(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Nazwisko *</label>
            <input
              type="text"
              className={`admin-input ${!surName ? 'error' : ''}`}
              placeholder="Kowalski"
              value={surName}
              onChange={(e) => setSName(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Adres email *</label>
          <input
            type="email"
            className={`admin-input ${userEmail && !isValidEmail(userEmail) ? 'error' : ''}`}
            placeholder="jan.kowalski@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Rola użytkownika</label>
          <div className="admin-button-group">
            <button
              type="button"
              onClick={() => setUserRole("participant")}
              className={`admin-button-toggle ${userRole === "participant" ? 'active' : ''}`}
            >
              Uczestnik
            </button>
            <button
              type="button"
              onClick={() => setUserRole("host")}
              className={`admin-button-toggle ${userRole === "host" ? 'active' : ''}`}
            >
              Prowadzący
            </button>
            <button
              type="button"
              onClick={() => setUserRole("office")}
              className={`admin-button-toggle ${userRole === "office" ? 'active' : ''}`}
            >
              Sekretariat
            </button>
          </div>
        </div>

        <div className="admin-form-group">
          <label className="admin-label">
            Waga użytkownika: {userWeight || 5}
          </label>
          <p className="admin-content-description" style={{ marginBottom: '1rem' }}>
            Użytkownicy z większą wagą dostają lepsze plany (1-10)
          </p>
          <div className="admin-range-controls">
            <button
              type="button"
              className="admin-range-btn"
              // ZMIANA 3: Użycie bezpiecznego parseInt(prev) dla arytmetyki
              onClick={() => setUserWeight(prev => Math.max(1, (parseInt(prev) || 5) - 1))}
            >
              −
            </button>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={userWeight || 5}
              // ZMIANA 4: Parsowanie wartości z suwaka na liczbę całkowitą
              onChange={(e) => setUserWeight(parseInt(e.target.value) || 5)}
              className="admin-range-slider"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="admin-range-btn"
              // ZMIANA 3: Użycie bezpiecznego parseInt(prev) dla arytmetyki
              onClick={() => setUserWeight(prev => Math.min(10, (parseInt(prev) || 5) + 1))}
            >
              +
            </button>
          </div>
        </div>

        {userRole === "participant" && groups.length > 0 && (
          <div className="admin-form-group">
            <label className="admin-label">Dodaj do grupy</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addUtoGroup(user.id, e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz grupę...</option>
              {groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  {g.group_name}
                </option>
              ))}
            </select>

            {userGroups.length > 0 && (
              <div className="admin-tags">
                {userGroups.map((g) => (
                  <span key={g.group_id} className="admin-tag">
                    {g.group_name} ({g.category})
                    <span
                      className="admin-tag-remove"
                      onClick={() => deleteGroupFromUser(g.group_id)}
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
        <button onClick={editUser} className="admin-btn primary">
          Zapisz Zmiany
        </button>
        <button
          onClick={() => {
            setModalMessage("Czy na pewno chcesz usunąć tego użytkownika?");
            setIsWarnModalOpen(true);
          }}
          className="admin-btn danger"
        >
          Usuń Użytkownika
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
        onCloseYes={deleteUser}
        onCloseNo={() => setIsWarnModalOpen(false)}
        message={modalMessage}
      />
    </>
  );
}