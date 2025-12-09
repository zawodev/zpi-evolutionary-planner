import React from 'react';

const RoomList = ({ rooms, onEdit, onDelete }) => {
  if (rooms.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">🏢</div>
        <h3 className="admin-empty-title">Brak pokoi</h3>
        <p className="admin-empty-description">
          Dodaj pierwszy pokój do systemu
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Pokoi</h2>
        <p className="admin-content-description">
          Wszystkie pokoje w systemie ({rooms.length})
        </p>
      </div>

      <div className="admin-table">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                Budynek
              </th>
              <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                Numer Sali
              </th>
              <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                Pojemność
              </th>
              <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                Akcje
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.room_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>
                  {room.building_name}
                </td>
                <td style={{ padding: '12px', color: '#6b7280' }}>
                  {room.room_number}
                </td>
                <td style={{ padding: '12px', color: '#6b7280' }}>
                  {room.capacity}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <button
                    onClick={() => onEdit(room)}
                    className="admin-btn-icon"
                    style={{ marginRight: '8px' }}
                    title="Edytuj"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(room)}
                    className="admin-btn-icon danger"
                    title="Usuń"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default RoomList;