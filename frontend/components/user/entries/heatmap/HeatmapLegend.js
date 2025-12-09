import React from 'react';

const HeatmapLegend = () => (
    <div className="heatmap-legend">
        <div className="legend-title">Legenda popularności:</div>
        <div className="legend-gradient"></div>
        <div className="legend-labels">
            <span>Duże zainteresowanie (Czerwień)</span>
            <span>Brak zainteresowania (Biel)</span>
        </div>
        <style jsx>{`
            .heatmap-legend { background: white; border-radius: 0.875rem; padding: 1.25rem; margin-top: 1.5rem; border: 1px solid #f3f4f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .legend-title { font-weight: 700; margin-bottom: 0.5rem; font-size: 0.9rem; color: #111827; }
            .legend-gradient { height: 20px; background: linear-gradient(to right, #f87171, #ffffff); border-radius: 4px; margin-bottom: 0.5rem; border: 1px solid #eee; }
            .legend-labels { display: flex; justify-content: space-between; font-size: 0.8rem; color: #6b7280; font-weight: 500; }
        `}</style>
    </div>
);

export default HeatmapLegend;