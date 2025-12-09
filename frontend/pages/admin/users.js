/* pages/admin/users.js */

import React, { useState, useEffect } from 'react';
import MsgModal from '@/components/admin/NotificationModal';
import ConfirmModal from '@/components/admin/ConfirmationModal';

const UsersPage = () => {
  // ===== NAVIGATION STATE =====
  const [activeView, setActiveView] = useState('list');
  const [selectedUser, setSelectedUser] = useState(null);
  // ===== DATA STATE =====
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);

  // ===== FORM STATE =====
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("participant");
  const [weight, setWeight] = useState(5);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // ===== MODAL STATE =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [confirmAction, setConfirmAction] = useState(null);

  // ===== UTILITY FUNCTIONS =====
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const openModal = (text, type = "info") => {
    setModalMessage(text);
    setModalType(type);
    setIsModalOpen(true);
  };

  const openConfirmModal = (text, action) => {
    setModalMessage(text);
    setConfirmAction(() => action);
    setIsConfirmModalOpen(true);
  };

  const clearForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("participant");
    setWeight(5);
    setSelectedGroups([]);
    setSelectedUser(null);
  };

  // ===== API CALLS =====
  const fetchUsers = async () => {
    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/users/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        let data = await response.json();
        // Normalizacja danych wagi i ID podczas pobierania
        data = data.map(u => {
          const parsedWeight = parseInt(u.weight);
          return {
            ...u,
            id: u.id ?? u.user_id ?? u.userId ?? null,
            // Waga musi być liczbą, fallback do 5 (backend używa małej skali)
            weight: Number.isFinite(parsedWeight) ? parsedWeight : 5
          };
        });
        setUsers(data);
      } else {
         const errorText = await response.text();
         console.error(`Error fetching users: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchGroups = async () => {
    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/groups/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        let data = await response.json();
        // normalize group id field
        data = data.map(g => ({ ...g, group_id: g.group_id ?? g.id ?? g.groupId }));
        const filtered = data.filter(g => g.category !== 'meeting');
        setGroups(filtered);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchUserGroups = async (user_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${user_id}/groups/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        let data = await response.json();
        data = data.map(g => ({ ...g, group_id: g.group_id ?? g.id ?? g.groupId }));
        const filtered = data.filter(g => g.category !== 'meeting');
        setUserGroups(filtered);
        setSelectedGroups(filtered);
      }
    } catch (error) {
      console.error("Error fetching user groups:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  // ===== USER OPERATIONS =====
  const createUser = async () => {
    if (!firstName || !lastName || !email) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    if (!isValidEmail(email)) {
      openModal("Niepoprawny adres email", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");

    try {
      const payload = {
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: role,
            // WAGA: Zapewnienie, że waga jest liczbą całkowitą z fallbackiem do 5
            weight: parseInt(weight) || 5, 
            organization: org_id
      };
      
      // Use random-creation endpoint which generates username/password server-side
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/identity/users/create/random/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Random create returns { user: <user_data>, password: <pwd> }
        const createdUser = data.user ?? data;

        // Add user to selected groups (only if participant)
        if (role === "participant") {
          for (const group of selectedGroups) {
            await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/add/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ user: createdUser.id, group: group.group_id })
            });
          }
        }

        openModal(`Dodano użytkownika: ${firstName} ${lastName}`, "success");
        fetchUsers();
        clearForm();
        setActiveView('list');
      } else {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { detail: await response.text() };
        }
        console.error("API Error creating user:", response.status, errorData);
        openModal(`Błąd podczas tworzenia użytkownika: Status ${response.status}. Sprawdź konsolę.`, "error");
      }
    } catch (error) {
      console.error("Network Error creating user:", error);
      openModal("Błąd sieciowy podczas tworzenia użytkownika", "error");
    }
  };

  const updateUser = async () => {
    if (!firstName || !lastName || !email) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    if (!isValidEmail(email)) {
      openModal("Niepoprawny adres email", "error");
      return;
    }

    const token = localStorage.getItem("access_token");

    try {
      const payload = {
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        // WAGA: Zapewnienie, że waga jest liczbą całkowitą z fallbackiem do 5
        weight: parseInt(weight) || 5
      };
      
      const userId = selectedUser?.id ?? selectedUser?.user_id ?? selectedUser?.userId;
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${userId}/update/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        // Sync groups (only for participants)
        if (role === "participant") {
          const currentGroupIds = userGroups.map(g => g.group_id);
          const newGroupIds = selectedGroups.map(g => g.group_id);

          // Remove groups that are no longer selected
            for (const group of userGroups) {
              if (!newGroupIds.includes(group.group_id)) {
                await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/delete/', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ user: userId, group: group.group_id })
                });
              }
            }

          // Add new groups
          for (const group of selectedGroups) {
            if (!currentGroupIds.includes(group.group_id)) {
              await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/add/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ user: userId, group: group.group_id })
              });
            }
          }
        }

        openModal("Użytkownik zaktualizowany", "success");
        fetchUsers();
        clearForm();
        setActiveView('list');
      } else {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { detail: await response.text() };
        }
        console.error("API Error updating user:", response.status, errorData);
        openModal(`Błąd podczas aktualizacji użytkownika: Status ${response.status}. Sprawdź konsolę.`, "error");
      }
    } catch (error) {
      console.error("Network Error updating user:", error);
      openModal("Błąd sieciowy podczas aktualizacji użytkownika", "error");
    }
  };

  const deleteUser = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const userId = selectedUser?.id ?? selectedUser?.user_id ?? selectedUser?.userId;
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${userId}/remove_from_organization/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setIsConfirmModalOpen(false);
        openModal("Użytkownik usunięty", "success");
        fetchUsers(); 
        setTimeout(() => {
          clearForm();
          setActiveView('list');
        }, 1500);
      } else {
        const errorText = await response.text();
        console.error("API Error deleting user:", response.status, errorText);
        openModal(`Błąd podczas usuwania użytkownika. Status: ${response.status}. Sprawdź konsolę.`, "error");
      }
    } catch (error) {
      console.error("Network Error deleting user:", error);
      openModal("Błąd sieciowy podczas usuwania użytkownika", "error");
    }
  };

  const loadUserForEdit = (user) => {
    setSelectedUser(user);
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setEmail(user.email || "");
    setRole(user.role || "participant");
    // WAGA: Ładowanie wagi z bezpiecznym parsowaniem
    setWeight(parseInt(user.weight) || 5);
    const uid = user.id ?? user.user_id ?? user.userId ?? null;
    if (uid) fetchUserGroups(uid);
    setActiveView('edit');
  };

  // ===== GROUP OPERATIONS =====
  const addGroup = (group_id) => {
    const group = groups.find(g => g.group_id === group_id);
    if (group && !selectedGroups.some(g => g.group_id === group.group_id)) {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const removeGroup = (group_id) => {
    setSelectedGroups(selectedGroups.filter(g => g.group_id !== group_id));
  };

  // ===== RENDER FUNCTIONS =====
  const renderUsersList = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Użytkowników</h2>
        <p className="admin-content-description">
          Wszyscy użytkownicy w systemie ({users.length})
        </p>
      </div>

      {users.length > 0 ? (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Imię i Nazwisko
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Email
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Rola
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Waga
                </th>
                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id ?? user.email ?? idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {user.first_name} {user.last_name}
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`admin-badge ${
                      user.role === 'office' ? 'warning' : 
                      user.role === 'host' ? 'success' : 
                      'secondary'
                    }`}>
                      {user.role === 'office' ? 'Sekretariat' :
                       user.role === 'host' ? 'Prowadzący' :
                       'Uczestnik'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {user.weight}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => loadUserForEdit(user)}
                      className="admin-btn-icon"
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    {user.id!==localStorage.getItem('id') ? (<button
                      onClick={() => {
                        setSelectedUser(user);
                        setModalMessage(`Czy na pewno chcesz usunąć użytkownika ${user.first_name} ${user.last_name}?`);
                        setConfirmAction(() => async () => {
                          const token = localStorage.getItem("access_token");
                          try {
                            const userId = user.id ?? user.user_id ?? user.userId;
                            const response = await fetch(
                              `http://127.0.0.1:8000/api/v1/identity/users/${userId}/remove_from_organization/`,
                              {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              }
                            );

                            if (response.ok) {
                              setIsConfirmModalOpen(false);
                              openModal("Użytkownik usunięty", "success");
                              fetchUsers();
                              setTimeout(() => {
                                clearForm();
                                setActiveView('list');
                              }, 1500);
                            } else {
                              const errorText = await response.text();
                              console.error("API Error deleting user (list):", response.status, errorText);
                              openModal(`Błąd podczas usuwania użytkownika. Status: ${response.status}. Sprawdź konsolę.`, "error");
                            }
                          } catch (error) {
                            console.error("Network Error deleting user (list):", error);
                            openModal("Błąd sieciowy podczas usuwania użytkownika", "error");
                          }
                        });
                        setIsConfirmModalOpen(true);
                      }}
                      className="admin-btn-icon danger"
                    >
                      🗑️
                    </button>) : (<></>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">👥</div>
          <h3 className="admin-empty-title">Brak użytkowników</h3>
          <p className="admin-empty-description">
            Dodaj pierwszego użytkownika do systemu
          </p>
        </div>
      )}
    </>
  );

  const renderUserForm = (isEditing) => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Użytkownika' : 'Nowy Użytkownik'}
        </h2>
        <p className="admin-content-description">
          {isEditing 
            ? `${selectedUser?.first_name} ${selectedUser?.last_name}` 
            : 'Wypełnij dane nowego użytkownika'
          }
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
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Nazwisko *</label>
            <input
              type="text"
              className={`admin-input ${!lastName ? 'error' : ''}`}
              placeholder="Kowalski"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Adres email *</label>
          <input
            type="email"
            className={`admin-input ${email && !isValidEmail(email) ? 'error' : ''}`}
            placeholder="jan.kowalski@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Rola użytkownika</label>
          <div className="admin-button-group">
            <button
              type="button"
              onClick={() => setRole("participant")}
              className={`admin-button-toggle ${role === "participant" ? 'active' : ''}`}
            >
              Uczestnik
            </button>
            <button
              type="button"
              onClick={() => setRole("host")}
              className={`admin-button-toggle ${role === "host" ? 'active' : ''}`}
            >
              Prowadzący
            </button>
            <button
              type="button"
              onClick={() => setRole("office")}
              className={`admin-button-toggle ${role === "office" ? 'active' : ''}`}
            >
              Sekretariat
            </button>
          </div>
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">
            Waga użytkownika: {weight}
          </label>
          <p className="admin-content-description" style={{ marginBottom: '1rem' }}>
            Użytkownicy z większą wagą dostają lepsze plany (1-10)
          </p>
          <div className="admin-range-controls">
            <button
              type="button"
              className="admin-range-btn"
              // Poprawka: Zapewnienie, że wartość jest traktowana jako liczba
              onClick={() => setWeight(prev => Math.max(1, (parseInt(prev) || 5) - 1))}
            >
              −
            </button>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={weight || 5}
              // Poprawka: Zapewnienie, że wartość jest zawsze liczbą całkowitą
              onChange={(e) => setWeight(parseInt(e.target.value) || 5)}
              className="admin-range-slider"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="admin-range-btn"
              // Poprawka: Zapewnienie, że wartość jest traktowana jako liczba
              onClick={() => setWeight(prev => Math.min(10, (parseInt(prev) || 5) + 1))}
            >
              +
            </button>
          </div>
        </div>

        {role === "participant" && groups.length > 0 && (
          <div className="admin-form-group full-width">
            <label className="admin-label">Dodaj do grupy</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addGroup(e.target.value);
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

            {selectedGroups.length > 0 && (
              <div className="admin-tags">
                {selectedGroups.map((g) => (
                  <span key={g.group_id} className="admin-tag">
                    {g.group_name} ({g.category})
                    <span
                      className="admin-tag-remove"
                      onClick={() => removeGroup(g.group_id)}
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
        <button
          onClick={() => {
            clearForm();
            setActiveView('list');
          }}
          className="admin-btn secondary"
        >
          Anuluj
        </button>
        <button
          onClick={isEditing ? updateUser : createUser}
          className="admin-btn primary"
        >
          {isEditing ? 'Zapisz Zmiany' : 'Utwórz Użytkownika'}
        </button>
        {isEditing && (
          <button
            onClick={() => {
              openConfirmModal(
                `Czy na pewno chcesz usunąć użytkownika ${firstName} ${lastName}?`,
                deleteUser
              );
            }}
            className="admin-btn danger"
          >
            Usuń Użytkownika
          </button>
        )}
      </div>
    </>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Header */}
        <div className="admin-header-section">
          <div className="admin-header-wrapper">
            <div className="admin-header-gradient">
              <div className="admin-header-content">
                <div className="admin-header-title">
                  <h1>Zarządzanie Użytkownikami</h1>
                  <p className="admin-header-subtitle">
                    Dodawaj i edytuj użytkowników oraz ich uprawnienia
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="admin-main">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja</h3>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('list');
                }}
                className={`admin-sidebar-button ${activeView === 'list' ? 'active' : ''}`}
              >
                👥 Lista Użytkowników
              </button>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('create');
                }}
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowy Użytkownik
              </button>
            </div>

            {users.length > 0 && (
              <div className="admin-sidebar-section">
                <h3 className="admin-sidebar-title">Statystyki</h3>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Łącznie:</strong> {users.length}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Uczestnicy:</strong>{' '}
                    {users.filter(u => u.role === 'participant').length}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Prowadzący:</strong>{' '}
                    {users.filter(u => u.role === 'host').length}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Sekretariat:</strong>{' '}
                    {users.filter(u => u.role === 'office').length}
                  </p>
                </div>
              </div>
            )}
          </aside>

          {/* Content Area */}
          <main className="admin-content">
            {activeView === 'list' && renderUsersList()}
            {activeView === 'create' && renderUserForm(false)}
            {activeView === 'edit' && renderUserForm(true)}
          </main>
        </div>
      </div>

      {/* Modals */}
      <MsgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
        type={modalType}
      />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCloseYes={() => {
          confirmAction && confirmAction();
          setIsConfirmModalOpen(false);
        }}
        onCloseNo={() => setIsConfirmModalOpen(false)}
        message={modalMessage}
      />
    </div>
  );
};

export default UsersPage;