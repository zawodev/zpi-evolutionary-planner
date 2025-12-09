/* components/admin/MsgModal.js */
import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export default function MsgModal({ isOpen, onClose, message, type = 'info' }) {
  if (!isOpen) return null;

  const getIcon = () => {
    const iconProps = { size: 32, strokeWidth: 2.5 };
    switch (type) {
      case 'success': return <CheckCircle {...iconProps} />;
      case 'error': return <XCircle {...iconProps} />;
      case 'warning': return <AlertTriangle {...iconProps} />;
      default: return <Info {...iconProps} />;
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

  const getTitle = () => {
    switch (type) {
      case 'success': return 'Sukces!';
      case 'error': return 'Błąd';
      case 'warning': return 'Uwaga';
      default: return 'Informacja';
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className={`admin-modal-icon ${getIconClass()}`}>
            {getIcon()}
          </div>
          <h3 className="admin-modal-title">{getTitle()}</h3>
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