import React from 'react';

const formatTime = (time) => {
  if (typeof time === 'string') {
    const parts = time.split(':');
    if (parts.length === 2) {
      const hour = parts[0].padStart(2, '0');
      const minute = parts[1].padStart(2, '0');
      return `${hour}:${minute}`;
    }
    return time;
  }
  return `${time.toString().padStart(2, '0')}:00`;
};

const ScheduleSlot = ({ slot, position, onClick, isEditable }) => {
  const isCompact = position.height < 45;
  const isTiny = position.height < 22;

  let sizeClass = '';
  if (isTiny) sizeClass = 'tiny';
  else if (isCompact) sizeClass = 'compact';

  return (
    <>
      <div
        className={`schedule-slot ${slot.type} ${!isEditable ? 'read-only' : ''} ${sizeClass}`}
        style={{
          top: `${position.top}px`,
          height: `${position.height}px`
        }}
        onClick={isEditable ? onClick : (e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        title={`${slot.label} (${formatTime(slot.start)} - ${formatTime(slot.end)}) - ${slot.priority}pt`}
      >
        <span className="slot-label">
            {slot.label}
            {isTiny && <span className="tiny-points">({slot.priority})</span>}
        </span>
        
        {!isTiny && (
            <div className="slot-details">
              <span className="slot-time">
                  {formatTime(slot.start)} - {formatTime(slot.end)}
              </span>
              <span className="slot-points">{slot.priority}pt</span>
            </div>
        )}
      </div>

      <style jsx>{`
        .schedule-slot {
          position: absolute;
          left: 4px;
          right: 4px;
          border-radius: 0.35rem;
          padding: 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, z-index 0s; /* Płynniejsza animacja */
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 0;
          background: white;
          z-index: 10;
        }

        .schedule-slot.prefer {
          background: rgba(209, 250, 229, 1);
          color: #065f46;
        }

        .schedule-slot.avoid {
          background: rgba(254, 202, 202, 1);
          color: #991b1b;
        }

        .schedule-slot.read-only {
            cursor: default;
        }

        /* --- Style dla małych slotów --- */
        
        .schedule-slot.compact {
            padding: 2px 6px;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 5px;
        }

        .schedule-slot.tiny {
            padding: 0 4px;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            border-radius: 0.2rem;
        }

        /* --- Hover Effect --- */

        .schedule-slot:hover:not(.read-only) {
          transform: scale(1.02);
          z-index: 50; 
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          
          /* ZMIANA TUTAJ: Usunięto height: auto !important */
          /* min-height sprawi, że powiększą się TYLKO te sloty, w których tekst się nie mieści */
          min-height: fit-content; 
        }

        .schedule-slot.read-only:hover {
            transform: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* --- Wnętrze slotu --- */

        .slot-label {
          font-weight: 600;
          line-height: 1.2;
          display: block;
          flex-shrink: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .schedule-slot.compact .slot-label,
        .schedule-slot.tiny .slot-label {
            font-size: 0.7rem;
            margin-bottom: 0;
        }

        .tiny-points {
            margin-left: 4px;
            opacity: 0.8;
            font-size: 0.65rem;
        }

        .slot-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
          margin-top: auto;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          width: 100%;
        }

        .schedule-slot.compact .slot-details {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
            width: auto;
            gap: 5px;
            flex-shrink: 0;
        }

        .schedule-slot.compact .slot-time {
            display: none;
        }

        .slot-time {
          opacity: 0.9;
          font-weight: 600;
        }

        .slot-points {
          font-weight: 700;
          opacity: 0.9;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
};

export default ScheduleSlot;