import React from 'react';

const RoomForm = ({ 
  isEditing, 
  formData, 
  setFormData, 
  tags, 
  selectedTags, 
  onAddTag, 
  onRemoveTag, 
  onSubmit, 
  onCancel, 
  onDelete 
}) => {
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const { buildingName, roomNumber, capacity } = formData;

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Pokój' : 'Nowy Pokój'}
        </h2>
        <p className="admin-content-description">
          {isEditing 
            ? 'Edytuj dane wybranego pokoju' 
            : 'Wypełnij dane nowego pokoju'
          }
        </p>
      </div>

      <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Nazwa budynku *</label>
            <input
              type="text"
              className="admin-input"
              placeholder="np. Budynek A"
              value={buildingName}
              onChange={(e) => handleChange('buildingName', e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Numer sali *</label>
            <input
              type="text"
              className="admin-input"
              placeholder="np. 101"
              value={roomNumber}
              onChange={(e) => handleChange('roomNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Pojemność *</label>
          <input
            type="number"
            className="admin-input"
            min="1"
            placeholder="30"
            value={capacity}
            onChange={(e) => handleChange('capacity', e.target.value)}
          />
        </div>

        {tags.length > 0 && (
          <div className="admin-form-group full-width">
            <label className="admin-label">Dodaj cechy pokoju</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  onAddTag(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz cechę...</option>
              {tags.map((tag) => (
                <option key={tag.tag_id} value={tag.tag_id}>
                  {tag.tag_name}
                </option>
              ))}
            </select>

            {selectedTags.length > 0 && (
              <div className="admin-tags">
                {selectedTags.map((tag) => (
                  <span key={tag.tag_id} className="admin-tag">
                    {tag.tag_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => onRemoveTag(tag.tag_id)}
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
          {isEditing ? 'Zapisz Zmiany' : 'Utwórz Pokój'}
        </button>
        {isEditing && (
          <button onClick={onDelete} className="admin-btn danger">
            Usuń Pokój
          </button>
        )}
      </div>
    </>
  );
};

export default RoomForm;