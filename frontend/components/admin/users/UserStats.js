/* frontend/components/admin/users/UserStats.js */

import React from 'react';

const UserStats = ({ users }) => {
  if (!users || users.length === 0) return null;

  return (
    <div className="admin-sidebar-section">
      <h3 className="admin-sidebar-title">Statystyki</h3>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
        <p style={{ marginBottom: '8px' }}>
          <strong>Łącznie:</strong> {users.length}
        </p>
        <p style={{ marginBottom: '8px' }}>
          <strong>Uczestnicy:</strong>{' '}
          {users.filter(u => u.role === 'participant').length}
        </p>
        <p style={{ marginBottom: '8px' }}>
          <strong>Prowadzący:</strong>{' '}
          {users.filter(u => u.role === 'host').length}
        </p>
        <p style={{ marginBottom: '8px' }}>
          <strong>Sekretariat:</strong>{' '}
          {users.filter(u => u.role === 'office').length}
        </p>
      </div>
    </div>
  );
};

export default UserStats;