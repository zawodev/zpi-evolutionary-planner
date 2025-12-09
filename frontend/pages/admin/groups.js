/* pages/admin/groups.js */

import React, { useState, useEffect } from 'react';
import MsgModal from '@/components/admin/NotificationModal';
import ConfirmModal from '@/components/admin/ConfirmationModal';

import GroupsList from '@/components/admin/groups/GroupsList';
import GroupForm from '@/components/admin/groups/GroupForm';
import TagsList from '@/components/admin/tags/TagsList';
import TagForm from '@/components/admin/tags/TagForm';

import { useGroups } from '@/hooks/useGroups';
import { useTags } from '@/hooks/useTags';
import { useGroupMembers } from '@/hooks/useGroupMembers';

const GroupsPage = () => {
  const [activeView, setActiveView] = useState('list'); 
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  const [modal, setModal] = useState({ isOpen: false, msg: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, msg: '', action: null });

  const orgIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("org_id") : '';
  const userString = typeof window !== 'undefined' ? localStorage.getItem("user") : '{}';
  const orgNameFromStorage = JSON.parse(userString)?.organization?.organization_name || '';

  const { 
    groups, allUsers, isLoading: groupsLoading, 
    fetchGroups, fetchAllUsers, createGroup, deleteGroup 
  } = useGroups(orgIdFromStorage);

  const {
    tags, isLoading: tagsLoading,
    fetchTags, createTag, updateTag, deleteTag
  } = useTags(orgIdFromStorage);

  const {
    groupMembers, setGroupMembers, fetchGroupMembers, addMember, removeMember
  } = useGroupMembers(allUsers);

  useEffect(() => {
    fetchGroups();
    fetchAllUsers();
    fetchTags();
  }, [fetchGroups, fetchAllUsers, fetchTags]);


  const openModal = (msg, type = 'info') => setModal({ isOpen: true, msg, type });
  const openConfirm = (msg, action) => setConfirmModal({ isOpen: true, msg, action });
  
  const closeModals = () => {
    setModal({ ...modal, isOpen: false });
    setConfirmModal({ ...confirmModal, isOpen: false });
  };
  
  const resetViews = () => {
    setSelectedGroup(null);
    setSelectedTag(null);
    setGroupMembers([]);
  };

  const handleCreateGroup = async (formData) => {
    if (!formData.group_name || !formData.category) return openModal("Wypełnij pola", "error");
    try {
      await createGroup(formData);
      openModal(`Stworzono grupę: ${formData.group_name}`, "success");
      resetViews();
      setActiveView('list');
    } catch (e) { openModal(e.message, "error"); }
  };

  const handleDeleteGroup = async (group) => {
    const target = group || selectedGroup;
    try {
      await deleteGroup(target.group_id);
      openModal("Grupa usunięta", "success");
      closeModals();
      resetViews();
      setActiveView('list');
    } catch (e) { openModal(e.message, "error"); }
  };

  const handleAddMember = async (userId) => {
    try {
      await addMember(userId, selectedGroup.group_id);
      openModal("Dodano użytkownika", "success");
    } catch (e) { openModal(e.message, "error"); }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await removeMember(userId, selectedGroup.group_id);
      openModal("Usunięto użytkownika", "success");
    } catch (e) { openModal(e.message, "error"); }
  };

  const handleCreateTag = async (data) => {
    if (!data.tag_name) return openModal("Podaj nazwę", "error");
    try {
      await createTag(data);
      openModal("Dodano cechę", "success");
      resetViews();
      setActiveView('listtags');
    } catch (e) { openModal(e.message, "error"); }
  };

  const handleEditTag = async (data) => {
    if (!data.tag_name) return openModal("Podaj nazwę", "error");
    try {
      await updateTag(selectedTag.tag_id, data);
      openModal("Zmieniono cechę", "success");
      closeModals();
      resetViews();
      setActiveView('listtags');
    } catch (e) { openModal(e.message, "error"); }
  };

  const handleDeleteTag = async (tag) => {
    const target = tag || selectedTag;
    try {
      await deleteTag(target.tag_id);
      openModal("Cecha usunięta", "success");
      closeModals();
      resetViews();
      setActiveView('listtags');
    } catch (e) { openModal(e.message, "error"); }
  };


  const renderContent = () => {
    switch (activeView) {
      case 'list':
        return <GroupsList 
          groups={groups} isLoading={groupsLoading}
          onEdit={(group) => {
            setSelectedGroup(group);
            fetchGroupMembers(group.group_id);
            setActiveView('edit');
          }}
          onDelete={(group) => openConfirm(`Usunąć grupę ${group.group_name}?`, () => handleDeleteGroup(group))}
        />;
      
      case 'create':
        return <GroupForm 
          mode="create" 
          orgId={orgIdFromStorage} orgName={orgNameFromStorage}
          onSubmit={handleCreateGroup}
          onCancel={() => { resetViews(); setActiveView('list'); }}
        />;

      case 'edit':
        return <GroupForm 
          mode="edit" 
          initialData={selectedGroup}
          orgId={orgIdFromStorage} orgName={orgNameFromStorage}
          allUsers={allUsers} groupMembers={groupMembers}
          onDelete={() => openConfirm(`Usunąć grupę ${selectedGroup.group_name}?`, () => handleDeleteGroup(selectedGroup))}
          onCancel={() => { resetViews(); setActiveView('list'); }}
          onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
        />;

      case 'listtags':
        return <TagsList 
          tags={tags} isLoading={tagsLoading}
          onEdit={(tag) => { setSelectedTag(tag); setActiveView('edittag'); }}
          onDelete={(tag) => openConfirm(`Usunąć cechę ${tag.tag_name}?`, () => handleDeleteTag(tag))}
        />;

      case 'createtag':
        return <TagForm 
          mode="create"
          onSubmit={handleCreateTag}
          onCancel={() => { resetViews(); setActiveView('listtags'); }}
        />;

      case 'edittag':
        return <TagForm 
          mode="edit"
          initialData={selectedTag}
          onSubmit={(data) => openConfirm("Zapisać zmiany?", () => handleEditTag(data))}
          onDelete={() => openConfirm(`Usunąć cechę ${selectedTag.tag_name}?`, () => handleDeleteTag(selectedTag))}
          onCancel={() => { resetViews(); setActiveView('listtags'); }}
        />;
        
      default: return null;
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
                  <h1>Zarządzanie Grupami i Cechami</h1>
                  <p className="admin-header-subtitle">Dodawaj i edytuj grupy użytkowników oraz cechy w organizacji</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-main">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja - Grupy</h3>
              <button 
                onClick={() => { resetViews(); setActiveView('list'); }} 
                className={`admin-sidebar-button ${['list','edit'].includes(activeView) ? 'active' : ''}`}
              >
                👥 Lista Grup
              </button>
              <button 
                onClick={() => { resetViews(); setActiveView('create'); }} 
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowa Grupa
              </button>
            </div>

            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja - Cechy</h3>
              <button 
                onClick={() => { resetViews(); setActiveView('listtags'); }} 
                className={`admin-sidebar-button ${['listtags','edittag'].includes(activeView) ? 'active' : ''}`}
              >
                🏷️ Lista Cech
              </button>
              <button 
                onClick={() => { resetViews(); setActiveView('createtag'); }} 
                className={`admin-sidebar-button ${activeView === 'createtag' ? 'active' : ''}`}
              >
                ➕ Nowa Cecha
              </button>
            </div>

            {(groups.length > 0 || tags.length > 0) && (
              <div className="admin-sidebar-section" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <h3 className="admin-sidebar-title">Statystyki</h3>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  <p style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Grupy:</span> <strong>{groups.length}</strong>
                  </p>
                  <p style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cechy:</span> <strong>{tags.length}</strong>
                  </p>
                </div>
              </div>
            )}
          </aside>

          <main className="admin-content">
            {renderContent()}
          </main>
        </div>
      </div>

      <MsgModal isOpen={modal.isOpen} onClose={closeModals} message={modal.msg} type={modal.type} />
      <ConfirmModal isOpen={confirmModal.isOpen} onCloseYes={() => confirmModal.action && confirmModal.action()} onCloseNo={closeModals} message={confirmModal.msg} />
    </div>
  );
};

export default GroupsPage;