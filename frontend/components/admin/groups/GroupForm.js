/* components/admin/groups/GroupForm.js */

import React, { useState, useEffect } from 'react';

const GroupForm = ({ 
  mode,
  initialData, 
  orgId, 
  orgName, 
  allUsers, 
  groupMembers, 
  onSubmit, 
  onCancel, 
  onDelete,
  onAddMember,
  onRemoveMember 
}) => {
  const [formData, setFormData] = useState({
    group_name: '',
    category: 'year1'
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        group_name: initialData.group_name || '',
        category: initialData.category || 'year1'
      });
    } else {
      setFormData({ group_name: '', category: 'year1' });
    }
  }, [mode, initialData]);

  const handleSelectUser = (e) => {
    const userId = e.target.value;
    if (userId) {
      onAddMember(userId);
      e.target.value = "";
    }
  };

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {mode === 'edit' ? 'Edytuj Grupę' : 'Nowa Grupa'}
        </h2>
        <p className="admin-content-description">
          {mode === 'edit' ? `${initialData?.group_name}` : 'Wypełnij dane nowej grupy'}
        </p>
      </div>

      <div className="admin-form">
        <div className="admin-form-group full-width">
          <label className="admin-label">Nazwa Grupy *</label>
          <input
            type="text"
            className="admin-input"
            placeholder="np. Rok I, Semestr Zimowy"
            value={formData.group_name}
            onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
            disabled={mode === 'edit'}
          />
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Kategoria</label>
          <input
            type="text"
            className="admin-input"
            placeholder="np. year1, IT_Dept, HR"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            disabled={mode === 'edit'}
          />
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Organizacja (ID)</label>
          <input
            type="text"
            className="admin-input"
            value={orgId || (mode === 'edit' ? initialData?.organization_id : 'Brak ID')}
            disabled
          />
          {orgName && (
            <p className="admin-content-description" style={{ marginTop: '0.5rem' }}>
              Nazwa: {orgName}
            </p>
          )}
        </div>

        {mode === 'edit' && (
          <div className="admin-form-group full-width" style={{ marginTop: '2rem', borderTop: '1px solid #f3f4f6', paddingTop: '2rem' }}>
            <h3 className="admin-content-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              Zarządzaj Członkami Grupy
            </h3>

            <label className="admin-label">Dodaj użytkownika do grupy</label>
            <select className="admin-select" onChange={handleSelectUser} defaultValue="">
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
                    <span className="admin-tag-remove" onClick={() => onRemoveMember(user.id)}>✕</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="admin-content-description" style={{ marginTop: '1rem' }}>Brak członków w tej grupie.</p>
            )}
          </div>
        )}
      </div>

      <div className="admin-actions">
        {mode === 'create' && (
          <button onClick={() => onSubmit(formData)} className="admin-btn primary">
            Dodaj grupę
          </button>
        )}
        
        <button onClick={onCancel} className="admin-btn secondary">
          {mode === 'edit' ? 'Wróć' : 'Anuluj'}
        </button>

        {mode === 'edit' && (
          <button onClick={onDelete} className="admin-btn danger">Usuń Grupę</button>
        )}
      </div>
    </>
  );
};

export default GroupForm;