import React, { useState, useEffect } from 'react';

const ScheduleHeader = ({ 
  selectedRecruitment, usedPriority, optimizationStatus, isLoadingStatus,
  isSaving, onSave, onClear, onHeatmapMouseDown, onHeatmapMouseUp, showingHeatmap
}) => {
  const recruitmentName = selectedRecruitment ? selectedRecruitment.recruitment_name : '...';
  const status = selectedRecruitment?.plan_status || 'brak statusu';
  const isOptimizationActive = status === 'optimizing';
  const isStatusAvailable = optimizationStatus && !isLoadingStatus;
  const isEditable = status === 'draft' || status === 'active' || status === 'optimizing';

  const [liveCountdown, setLiveCountdown] = useState({ totalRemaining: 0, currentJobRemaining: 0 });
  const [liveProgress, setLiveProgress] = useState(0);

  useEffect(() => {
    if (isStatusAvailable) {
      setLiveCountdown({
        totalRemaining: optimizationStatus.estimates.total_remaining_seconds,
        currentJobRemaining: optimizationStatus.estimates.current_job_remaining_seconds
      });
      setLiveProgress(optimizationStatus.meta.now_progress);
    }
  }, [optimizationStatus, isStatusAvailable]);

  useEffect(() => {
    if (!isStatusAvailable) return;
    const interval = setInterval(() => {
      setLiveCountdown(prev => ({
        totalRemaining: Math.max(0, prev.totalRemaining - 1),
        currentJobRemaining: Math.max(0, prev.currentJobRemaining - 1)
      }));
      if (optimizationStatus?.meta?.start_date && optimizationStatus?.meta?.estimated_end_date) {
        const startTime = new Date(optimizationStatus.meta.start_date).getTime();
        const endTime = new Date(optimizationStatus.meta.estimated_end_date).getTime();
        const nowTime = Date.now();
        const totalSpan = endTime - startTime;
        if (totalSpan > 0) {
          setLiveProgress(Math.max(0, Math.min(1, (nowTime - startTime) / totalSpan)));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isStatusAvailable, optimizationStatus]);

  const formatRemainingTime = (seconds) => {
    if (typeof seconds !== 'number' || seconds < 0) return 'Brak';
    const totalSeconds = Math.floor(seconds);
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 && minutes > 0 ? `${hours}h ${minutes}m` : (hours > 0 ? `${hours}h` : `${minutes}m`);
  };

  const getStatusLabel = (s) => {
      const map = {
          'draft': 'Draft', 'active': 'W użyciu', 'optimizing': 'Optymalizacja w toku',
          'completed': 'Zakończona (sukces)', 'failed': 'Zakończona (błąd)',
          'cancelled': 'Anulowana', 'archived': 'Zarchiwizowana'
      };
      return map[s] || 'Nieznany status';
  };

  return (
    <div className="sh-container">
      <div className="sh-top">
        <h2 className="sh-title">Wybrana Rekrutacja: <span style={{fontWeight: 400}}>{recruitmentName}</span></h2>
        <div className="sh-actions">
          <button
              onMouseDown={onHeatmapMouseDown}
              onMouseUp={onHeatmapMouseUp}
              onMouseLeave={onHeatmapMouseUp}
              className="sh-btn sh-btn-heatmap"
              disabled={!selectedRecruitment}
          >
              {showingHeatmap ? 'Wyświetlanie Heatmapy' : 'Pokaż Heatmapę'}
          </button>
          
          <button onClick={onSave} className="sh-btn sh-btn-primary" disabled={!selectedRecruitment || isSaving || !isEditable}>
              {isSaving ? 'Zapisywanie...' : 'Zachowaj'}
          </button>
          
          <button onClick={onClear} className="sh-btn sh-btn-delete" disabled={!selectedRecruitment || !isEditable}>
              Wyczyść
          </button>
        </div>
      </div>

      <div className="sh-stats">
        <div className="sh-labels-row">
            <div className="sh-label sh-soft-blue">Status: <b>{getStatusLabel(status)}</b></div>
            <div className="sh-label sh-soft-blue">Punkty Priorytetu: <b>{usedPriority}</b></div>
            <div className="sh-label sh-soft-blue">Edycja: <b>{isEditable ? 'Włączona' : 'Wyłączona'}</b></div>
        </div>

        {isOptimizationActive && (isLoadingStatus || isStatusAvailable) && (
            <div className="sh-progress-panel">
                {isLoadingStatus ? (
                     <p className="sh-loading-text">Ładowanie metryk optymalizacji...</p>
                ) : (
                    <>
                        <div className="sh-progress-info">
                            <span>Postęp: <b>{optimizationStatus.counts.current}/{optimizationStatus.counts.total}</b></span>
                            <span>Czas do końca: <b>{formatRemainingTime(liveCountdown.totalRemaining)}</b></span>
                        </div>
                        <div className="sh-progress-bar-wrapper">
                            <div className="sh-progress-bg"></div>
                            {optimizationStatus.timeline && optimizationStatus.timeline.map((event, idx) => {
                                let type = event.type;
                                if (liveProgress > event.end) type = 'past';
                                else if (liveProgress >= event.start && liveProgress <= event.end) type = 'current';
                                else type = 'future';
                                
                                const color = type === 'past' ? 'rgba(59, 130, 246, 0.4)' : (type === 'current' ? '#3b82f6' : '#d1d5db');
                                const border = type === 'current' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.4)';

                                return (
                                    <div key={idx} style={{
                                        position: 'absolute', left: `${event.start * 100}%`, width: `${(event.end - event.start) * 100}%`,
                                        height: '100%', backgroundColor: color, border: border, boxSizing: 'border-box', transition: 'all 0.3s ease'
                                    }} />
                                );
                            })}
                            <div style={{
                                position: 'absolute', left: `${liveProgress * 100}%`, top: '-4px', bottom: '-4px',
                                width: '3px', backgroundColor: '#dc2626', borderRadius: '2px', zIndex: 10
                            }} />
                        </div>
                        <div className="sh-job-info">
                            <span>Obecny job: <b>{formatRemainingTime(liveCountdown.currentJobRemaining)}</b> do końca</span>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>

      <style jsx>{`
        .sh-container {
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 1.5rem 2rem;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            box-sizing: border-box;
        }
        .sh-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .sh-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
            line-height: 1.2;
        }
        .sh-actions {
            display: flex;
            gap: 8px;
        }
        .sh-btn {
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .sh-btn-primary { background: #2563eb; color: white; }
        .sh-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .sh-btn-delete { background: #fee2e2; color: #dc2626; }
        .sh-btn-delete:hover:not(:disabled) { background: #fecaca; }
        .sh-btn-heatmap { background: #8b5cf6; color: white; border: 2px solid #8b5cf6; }
        .sh-btn-heatmap:hover:not(:disabled) { background: #7c3aed; border-color: #7c3aed; }
        .sh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .sh-stats {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .sh-labels-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .sh-label {
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .sh-label b {
            font-weight: 700;
        }
        .sh-soft-blue { 
            background: #dbeafe; 
            color: #1e40af; 
        }
        
        .sh-progress-panel {
            padding: 20px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%);
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
            animation: pulse-border 1.5s infinite alternate;
            border: 2px solid #3b82f633;
        }
        @keyframes pulse-border {
            to { border: 2px solid #3b82f688; }
        }
        .sh-progress-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 0.85rem;
            color: #374151;
        }
        .sh-progress-bar-wrapper {
            position: relative;
            background: #bfdbfe;
            border-radius: 8px;
            overflow: visible;
            height: 16px;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
            margin-bottom: 8px;
        }
        .sh-progress-bg {
            position: absolute; left: 0; width: 100%; height: 100%;
            background-color: #e5e7eb; border-radius: 8px;
        }
        .sh-job-info {
            font-size: 0.75rem; color: #6b7280;
        }
        .sh-loading-text {
            color: #92400e; font-weight: 700; text-align: center; margin: 0;
        }
      `}</style>
    </div>
  );
};

export default ScheduleHeader;