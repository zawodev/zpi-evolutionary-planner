import React from "react";

export default function EntriesSidebar({ fileError, onSave, onClear }) {
  return (
    <aside className="entries-sidebar">
      <div className="entries-section">
        <h3 className="entries-section-title">Nadchodzące zgłoszenia:</h3>
        <div className="entries-item active">
          <span>IST - Lato, 2024/25</span>
        </div>
        <div className="entries-item">
          <span>IKW - Zima, 2024/25</span>
        </div>
      </div>
      <div className="entries-section">
        <h3 className="entries-section-title">Zakończone zgłoszenia:</h3>
        <div className="entries-item">
          <span>IST - Lato, 2024/25</span>
        </div>
        <div className="entries-item">
          <span>IKW - Zima, 2024/25</span>
        </div>
        {fileError && (
          <div className="entries-error-message">
            {fileError}
          </div>
        )}
      </div>
      <div className="entries-section">
        <h3 className="entries-section-title">Akcje:</h3>
        <button onClick={onSave} className="btn btn--primary btn--filler">
          Zachowaj zmiany
        </button>
        <div className="pt-md"></div>
        <button onClick={onClear} className="btn btn--delete btn--filler">
          Wyczyść Preferencje
        </button>
      </div>
    </aside>
  );
}
