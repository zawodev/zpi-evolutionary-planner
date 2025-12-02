/* components/admin/MsgModal.js */

import React from 'react';

export default function MsgModal({ isOpen, onClose, message, type = 'info' }) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getIconClass = () => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    // Zaktualizowano: Kliknięcie na overlay zamyka modal
    <div className="admin-modal-overlay" onClick={onClose}>
      {/* DODANO: Zatrzymanie propagacji, aby kliknięcie w dialog nie zamykało modala */}
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className={`admin-modal-icon ${getIconClass()}`}>
            {getIcon()}
          </div>
          <h3 className="admin-modal-title">Powiadomienie</h3>
        </div>

        <div className="admin-modal-body">
          <p className="admin-modal-message">{message}</p>
        </div>

        <div className="admin-modal-footer">
          <button
            onClick={onClose}
            className="admin-btn primary"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}