/* components/admin/groups/GroupsList.js */

import React from 'react';

const GroupsList = ({ groups, isLoading, onEdit, onDelete }) => {
  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Grup</h2>
        <p className="admin-content-description">
          Wszystkie grupy w systemie ({groups?.length || 0})
        </p>
      </div>

      {isLoading ? (
        <div className="admin-loading">Ładowanie grup...</div>
      ) : groups.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">👥</div>
          <h3 className="admin-empty-title">Brak grup</h3>
          <p className="admin-empty-description">Dodaj pierwszą grupę do organizacji</p>
        </div>
      ) : (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Nazwa Grupy</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Kategoria</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>ID Organizacji</th>
                <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.group_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{group.group_name}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    <span className="admin-badge secondary">{group.category}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{group.organization_id || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(group); }} 
                      className="admin-btn-icon" 
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(group); }} 
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

export default GroupsList;