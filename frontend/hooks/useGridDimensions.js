/* hooks/useGridDimensions.js */

import { useMemo } from 'react';

export const useGridDimensions = (selectedRecruitment) => {
    return useMemo(() => {
        const startStr = selectedRecruitment?.day_start_time || "07:00";
        const endStr = selectedRecruitment?.day_end_time || "19:00";
        
        const gridStartHour = parseInt(startStr.split(':')[0], 10) || 7;
        const gridEndHour = parseInt(endStr.split(':')[0], 10) || 19;
        const hourHeight = 60;
        const gridHeightPx = (gridEndHour - gridStartHour) * hourHeight;
        
        const hours = Array.from(
            { length: Math.max(0, gridEndHour - gridStartHour) }, 
            (_, i) => `${(gridStartHour + i).toString().padStart(2, '0')}:00`
        );

        return { gridStartHour, gridEndHour, gridHeightPx, hours, hourHeight };
    }, [selectedRecruitment]);
};