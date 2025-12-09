/* frontend/components/admin/users/UserList.js */

import React from 'react';

const UserList = ({ users, onEdit, onDelete }) => {
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('id') : null;

  if (users.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">👥</div>
        <h3 className="admin-empty-title">Brak użytkowników</h3>
        <p className="admin-empty-description">
          Dodaj pierwszego użytkownika do systemu
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Użytkowników</h2>
        <p className="admin-content-description">
          Wszyscy użytkownicy w systemie ({users.length})
        </p>
      </div>

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
                    onClick={() => onEdit(user)}
                    className="admin-btn-icon"
                    style={{ marginRight: '8px' }}
                    title="Edytuj"
                  >
                    ✏️
                  </button>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => onDelete(user)}
                      className="admin-btn-icon danger"
                      title="Usuń"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default UserList;