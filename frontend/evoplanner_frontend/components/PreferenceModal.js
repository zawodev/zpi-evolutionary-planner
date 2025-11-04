/* components/PreferenceModal.js */

import React from "react";

export default function PreferenceModal({
  mode,
  pendingSlot,
  editingSlot,
  setPendingSlot,
  setEditingSlot,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}) {

  if (mode === 'create' && !pendingSlot) return null;
  if (mode === 'edit' && !editingSlot) return null;

  const currentSlot = mode === 'create' ? pendingSlot : editingSlot;
  const setSlot = mode === 'create' ? setPendingSlot : setEditingSlot;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">
          {mode === 'create' ? 'Nowa preferencja' : 'Edytuj preferencję'}
        </h3>
        <p className="modal-subtitle">
          {mode === 'create'
            ? `Zaznaczony czas: ${pendingSlot?.start} - ${pendingSlot?.end}`
            : `Edytujesz: ${editingSlot?.start} - ${editingSlot?.end}`
          }
        </p>

        {mode === 'create' ? (
          <div className="modal-body">
            <div>
              <label className="modal-label">
                Typ preferencji
              </label>
              <div className="modal-button-group">
                <button
                  onClick={() => setSlot({ ...currentSlot, type: 'prefer' })}
                  className={`btn modal-choice-btn ${currentSlot?.type === 'prefer' ? 'modal-choice-btn--prefer-active' : ''}`}
                >
                  Chcę zajęcia
                </button>
                <button
                  onClick={() => setSlot({ ...currentSlot, type: 'avoid' })}
                  className={`btn modal-choice-btn ${currentSlot?.type === 'avoid' ? 'modal-choice-btn--avoid-active' : ''}`}
                >
                  Chcę wolne
                </button>
              </div>
            </div>

            <div>
              <label className="modal-label">
                Punkty priorytetu: {currentSlot?.priority || 1}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentSlot?.priority || 1}
                onChange={(e) => setSlot({ ...currentSlot, priority: parseInt(e.target.value) })}
                className="scrollbar--priority"
              />
              <div className="modal-range-labels">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={onAdd}
                className="btn btn--primary btn--filler"
              >
                Dodaj
              </button>
              <button
                onClick={onClose}
                className="btn btn--neutral btn--filler"
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="modal-input-grid">
              <div>
                <label className="modal-label modal-label--small">
                  Start
                </label>
                <input
                  type="time"
                  value={currentSlot?.start || ''}
                  onChange={(e) => setSlot({ ...currentSlot, start: e.target.value })}
                  className="modal-input"
                  step="900"
                />
              </div>
              <div>
                <label className="modal-label modal-label--small">
                  Koniec
                </label>
                <input
                  type="time"
                  value={currentSlot?.end || ''}
                  onChange={(e) => setSlot({ ...currentSlot, end: e.target.value })}
                  className="modal-input"
                  step="900"
                />
              </div>
            </div>

            <div>
              <label className="modal-label">
                Typ preferencji
              </label>
              <div className="modal-button-group">
                <button
                  onClick={() => setSlot({ ...currentSlot, type: 'prefer' })}
                  className={`btn modal-choice-btn ${currentSlot?.type === 'prefer' ? 'modal-choice-btn--prefer-active' : ''}`}
                >
                  Chcę zajęcia
                </button>
                <button
                  onClick={() => setSlot({ ...currentSlot, type: 'avoid' })}
                  className={`btn modal-choice-btn ${currentSlot?.type === 'avoid' ? 'modal-choice-btn--avoid-active' : ''}`}
                >
                  Chcę wolne
                </button>
              </div>
            </div>

            <div>
              <label className="modal-label">
                Punkty priorytetu: {currentSlot?.priority || 1}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentSlot?.priority || 1}
                onChange={(e) => setSlot({ ...currentSlot, priority: parseInt(e.target.value) })}
                className="scrollbar--priority"
              />
              <div className="modal-range-labels">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={onUpdate} className="btn btn--primary btn--filler">
                Zapisz
              </button>
              <button onClick={onDelete} className="btn btn--delete">
                Usuń
              </button>
              <button onClick={onClose} className="btn btn--neutral">
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}