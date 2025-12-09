/* components/admin/tags/TagsList.js */

import React from 'react';

const TagsList = ({ tags, isLoading, onEdit, onDelete }) => {
  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Cech</h2>
        <p className="admin-content-description">
          Wszystkie cechy w systemie ({tags?.length || 0})
        </p>
      </div>

      {isLoading ? (
        <div className="admin-loading">Ładowanie cech...</div>
      ) : (!tags || tags.length === 0) ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">🏷️</div>
          <h3 className="admin-empty-title">Brak Cech</h3>
          <p className="admin-empty-description">Dodaj pierwszą cechę do organizacji</p>
        </div>
      ) : (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Nazwa Cechy</th>
                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.tag_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{tag.tag_name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(tag); }} 
                      className="admin-btn-icon" 
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(tag); }} 
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
      )}
    </>
  );
};

export default TagsList;