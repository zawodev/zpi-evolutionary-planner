import React, { useState, useEffect } from 'react';

const PreferenceModal = ({ 
  mode, 
  pendingSlot, 
  editingSlot, 
  setPendingSlot, 
  setEditingSlot, 
  onClose, 
  onAdd, 
  onUpdate, 
  onDelete, 
  isEditable, 
  selectedRecruitment 
}) => {
  const isEditMode = mode === 'edit';
  const currentSlot = isEditMode ? editingSlot : pendingSlot;
  const [validationError, setValidationError] = useState('');
  
  const parseTime = (val) => {
    if (typeof val === 'string') {
      const p = val.split(':');
      return { h: parseInt(p[0], 10) || 0, m: parseInt(p[1], 10) || 0 };
    }
    return { h: Math.floor(val), m: 0 };
  };

  if (!currentSlot) return null;

  const startP = parseTime(currentSlot.start);
  const endP = parseTime(currentSlot.end);

  const [sHour, setSHour] = useState(startP.h);
  const [sMin, setSMin] = useState(startP.m);
  const [eHour, setEHour] = useState(endP.h);
  const [eMin, setEMin] = useState(endP.m);
  const [priority, setPriority] = useState(currentSlot.priority || 1);
  const [type, setType] = useState(currentSlot.type || 'prefer');

  useEffect(() => {
    setValidationError('');
    const gridStart = parseInt(selectedRecruitment?.day_start_time?.split(':')[0] || "7", 10) * 60;
    const gridEnd = parseInt(selectedRecruitment?.day_end_time?.split(':')[0] || "19", 10) * 60;
    const startM = sHour * 60 + sMin;
    const endM = eHour * 60 + eMin;

    if (sHour < 0 || sHour > 23 || eHour < 0 || eHour > 23) return setValidationError('Błędny czas.');
    if (startM < gridStart || startM >= gridEnd) return setValidationError('Start poza zakresem.');
    if (endM <= gridStart || endM > gridEnd) return setValidationError('Koniec poza zakresem.');
    if (endM <= startM) return setValidationError('Koniec musi być po starcie.');
    if (endM - startM < 15) return setValidationError('Min. 15 minut.');
  }, [sHour, sMin, eHour, eMin, selectedRecruitment]);

  useEffect(() => {
    const fmt = (h, m) => `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    const setter = isEditMode ? setEditingSlot : setPendingSlot;
    setter(prev => ({ ...prev, start: fmt(sHour, sMin), end: fmt(eHour, eMin), priority, type }));
  }, [sHour, sMin, eHour, eMin, priority, type, isEditMode]);

  const handleSave = () => {
    if (validationError) return;
    isEditMode ? onUpdate() : onAdd();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const fmt = (val) => val.toString().padStart(2, '0');

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{!isEditable ? 'Podgląd' : (isEditMode ? 'Edytuj Preferencję' : 'Dodaj Preferencję')}</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          {validationError && <div className="error-alert">{validationError}</div>}
          {!isEditable && <div className="info-alert">Edycja zablokowana.</div>}

          <div className="section">
            <h3 className="section-title">TYP</h3>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={!isEditable}>
              <option value="prefer">Chcę mieć zajęcia</option>
              <option value="avoid">Brak zajęć</option>
            </select>
          </div>

          <div className="section">
            <h3 className="section-title">PRZEDZIAŁ CZASOWY</h3>
            <div className="time-grid">
              <div className="time-group">
                <label>START:</label>
                <div className="time-box">
                  <input 
                    type="number" 
                    min="0" 
                    max="23" 
                    value={fmt(sHour)} 
                    onChange={(e) => setSHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))} 
                    disabled={!isEditable} 
                  />
                  <span>:</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="59" 
                    step="15" 
                    value={fmt(sMin)} 
                    onChange={(e) => setSMin(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} 
                    disabled={!isEditable} 
                  />
                </div>
              </div>
              <div className="time-group">
                <label>KONIEC:</label>
                <div className="time-box">
                  <input 
                    type="number" 
                    min="0" 
                    max="23" 
                    value={fmt(eHour)} 
                    onChange={(e) => setEHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))} 
                    disabled={!isEditable} 
                  />
                  <span>:</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="59" 
                    step="15" 
                    value={fmt(eMin)} 
                    onChange={(e) => setEMin(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} 
                    disabled={!isEditable} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">PRIORYTET</h3>
            <div className="priority-box">
              <div className="priority-label">Priorytet: {priority}</div>
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={priority} 
                onChange={(e) => setPriority(parseInt(e.target.value))} 
                className="slider" 
                disabled={!isEditable}
              />
              <div className="markers"><span>1</span><span>3</span><span>5</span></div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isEditMode && isEditable && <button onClick={onDelete} className="btn btn-danger">Usuń</button>}
          <button onClick={onClose} className="btn btn-secondary">Anuluj</button>
          {isEditable && <button onClick={handleSave} className="btn btn-primary" disabled={!!validationError}>{isEditMode ? 'Zapisz' : 'Dodaj'}</button>}
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay { 
          position: fixed; 
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal-content { 
          background: white; 
          border-radius: 1rem; 
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          width: 100%; 
          max-width: 500px; 
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        .modal-header { 
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .modal-header h2 { 
          margin: 0; 
          font-size: 1.5rem; 
          font-weight: 700;
          color: #1f2937; 
        }

        .close-btn {
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          color: #6b7280;
          border-radius: 0.375rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
        
        .modal-body { 
          padding: 1.5rem; 
        }
        
        .error-alert { 
          background: #fef2f2;
          color: #991b1b; 
          padding: 0.75rem 1rem; 
          border-radius: 0.5rem; 
          margin-bottom: 1.5rem; 
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .info-alert { 
          background: #eff6ff;
          color: #1e40af; 
          padding: 0.75rem 1rem; 
          border-radius: 0.5rem; 
          margin-bottom: 1.5rem; 
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .section { 
          margin-bottom: 1.5rem; 
        }

        .section:last-child {
          margin-bottom: 0;
        }
        
        .section-title { 
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.75rem 0;
        }
        
        .section select { 
          width: 100%; 
          padding: 0.75rem; 
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: #f9fafb;
          color: #1f2937;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .section select:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .section select:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
        }

        .section select:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .time-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 0.75rem; 
        }

        .time-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .time-group label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
        }
        
        .time-box { 
          display: flex; 
          align-items: center; 
          justify-content: center;
          gap: 0.5rem; 
          border: 1px solid #d1d5db;
          border-radius: 0.5rem; 
          padding: 0.75rem;
          background: #f9fafb;
          transition: all 0.2s;
        }

        .time-box:hover:not(:has(input:disabled)) {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .time-box:focus-within {
          border-color: #3b82f6;
          background: white;
        }
        
        .time-box input { 
          border: none; 
          width: 2.5rem;
          text-align: center; 
          font-weight: 600; 
          font-size: 1.125rem; 
          outline: none;
          background: transparent;
          color: #1f2937;
          font-variant-numeric: tabular-nums;
          padding: 0;
        }

        .time-box input:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .time-box span {
          font-weight: 600;
          font-size: 1.125rem;
          color: #6b7280;
        }
        
        .priority-box { 
          background: #f9fafb;
          padding: 1rem; 
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .priority-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }
        
        .slider { 
          width: 100%; 
          height: 6px;
          margin: 0.75rem 0;
          -webkit-appearance: none;
          appearance: none;
          background: #3b82f6;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .markers { 
          display: flex; 
          justify-content: space-between; 
          font-size: 0.75rem; 
          color: #6b7280;
          font-weight: 600;
          padding: 0;
        }
        
        .modal-footer { 
          padding: 1rem 1.5rem;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          display: flex; 
          justify-content: flex-end; 
          gap: 0.75rem; 
        }
        
        .btn { 
          padding: 0.625rem 1.25rem; 
          border-radius: 0.375rem; 
          font-weight: 600; 
          font-size: 0.875rem;
          cursor: pointer; 
          border: none;
          transition: all 0.2s;
        }
        
        .btn:disabled { 
          opacity: 0.5; 
          cursor: not-allowed; 
        }
        
        .btn-primary { 
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }
        
        .btn-secondary { 
          background: white; 
          border: 1px solid #d1d5db;
          color: #374151; 
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .btn-danger { 
          background: #ef4444;
          color: white; 
          margin-right: auto;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .time-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PreferenceModal;