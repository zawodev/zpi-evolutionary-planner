/* components/admin/ConfirmModal.js */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, onCloseYes, onCloseNo, message }) {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onCloseNo}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-icon warning">
            <AlertTriangle size={32} strokeWidth={2.5} />
          </div>
          <h3 className="admin-modal-title">Potwierdzenie</h3>
        </div>

        <div className="admin-modal-body">
          <p className="admin-modal-message">{message}</p>
        </div>

        <div className="admin-modal-footer" style={{ width: '100%', display: 'flex', gap: '12px' }}>
          <button
            onClick={onCloseNo}
            className="admin-btn secondary"
            style={{ flex: 1, marginRight: 0 }}
          >
            Anuluj
          </button>
          <button
            onClick={onCloseYes}
            className="admin-btn danger"
            style={{ flex: 1 }}
          >
            Potwierdź
          </button>
        </div>
      </div>
    </div>
  );
}