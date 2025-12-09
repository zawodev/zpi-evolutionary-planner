/* frontend/components/admin/users/UserForm.js */

import React from 'react';

const UserForm = ({
  isEditing,
  formData,
  setFormData,
  groups,
  selectedGroups,
  onAddGroup,
  onRemoveGroup,
  onSubmit,
  onCancel,
  onDelete,
  isValidEmail
}) => {

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const { firstName, lastName, email, role, weight } = formData;

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Użytkownika' : 'Nowy Użytkownik'}
        </h2>
        <p className="admin-content-description">
          {isEditing 
            ? 'Edytuj dane użytkownika' 
            : 'Wypełnij dane nowego użytkownika'
          }
        </p>
      </div>

      <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Imię *</label>
            <input
              type="text"
              className={`admin-input ${!firstName ? 'error' : ''}`}
              placeholder="Jan"
              value={firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Nazwisko *</label>
            <input
              type="text"
              className={`admin-input ${!lastName ? 'error' : ''}`}
              placeholder="Kowalski"
              value={lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
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
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div className="admin-form-group full-width">
          <label className="admin-label">Rola użytkownika</label>
          <div className="admin-button-group">
            <button
              type="button"
              onClick={() => handleChange('role', 'participant')}
              className={`admin-button-toggle ${role === "participant" ? 'active' : ''}`}
            >
              Uczestnik
            </button>
            <button
              type="button"
              onClick={() => handleChange('role', 'host')}
              className={`admin-button-toggle ${role === "host" ? 'active' : ''}`}
            >
              Prowadzący
            </button>
            <button
              type="button"
              onClick={() => handleChange('role', 'office')}
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
              onClick={() => handleChange('weight', Math.max(1, (parseInt(weight) || 5) - 1))}
            >
              −
            </button>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={weight || 5}
              onChange={(e) => handleChange('weight', parseInt(e.target.value) || 5)}
              className="admin-range-slider"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="admin-range-btn"
              onClick={() => handleChange('weight', Math.min(10, (parseInt(weight) || 5) + 1))}
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
                  onAddGroup(e.target.value);
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
                      onClick={() => onRemoveGroup(g.group_id)}
                      style={{ cursor: 'pointer', marginLeft: '5px' }}
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
        <button onClick={onCancel} className="admin-btn secondary">
          Anuluj
        </button>
        <button onClick={onSubmit} className="admin-btn primary">
          {isEditing ? 'Zapisz Zmiany' : 'Utwórz Użytkownika'}
        </button>
        {isEditing && (
          <button onClick={onDelete} className="admin-btn danger">
            Usuń Użytkownika
          </button>
        )}
      </div>
    </>
  );
};

export default UserForm;