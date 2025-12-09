/* frontend/components/user/entries/schedule/ScheduleColumn.js */

import React from 'react';
import ScheduleSlot from './ScheduleSlot';

const ScheduleColumn = ({ 
    day, 
    slots, 
    dragPreview, 
    onMouseDown, 
    onSlotClick, 
    isDragging, 
    dragDay, 
    isEditable, 
    showingHeatmap, 
    heatmapData, 
    selectedRecruitment, 
    gridStartHour = 7 
}) => {
    const startHour = gridStartHour;
    const endHour = selectedRecruitment?.day_end_time 
        ? parseInt(selectedRecruitment.day_end_time.split(':')[0]) 
        : 19;
    const hourHeight = 60;
    const totalHeight = (endHour - startHour) * hourHeight;

    const getPosition = (start, end) => {
        const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
        const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
        const dayStartMinutes = startHour * 60;
        const top = (startMinutes - dayStartMinutes) * (hourHeight / 60);
        const height = (endMinutes - startMinutes) * (hourHeight / 60);
        return { top, height };
    };

    const renderHeatmapOverlay = () => {
        if (!showingHeatmap || !heatmapData) return null;
        const daysMap = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4 };
        const dayIndex = daysMap[day];
        const dayHeatmapSlots = heatmapData.filter(h => h.day_of_week === dayIndex);

        return dayHeatmapSlots.map((hSlot, idx) => {
            const intensity = Math.min(Math.max(hSlot.rawWeight / (hSlot.maxPositiveWeight || 1), 0), 1);
            return (
                <div 
                    key={`hm-${idx}`}
                    style={{
                        position: 'absolute',
                        top: `${(hSlot.hour - startHour) * hourHeight}px`,
                        height: `${hourHeight}px`,
                        left: 0,
                        right: 0,
                        backgroundColor: `rgba(248, 113, 113, ${intensity * 0.8})`, // Zwiększyłem nieco krycie (0.8) dla lepszej widoczności
                        pointerEvents: 'none',
                        zIndex: 1
                    }}
                />
            );
        });
    };

    return (
        <div 
            className="new-entries-schedule-column" 
            style={{ height: `${totalHeight}px` }}
            onMouseDown={isEditable ? onMouseDown : undefined}
        >
            {Array.from({ length: endHour - startHour }).map((_, i) => (
                <div 
                    key={i} 
                    style={{
                        position: 'absolute',
                        top: `${(i + 1) * hourHeight}px`,
                        left: 0,
                        right: 0,
                        borderTop: '1px solid #f3f4f6',
                        pointerEvents: 'none'
                    }} 
                />
            ))}

            {renderHeatmapOverlay()}

            {!showingHeatmap && slots.map((slot, index) => (
                <ScheduleSlot 
                    key={`${day}-${index}`}
                    slot={slot}
                    position={getPosition(slot.start, slot.end)}
                    onClick={(e) => onSlotClick(e, slot._idx)}
                    isEditable={isEditable}
                />
            ))}

            {!showingHeatmap && isDragging && dragDay === day && dragPreview && (
                <div 
                    className="drag-preview"
                    style={{
                        position: 'absolute',
                        top: `${dragPreview.top}px`,
                        height: `${dragPreview.height}px`,
                        left: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        border: '2px dashed #3b82f6',
                        borderRadius: '0.35rem',
                        zIndex: 20,
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '0',
                        background: '#3b82f6',
                        color: 'white',
                        fontSize: '0.7rem',
                        padding: '2px 4px',
                        borderRadius: '4px'
                    }}>
                        {dragPreview.startTime} - {dragPreview.endTime}
                    </div>
                </div>
            )}

            <style jsx>{`
                .new-entries-schedule-column {
                    position: relative;
                    border-left: 1px solid #f3f4f6;
                    background: white;
                    min-width: 120px;
                    flex: 1;
                    cursor: ${isEditable ? 'crosshair' : 'default'};
                }
                .new-entries-schedule-column:last-child {
                    border-right: 1px solid #f3f4f6;
                }
            `}</style>
        </div>
    );
};

export default ScheduleColumn;