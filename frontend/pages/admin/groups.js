/* pages/admin/groups.js */

import React, { useState, useEffect, useCallback } from 'react';
import MsgModal from '@/components/admin/NotificationModal';
import ConfirmModal from '@/components/admin/ConfirmationModal';

const GroupsPage = () => {
  // ===== NAVIGATION STATE =====
  const [activeView, setActiveView] = useState('list');
  const [selectedGroup, setSelectedGroup] = useState(null);

  // ===== DATA STATE =====
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [organizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ===== FORM STATE =====
  const [groupName, setGroupName] = useState("");
  const [category, setCategory] = useState("year1");
  // ===== TAG STATE =====
  const [tags, setTags] = useState([]);
  const [tagName, setTagName] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  // ===== MODAL STATE =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [confirmAction, setConfirmAction] = useState(null);

  // Dane z localStorage
  const orgIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("org_id") : '';
  const userString = typeof window !== 'undefined' ? localStorage.getItem("user") : '{}';
  const orgNameFromStorage = JSON.parse(userString)?.organization?.organization_name || '';
  const currentUserId = typeof window !== 'undefined' ? JSON.parse(userString)?.id : null;

  // ===== UTILITY FUNCTIONS =====
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
    setGroupName("");
    setCategory("year1");
    setSelectedGroup(null);
    setGroupMembers([]);
    setSelectedTag(null);
    setTagName("");
  };

  // ===== API CALLS =====
  const fetchAllUsers = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    if (!org_id) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/users/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  }, []);
  const fetchAllTags = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/tags/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();

        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  }, []);

  // --- ZMIENIONA FUNKCJA POBIERANIA CZŁONKÓW ---
  const fetchGroupMembers = useCallback(async (groupId) => {
    const token = localStorage.getItem("access_token");
    const members = [];

    if (allUsers.length === 0 || !groupId) {
      setGroupMembers([]);
      return;
    }

    // Iterujemy po WSZYSTKICH użytkownikach i sprawdzamy ich przynależność do grupy
    const fetchPromises = allUsers.map(async (user) => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/identity/users/${user.id}/groups/`, // Używamy istniejącego endpointu
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const userGroups = await response.json();
          // Sprawdzamy, czy edytowana grupa jest na liście grup tego użytkownika
          const isMember = userGroups.some(g => g.group_id === groupId);
          if (isMember) {
            // Jeśli jest członkiem, dodajemy go do tablicy członków
            members.push(user);
          }
        }
      } catch (error) {
        console.error(`Error fetching groups for user ${user.id}:`, error);
      }
    });

    await Promise.all(fetchPromises);

    // Aktualizujemy stan po zakończeniu wszystkich zapytań
    setGroupMembers(members);

  }, [allUsers]);

  const fetchGroups = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    if (!org_id) return;

    setIsLoading(true);
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
        data = data.filter(g => g.category !== 'meeting');

        data = data.map(g => ({
          ...g,
          organization_id: typeof g.organization === 'object' && g.organization !== null
            ? g.organization.organization_id || g.organization_id || 'N/A'
            : g.organization || org_id,
          organization_name: typeof g.organization === 'object' && g.organization !== null
            ? g.organization.organization_name || 'N/A'
            : orgNameFromStorage || 'N/A'
        }));

        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoading(false);
    }
  }, [orgIdFromStorage, orgNameFromStorage]);

  useEffect(() => {
    fetchGroups();
    fetchAllUsers();
    fetchAllTags();
  }, [fetchGroups, fetchAllUsers]);

  // ===== CZŁONKOWIE GRUPY OPERATIONS (natychmiastowe) =====
  const addUserToGroup = async (userId, groupId) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user: userId, group: groupId })
      });
      if (response.ok) {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          setGroupMembers(prev => [...prev, user]); // Natychmiastowa aktualizacja lokalnego stanu
        }
        openModal(`Dodano użytkownika do grupy.`, "success");
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd dodawania: ${errorData.detail || 'Nieznany błąd.'}`, "error");
      }
    } catch (error) {
      console.error("Error adding user to group:", error);
    }
  };

  const removeUserFromGroup = async (userId, groupId) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/delete/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user: userId, group: groupId })
      });
      if (response.ok) {
        setGroupMembers(prev => prev.filter(user => user.id !== userId)); // Natychmiastowa aktualizacja lokalnego stanu
        openModal(`Usunięto użytkownika z grupy.`, "success");
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd usuwania: ${errorData.detail || 'Nieznany błąd.'}`, "error");
      }
    } catch (error) {
      console.error("Error removing user from group:", error);
    }
  };

  // ===== GROUP CRUD OPERATIONS =====
  const createGroup = async () => {
    if (!groupName || !category) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const orgId = orgIdFromStorage;

    if (!orgId) {
      openModal("Brak ID organizacji lub ID użytkownika w lokalnym magazynie.", "error");
      return;
    }

    try {
      // 1. UTWÓRZ GRUPĘ
      const response = await fetch('http://127.0.0.1:8000/api/v1/identity/groups/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          group_name: groupName,
          category: category,
          organization_id: orgId
        })
      });

      if (response.ok) {
        openModal(`Stworzono grupę: ${groupName}`, "success");
        fetchGroups();
      } else {
        let errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd podczas tworzenia grupy: ${errorData.detail || JSON.stringify(errorData)}`, "error");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      openModal("Błąd podczas tworzenia grupy (błąd sieci/serwera)", "error");
    }
  };


  const updateGroup = async () => {
    openModal("Edycja metadanych grupy (nazwa/kategoria) jest niedostępna z powodu braku endpointu PATCH na serwerze. Zarządzanie członkami działa poniżej.", "info");
  };

  const deleteGroup = async (groupIdFromList) => {
    const groupIdToDelete = groupIdFromList || (selectedGroup && selectedGroup.group_id);

    if (!groupIdToDelete) {
      openModal("Błąd: Nie można ustalić ID grupy do usunięcia.", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/groups/delete/${groupIdToDelete}/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok || response.status === 204) {
        setIsConfirmModalOpen(false);
        openModal("Grupa usunięta", "success");
        fetchGroups();

        if (selectedGroup && selectedGroup.group_id === groupIdToDelete) {
          setTimeout(() => {
            clearForm();
            setActiveView('list');
          }, 500);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd usuwania: ${errorData.detail || 'Nieznany błąd.'}`, "error");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      openModal("Błąd podczas usuwania grupy", "error");
    }
  };

  const loadGroupForEdit = (group) => {
    setSelectedGroup(group);
    setGroupName(group.group_name || "");
    setCategory(group.category || "year1");
    // Wczytanie członków grupy
    if (group.group_id) {
      // Używamy zaktualizowanej funkcji fetchGroupMembers, która używa istniejącego API
      fetchGroupMembers(group.group_id);
    }
    setActiveView('edit');
  };
  const editTag = async () => {
    if (!tagName) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }
    const token = localStorage.getItem("access_token");
    try {
      // 1. UTWÓRZ GRUPĘ
      const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/tags/${selectedTag.tag_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tag_name: tagName
        })
      });

      if (response.ok) {
        openModal(`Zmieniono cechę`, "success");
        fetchAllTags();
        setActiveView('listtags');
      } else {
        let errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd podczas edycji cechy: ${errorData.detail || JSON.stringify(errorData)}`, "error");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      openModal("Błąd podczas tworzenia cechy (błąd sieci/serwera)", "error");
    }
  };

  const createTag = async () => {
    if (!tagName) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    try {
      // 1. UTWÓRZ GRUPĘ
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/tags/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tag_name: tagName,
          organization: org_id
        })
      });

      if (response.ok) {
        openModal(`Stworzono cechę: ${tagName}`, "success");
        fetchAllTags();
        setActiveView('listtags');
      } else {
        let errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd podczas tworzenia cechy: ${errorData.detail || JSON.stringify(errorData)}`, "error");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      openModal("Błąd podczas tworzenia cechy (błąd sieci/serwera)", "error");
    }
  };

  const loadTagForEdit = (tag) => {
    setSelectedTag(tag);
    setTagName(tag.tag_name || "");
    setActiveView('edittag');
  };
  const deleteTag = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/tags/${selectedTag.tag_id}/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok || response.status === 204) {
        setIsConfirmModalOpen(false);
        openModal("Grupa usunięta", "success");
        fetchAllTags();
        clearForm();
        setActiveView('listtags');
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd usuwania: ${errorData.detail || 'Nieznany błąd.'}`, "error");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      openModal("Błąd podczas usuwania grupy", "error");
    }
  };

  // ===========================================
  // === RENDER FUNCTIONS ===
  // ===========================================

  const renderGroupsList = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Grup</h2>
        <p className="admin-content-description">
          Wszystkie grupy w systemie ({groups.length})
        </p>
      </div>

      {isLoading ? (
        <div className="admin-loading">Ładowanie grup...</div>
      ) : groups.length > 0 ? (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Nazwa Grupy
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Kategoria
                </th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  ID Organizacji
                </th>
                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, idx) => (
                <tr key={group.group_id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {group.group_name}
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    <span className="admin-badge secondary">
                      {group.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {group.organization_id || 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadGroupForEdit(group);
                      }}
                      className="admin-btn-icon"
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirmModal(
                          `Czy na pewno chcesz usunąć grupę: ${group.group_name}?`,
                          () => deleteGroup(group.group_id)
                        );
                      }}
                      className="admin-btn-icon danger"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">👥</div>
          <h3 className="admin-empty-title">Brak grup</h3>
          <p className="admin-empty-description">
            Dodaj pierwszą grupę do organizacji
          </p>
        </div>
      )}
    </>
  );

  const renderGroupForm = (isEditing) => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Grupę' : 'Nowa Grupa'}
        </h2>
        <p className="admin-content-description">
          {isEditing
            ? `${selectedGroup?.group_name}`
            : 'Wypełnij dane nowej grupy'
          }
        </p>
      </div>

      <form className="admin-form">
        <div className="admin-form-group full-width">
          <label className="admin-label">Nazwa Grupy *</label>
          <input
            type="text"
            className="admin-input"
            placeholder="np. Rok I, Semestr Zimowy"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={isEditing}
          />
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Kategoria</label>
          <input
            type="text"
            className="admin-input"
            placeholder="np. year1, IT_Dept, HR"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isEditing}
          />
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Organizacja (ID)</label>
          <input
            type="text"
            className="admin-input"
            value={orgIdFromStorage || (isEditing ? selectedGroup?.organization_id : 'Brak ID Organizacji')}
            disabled
          />
          {orgNameFromStorage && (
            <p className="admin-content-description" style={{ marginTop: '0.5rem' }}>
              Nazwa: {orgNameFromStorage}
            </p>
          )}
        </div>

        {/* SEKCJA: ZARZĄDZANIE CZŁONKAMI (Tylko w trybie edycji) */}
        {isEditing && selectedGroup && (
          <div className="admin-form-group full-width" style={{ marginTop: '2rem', borderTop: '1px solid #f3f4f6', paddingTop: '2rem' }}>
            <h3 className="admin-content-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              Zarządzaj Członkami Grupy
            </h3>

            <label className="admin-label">Dodaj użytkownika do grupy</label>
            <select
              className="admin-select"
              onChange={(e) => {
                const userId = e.target.value;
                if (userId) {
                  addUserToGroup(userId, selectedGroup.group_id);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz użytkownika...</option>
              {allUsers
                .filter(user => !groupMembers.some(member => member.id === user.id))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.role})
                  </option>
                ))}
            </select>

            {groupMembers.length > 0 ? (
              <div className="admin-tags" style={{ marginTop: '1rem' }}>
                {groupMembers.map((user) => (
                  <span key={user.id} className="admin-tag">
                    {user.first_name} {user.last_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => removeUserFromGroup(user.id, selectedGroup.group_id)}
                    >
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="admin-content-description" style={{ marginTop: '1rem' }}>
                Brak członków w tej grupie.
              </p>
            )}
          </div>
        )}
      </form>

      <div className="admin-actions">
        <button
          onClick={() => {
            clearForm();
            createGroup();
          }}
          className="admin-btn primary"
        >
          Dodaj grupę
        </button>
        <button
          onClick={() => {
            clearForm();
            setActiveView('list');
          }}
          className="admin-btn secondary"
        >
          Anuluj
        </button>
        {isEditing && (
          <button
            onClick={() => {
              openConfirmModal(
                `Czy na pewno chcesz usunąć grupę ${groupName}?`,
                deleteGroup
              );
            }}
            className="admin-btn danger"
          >
            Usuń Grupę
          </button>
        )}
      </div>
    </>
  );

  const renderTagsList = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Cech</h2>
        <p className="admin-content-description">
          Wszystkie cechy w systemie ({tags.length})
        </p>
      </div>

      {isLoading ? (
        <div className="admin-loading">Ładowanie cech...</div>
      ) : groups.length > 0 ? (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Nazwa Cechy
                </th>
                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, idx) => (
                <tr key={tag.group_id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {tag.tag_name}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTagForEdit(tag);
                      }}
                      className="admin-btn-icon"
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirmModal(
                          `Czy na pewno chcesz usunąć grupę: ${group.group_name}?`,
                          () => deleteTag(tag.tag_id)
                        );
                      }}
                      className="admin-btn-icon danger"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">👥</div>
          <h3 className="admin-empty-title">Brak Cech</h3>
          <p className="admin-empty-description">
            Dodaj pierwszą cechę do organizacji
          </p>
        </div>
      )}
    </>
  );

  const renderTagForm = (isEditing) => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Cechę' : 'Nowa Cecha'}
        </h2>
        <p className="admin-content-description">
          {isEditing
            ? `${selectedTag?.tag_name}`
            : 'Wypełnij dane nowej cechy'
          }
        </p>
      </div>

      <form className="admin-form">
        <div className="admin-form-group full-width">
          <label className="admin-label">Nazwa Cechy *</label>
          <input
            type="text"
            className="admin-input"
            placeholder="np. Dostęp do projektora"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
        </div>
      </form>

      <div className="admin-actions">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                openConfirmModal(
                  `Czy chcesz wprowadzić zmiany?`,
                  editTag
                );
              }}
              className="admin-btn primary"
            >
              Wprowadź zmiany
            </button>
            <button
              onClick={() => {
                openConfirmModal(
                  `Czy na pewno chcesz usunąć grupę ${tagName}?`,
                  deleteTag
                );
              }}
              className="admin-btn danger"
            >
              Usuń Cechę
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                createTag();
              }}
              className="admin-btn primary"
            >
              Dodaj Cechę
            </button>
            <button
              onClick={() => {
                clearForm();
                setActiveView('listtags');
              }}
              className="admin-btn secondary"
            >
              Anuluj
            </button>
          </>
        )}
      </div>
    </>
  );
  // ===========================================
  // === GŁÓWNY BLOK RETURN ===
  // ===========================================

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header-section">
          <div className="admin-header-wrapper">
            <div className="admin-header-gradient">
              <div className="admin-header-content">
                <div className="admin-header-title">
                  <h1>Zarządzanie Grupami</h1>
                  <p className="admin-header-subtitle">
                    Dodawaj i edytuj grupy użytkowników w organizacji
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-main">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja</h3>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('list');
                }}
                className={`admin-sidebar-button ${activeView === 'list' || activeView === 'edit' ? 'active' : ''}`}
              >
                👥 Lista Grup
              </button>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('create');
                }}
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowa Grupa
              </button>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('listtags');
                }}
                className={`admin-sidebar-button ${activeView === 'listtags' || activeView === 'edit' ? 'active' : ''}`}
              >
                👥 Lista Cech
              </button>
              <button
                onClick={() => {
                  clearForm();
                  setActiveView('createtag');
                }}
                className={`admin-sidebar-button ${activeView === 'createtag' ? 'active' : ''}`}
              >
                ➕ Nowa Cecha
              </button>
            </div>

            {groups.length > 0 && (
              <div className="admin-sidebar-section">
                <h3 className="admin-sidebar-title">Statystyki</h3>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Łącznie:</strong> {groups.length}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Kategorie:</strong> {new Set(groups.map(g => g.category)).size}
                  </p>
                </div>
              </div>
            )}
          </aside>

          <main className="admin-content">
            {activeView === 'list' && renderGroupsList()}
            {activeView === 'listtags' && renderTagsList()}
            {activeView === 'create' && renderGroupForm(false)}
            {activeView === 'edit' && renderGroupForm(true)}
            {activeView === 'createtag' && renderTagForm(false)}
            {activeView === 'edittag' && renderTagForm(true)}
          </main>
        </div>
      </div>

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

export default GroupsPage;