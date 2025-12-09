/* components/admin/tags/TagForm.js */

import React, { useState, useEffect } from 'react';

const TagForm = ({ mode, initialData, onSubmit, onCancel, onDelete }) => {
  const [tagName, setTagName] = useState('');

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTagName(initialData.tag_name || '');
    } else {
      setTagName('');
    }
  }, [mode, initialData]);

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">{mode === 'edit' ? 'Edytuj Cechę' : 'Nowa Cecha'}</h2>
        <p className="admin-content-description">
          {mode === 'edit' ? `${initialData?.tag_name}` : 'Wypełnij dane nowej cechy'}
        </p>
      </div>

      <div className="admin-form">
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
      </div>

      <div className="admin-actions">
        {mode === 'edit' ? (
          <>
            <button onClick={() => onSubmit({ tag_name: tagName })} className="admin-btn primary">Wprowadź zmiany</button>
            <button onClick={onDelete} className="admin-btn danger">Usuń Cechę</button>
            <button onClick={onCancel} className="admin-btn secondary">Anuluj</button>
          </>
        ) : (
          <>
            <button onClick={() => onSubmit({ tag_name: tagName })} className="admin-btn primary">Dodaj Cechę</button>
            <button onClick={onCancel} className="admin-btn secondary">Anuluj</button>
          </>
        )}
      </div>
    </>
  );
};

export default TagForm;