/* components/admin/ConfirmModal.js */

import React from 'react';

export default function ConfirmModal({ isOpen, onCloseYes, onCloseNo, message }) {
  if (!isOpen) return null;

  return (
    // Zaktualizowano: Kliknięcie na overlay zamyka modal (traktowane jako Anuluj)
    <div className="admin-modal-overlay" onClick={onCloseNo}>
      {/* DODANO: Zatrzymanie propagacji, aby kliknięcie w dialog nie zamykało modala */}
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-icon warning">
            ⚠️
          </div>
          <h3 className="admin-modal-title">Potwierdzenie</h3>
        </div>

        <div className="admin-modal-body">
          <p className="admin-modal-message">{message}</p>
        </div>

        <div className="admin-modal-footer">
          <button
            onClick={onCloseNo}
            className="admin-btn secondary"
            style={{ marginRight: '8px' }}
          >
            Anuluj
          </button>
          <button
            onClick={onCloseYes}
            className="admin-btn danger"
          >
            Potwierdź
          </button>
        </div>
      </div>
    </div>
  );
}