import React, { useState, useEffect } from 'react';
import { Clock, Zap, TrendingUp } from 'lucide-react';

const OptimizationProgressPanel = ({ optimizationStatus, isLoadingStatus }) => {
  const isStatusAvailable = optimizationStatus && !isLoadingStatus;
  const [liveCountdown, setLiveCountdown] = useState({
    totalRemaining: 0,
    currentJobRemaining: 0
  });
  const [liveProgress, setLiveProgress] = useState(0);
  const [lastApiUpdate, setLastApiUpdate] = useState(null);

  useEffect(() => {
    if (isStatusAvailable) {
      const totalRemaining = optimizationStatus.estimates?.total_remaining_seconds || 0;
      const currentJobRemaining = optimizationStatus.estimates?.current_job_remaining_seconds || 0;
      setLiveCountdown({
        totalRemaining: totalRemaining,
        currentJobRemaining: currentJobRemaining
      });
      setLiveProgress(optimizationStatus.meta?.now_progress || 0);
      setLastApiUpdate(Date.now());
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
          const elapsed = nowTime - startTime;
          const progress = Math.max(0, Math.min(1, elapsed / totalSpan));
          setLiveProgress(progress);
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
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return (
    <>
      <div className="optimization-panel" key={`progress-${lastApiUpdate}`}>
        {isLoadingStatus ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Ładowanie metryk optymalizacji...</span>
          </div>
        ) : optimizationStatus ? (
          <>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">
                  <TrendingUp size={18} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Postęp</span>
                  <span className="stat-value">
                    {optimizationStatus.counts?.current || 0}/{optimizationStatus.counts?.total || 0}
                  </span>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">
                  <Clock size={18} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Czas do końca</span>
                  <span className="stat-value">{formatRemainingTime(liveCountdown.totalRemaining)}</span>
                </div>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-bar-container">
                <div className="progress-track">
                  <div 
                    className="progress-fill"
                    style={{ width: `${liveProgress * 100}%` }}
                  />
                </div>
                
                <div className="progress-labels">
                  <span className="progress-label start">Start</span>
                  <span className="progress-label end">Koniec</span>
                </div>
              </div>
            </div>

            <div className="current-job-info">
              <Zap size={14} />
              <span>
                Obecny job: <strong>{formatRemainingTime(liveCountdown.currentJobRemaining)}</strong> do końca
              </span>
            </div>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .optimization-panel {
          background: white;
          border-radius: 0.75rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          margin-top: 1rem;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 0.5rem;
          color: white;
          flex-shrink: 0;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
        }

        .progress-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .progress-bar-container {
          position: relative;
        }

        .progress-track {
          position: relative;
          height: 2.5rem;
          background: #f3f4f6;
          border-radius: 1.25rem;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
          transition: width 0.3s ease-out;
        }

        .progress-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          padding: 0 0.25rem;
        }

        .progress-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .current-job-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          background: #eff6ff;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          color: #1e40af;
          font-weight: 500;
          border: 1px solid #dbeafe;
        }

        .current-job-info strong {
          font-weight: 700;
          color: #1e3a8a;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .optimization-panel {
            padding: 1rem;
          }
        }
      `}</style>
    </>
  );
};

export default OptimizationProgressPanel;