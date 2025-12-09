/* hooks/useHeatmap.js */

import { useState } from 'react';

export const useHeatmap = (selectedRecruitment, gridStartHour, gridEndHour, days) => {
    const [showingHeatmap, setShowingHeatmap] = useState(false);
    const [heatmapData, setHeatmapData] = useState(null);
    const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);

    const processWeightsToHeatmap = (weightsArray) => {
        if (!weightsArray || weightsArray.length === 0) return [];
        const normalized = weightsArray.map(w => parseFloat(w) || 0);
        const maxAbs = Math.max(...normalized.map(Math.abs)) || 1;
        const slotsPerDay = normalized.length / days.length; 
        const processed = [];
        
        for (let d = 0; d < days.length; d++) {
            const dayStart = d * slotsPerDay;
            for (let h = 0; h < (gridEndHour - gridStartHour); h++) { 
               const globalHourIndex = h + gridStartHour;
               let sum = 0;
               const slotsPerHour = 4;
               for(let k=0; k<slotsPerHour; k++) {
                   const idx = dayStart + (h * slotsPerHour) + k;
                   sum += normalized[idx] || 0;
               }
               processed.push({ 
                   day_of_week: d, 
                   hour: globalHourIndex, 
                   rawWeight: sum/slotsPerHour, 
                   maxPositiveWeight: maxAbs, 
                   maxNegativeWeight: maxAbs 
               });
            }
        }
        return processed;
    };

    const fetchHeatmap = async (recId) => {
        if (!recId) return;
        setIsLoadingHeatmap(true);
        try {
            const baseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${baseUrl}/api/v1/preferences/aggregate-preferred-timeslots/${recId}`);
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();
            setHeatmapData(processWeightsToHeatmap(data));
        } catch (err) { 
            console.error(err); 
            setHeatmapData(null); 
        } finally { 
            setIsLoadingHeatmap(false); 
        }
    };

    const handleHeatmapToggle = {
        down: () => {
            if (!selectedRecruitment) return;
            setShowingHeatmap(true);
            if (!heatmapData) fetchHeatmap(selectedRecruitment.recruitment_id);
        },
        up: () => setShowingHeatmap(false)
    };

    return {
        showingHeatmap,
        heatmapData,
        isLoadingHeatmap,
        handleHeatmapToggle
    };
};