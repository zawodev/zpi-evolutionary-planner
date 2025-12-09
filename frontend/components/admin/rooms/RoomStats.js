import React from 'react';

const RoomStats = ({ rooms }) => {
  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="admin-sidebar-section">
      <h3 className="admin-sidebar-title">Statystyki</h3>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
        <p style={{ marginBottom: '8px' }}>
          <strong>Łącznie pokoi:</strong> {rooms.length}
        </p>
        <p style={{ marginBottom: '8px' }}>
          <strong>Łączna pojemność:</strong>{' '}
          {rooms.reduce((sum, r) => sum + r.capacity, 0)}
        </p>
      </div>
    </div>
  );
};

export default RoomStats;