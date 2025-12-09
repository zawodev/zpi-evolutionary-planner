/* pages/admin/users.js */

import React, { useState, useEffect } from 'react';
import MsgModal from '@/components/admin/modals/NotificationModal';
import ConfirmModal from '@/components/admin/modals/ConfirmationModal';
import UserList from '@/components/admin/users/UserList';
import UserForm from '@/components/admin/users/UserForm';
import UserStats from '@/components/admin/users/UserStats';
import { useUserData } from '@/hooks/useUserData';

const UsersPage = () => {
  const { 
    users, 
    groups, 
    fetchUsers, 
    fetchGroups, 
    fetchUserGroups, 
    createUser, 
    updateUser, 
    deleteUser 
  } = useUserData();

  const [activeView, setActiveView] = useState('list');
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "participant",
    weight: 5
  });
  
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [originalUserGroups, setOriginalUserGroups] = useState([]); 

  const [modal, setModal] = useState({ isOpen: false, message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: "", action: null });

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [fetchUsers, fetchGroups]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showModal = (message, type = "info") => {
    setModal({ isOpen: true, message, type });
  };

  const clearForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      role: "participant",
      weight: 5
    });
    setSelectedGroups([]);
    setSelectedUser(null);
    setOriginalUserGroups([]);
  };

  const handleSwitchView = (view) => {
    clearForm();
    setActiveView(view);
  };

  const handleGroupAdd = (group_id) => {
    const group = groups.find(g => g.group_id === group_id);
    if (group && !selectedGroups.some(g => g.group_id === group.group_id)) {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleGroupRemove = (group_id) => {
    setSelectedGroups(selectedGroups.filter(g => g.group_id !== group_id));
  };

  const handleEditClick = async (user) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      email: user.email || "",
      role: user.role || "participant",
      weight: parseInt(user.weight) || 5
    });

    const uid = user.id ?? user.user_id ?? user.userId ?? null;
    if (uid) {
      const userGroups = await fetchUserGroups(uid);
      setOriginalUserGroups(userGroups);
      setSelectedGroups(userGroups);
    }
    
    setActiveView('edit');
  };

  const handleDeleteClick = (user) => {
    setConfirmModal({
      isOpen: true,
      message: `Czy na pewno chcesz usunąć użytkownika ${user.first_name} ${user.last_name}?`,
      action: async () => {
        const uid = user.id ?? user.user_id ?? user.userId;
        const result = await deleteUser(uid);
        if (result.success) {
          showModal(result.message, "success");
          if (selectedUser?.id === user.id) {
            handleSwitchView('list');
          }
        } else {
          showModal(result.message, "error");
        }
      }
    });
  };

  const handleSubmit = async () => {
    const { firstName, lastName, email, role, weight } = formData;

    if (!firstName || !lastName || !email) {
      showModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showModal("Niepoprawny adres email", "error");
      return;
    }

    const payload = {
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      weight: parseInt(weight) || 5
    };

    let result;
    if (activeView === 'create') {
      result = await createUser(payload, selectedGroups);
    } else {
      const userId = selectedUser?.id ?? selectedUser?.user_id ?? selectedUser?.userId;
      result = await updateUser(userId, payload, originalUserGroups, selectedGroups);
    }

    if (result.success) {
      showModal(result.message, "success");
      handleSwitchView('list');
    } else {
      showModal(result.message, "error");
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
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

        <div className="admin-main">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja</h3>
              <button
                onClick={() => handleSwitchView('list')}
                className={`admin-sidebar-button ${activeView === 'list' ? 'active' : ''}`}
              >
                👥 Lista Użytkowników
              </button>
              <button
                onClick={() => handleSwitchView('create')}
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowy Użytkownik
              </button>
            </div>
            <UserStats users={users} />
          </aside>

          <main className="admin-content">
            {activeView === 'list' && (
              <UserList 
                users={users} 
                onEdit={handleEditClick} 
                onDelete={handleDeleteClick} 
              />
            )}
            
            {(activeView === 'create' || activeView === 'edit') && (
              <UserForm
                isEditing={activeView === 'edit'}
                formData={formData}
                setFormData={setFormData}
                groups={groups}
                selectedGroups={selectedGroups}
                onAddGroup={handleGroupAdd}
                onRemoveGroup={handleGroupRemove}
                onSubmit={handleSubmit}
                onCancel={() => handleSwitchView('list')}
                onDelete={() => handleDeleteClick(selectedUser)}
                isValidEmail={isValidEmail}
              />
            )}
          </main>
        </div>
      </div>

      <MsgModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        message={modal.message}
        type={modal.type}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCloseYes={() => {
          confirmModal.action && confirmModal.action();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onCloseNo={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        message={confirmModal.message}
      />
    </div>
  );
};

export default UsersPage;