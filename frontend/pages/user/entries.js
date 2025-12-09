/* frontend/pages/user/entries.js */

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../../contexts/AuthContext';

// Hooks
import { useRecruitments } from '../../hooks/useRecruitments';
import { usePreferences } from '../../hooks/usePreferences';
import { useScheduleDragCustom } from '../../hooks/useScheduleDragCustom';
import { useHeatmap } from '../../hooks/useHeatmap';
import { useScheduleModal } from '../../hooks/useScheduleModal';
import { useGridDimensions } from '../../hooks/useGridDimensions';

// Utils
import { calculateUsedPriority, convertScheduleToWeights } from '../../utils/scheduleOperations';
import { timeToMinutes } from '../../utils/scheduleDisplay';

// Components
import EntriesSidebar from '../../components/user/entries/EntriesSidebar';
import AdvancedPreferences from '../../components/user/entries/AdvancedPreferences';
import PreferenceModal from '../../components/user/entries/PreferenceModal';
import ScheduleHeader from '../../components/user/entries/schedule/ScheduleHeader';
import ScheduleColumn from '../../components/user/entries/schedule/ScheduleColumn';
import HeatmapLegend from '../../components/user/entries/heatmap/HeatmapLegend';
import OptimizationProgressPanel from '../../components/user/entries/OptimizationProgressPanel';

export default function EntriesPage() {
    const { user } = useAuth();
    const calendarRef = useRef(null);
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];

    const [selectedRecruitment, setSelectedRecruitment] = useState(null);
    
    const [optimizationStatus, setOptimizationStatus] = useState(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    useEffect(() => {
        if (!selectedRecruitment) {
            setOptimizationStatus(null);
            return;
        }

        const recruitmentId = selectedRecruitment.recruitment_id;
        const status = selectedRecruitment.plan_status;

        if (status === 'draft' || status === 'active' || status === 'archived') {
            setOptimizationStatus(null);
            return;
        }

        const token = localStorage.getItem('access_token');
        const baseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
        const url = `${baseUrl}/api/v1/optimizer/jobs/recruitment/${recruitmentId}/status/`;

        const abortController = new AbortController();
        const signal = abortController.signal;

        const fetchStatus = async (isBackgroundRefresh = false) => {
            if (!isBackgroundRefresh) setIsLoadingStatus(true);
            
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    signal: signal
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setOptimizationStatus(data);
                } else if (response.status === 404) {
                     setOptimizationStatus({
                         plan_status: status,
                         jobs_count: 0,
                         max_round_execution_time: selectedRecruitment.max_round_execution_time || 300,
                         estimated_to_end_time: 0,
                         pessimistic_progress_text: '0/0',
                         optimization_start_date: selectedRecruitment.optimization_start_date
                     });
                } else {
                    console.warn(`Status fetch error: ${response.statusText}`);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching optimization status:', error);
                }
            } finally {
                if (!isBackgroundRefresh) setIsLoadingStatus(false);
            }
        };

        fetchStatus(false);

        let intervalId;
        if (status === 'optimizing') {
            intervalId = setInterval(() => {
                fetchStatus(true);
            }, 5000);
        }

        return () => {
            abortController.abort();
            if (intervalId) clearInterval(intervalId);
        };

    }, [selectedRecruitment?.recruitment_id, selectedRecruitment?.plan_status]);

    const { gridStartHour, gridEndHour, gridHeightPx, hours } = useGridDimensions(selectedRecruitment);

    const isEditable = selectedRecruitment?.plan_status === 'draft' || selectedRecruitment?.plan_status === 'optimizing';

    const { 
        recruitments, 
        isLoading: isLoadingRecruitments, 
        error: recruitmentsError 
    } = useRecruitments(user?.id);
    
    const { 
        scheduleData, setScheduleData, complexPrefs, setComplexPrefs, 
        isLoading: isLoadingSchedule, error: preferencesError, isSaving, saveError, 
        savePreferences, clearAllPreferences 
    } = usePreferences(selectedRecruitment, user?.id);

    const dragHookResult = useScheduleDragCustom((dragResult) => {
        if (isEditable) modalLogic.openForCreate(dragResult);
    }, isEditable, gridStartHour, gridEndHour);

    const modalLogic = useScheduleModal(setScheduleData, dragHookResult.resetDrag, isEditable);
    
    const heatmapLogic = useHeatmap(selectedRecruitment, gridStartHour, gridEndHour, days);

    const handleSave = async () => {
        if (!isEditable) return;

        const dayStart = selectedRecruitment.day_start_time || "08:00";
        const startMin = timeToMinutes(dayStart);
        const endMin = timeToMinutes(selectedRecruitment.day_end_time || "16:00");
        const slotsPerDay = Math.floor((endMin - startMin) / 15);
        const safeSlotsPerDay = slotsPerDay > 0 ? slotsPerDay : 32;

        const weights = convertScheduleToWeights(scheduleData, days, dayStart, safeSlotsPerDay);
        
        const payload = { 
            preferences_data: { 
                ...complexPrefs, 
                PreferredTimeslots: weights 
            }
        };
        
        if (await savePreferences(payload)) alert('Zapisano pomyślnie!');
    };

    const handleClear = () => {
        if (isEditable && window.confirm('Czy na pewno chcesz wyczyścić cały harmonogram?')) {
            clearAllPreferences();
        }
    };

    const getDragPreview = (day) => {
        const { isDragging, dragDay, dragStart, dragEnd } = dragHookResult;
        if (!isDragging || dragDay !== day || !dragStart || !dragEnd) return null;
        
        const s = Math.min(dragStart.minutes, dragEnd.minutes);
        const e = Math.max(dragStart.minutes, dragEnd.minutes);
        const h = 60;
        const offset = s - (gridStartHour * 60);
        
        return {
            top: offset * (h/60),
            height: (e-s) * (h/60),
            startTime: `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`,
            endTime: `${Math.floor(e/60).toString().padStart(2,'0')}:${(e%60).toString().padStart(2,'0')}`
        };
    };

    const displayError = recruitmentsError || preferencesError || saveError;
    
    const showProgressPanel = selectedRecruitment?.plan_status === 'optimizing';

    // --- RENDER ---
    return (
        <div className="entries-container">
            <style jsx global>{`
                .schedule-column { position: relative; border-left: 1px solid #f3f4f6; cursor: crosshair; user-select: none; }
                * { box-sizing: border-box; }
                body { margin: 0; overflow: hidden; } 
            `}</style>

            <div className="entries-layout">
                <div className="sidebar-wrapper">
                    <EntriesSidebar 
                        recruitments={recruitments} 
                        isLoading={isLoadingRecruitments} 
                        fileError={displayError}
                        selectedRecruitment={selectedRecruitment} 
                        onSelectRecruitment={setSelectedRecruitment}
                    />
                </div>
                
                <main className="schedule-area">
                    {(isLoadingRecruitments || !selectedRecruitment) && (
                        <div className="loading-state">
                            <p>{isLoadingRecruitments ? 'Ładowanie danych...' : 'Wybierz rekrutację z listy, aby rozpocząć edycję.'}</p>
                        </div>
                    )}

                    {!isLoadingRecruitments && selectedRecruitment && isLoadingSchedule && (
                        <div className="loading-state"><p>Pobieranie preferencji...</p></div>
                    )}

                    {!isLoadingRecruitments && selectedRecruitment && !isLoadingSchedule && (
                        <>
                            <ScheduleHeader 
                                selectedRecruitment={selectedRecruitment} 
                                usedPriority={calculateUsedPriority(scheduleData, days)}
                                isSaving={isSaving} 
                                onSave={isEditable ? handleSave : undefined} 
                                onClear={isEditable ? handleClear : undefined}
                                onHeatmapMouseDown={heatmapLogic.handleHeatmapToggle.down} 
                                onHeatmapMouseUp={heatmapLogic.handleHeatmapToggle.up}
                                showingHeatmap={heatmapLogic.showingHeatmap}
                            />

                            {showProgressPanel && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <OptimizationProgressPanel 
                                        optimizationStatus={optimizationStatus}
                                        isLoadingStatus={isLoadingStatus}
                                    />
                                </div>
                            )}
                            
                            <div className={`schedule-grid ${!isEditable ? 'read-only' : ''}`}>
                                <div className="time-labels" style={{height: `${gridHeightPx + 40}px`}}>
                                    {hours.map(t => <div key={t} className="time-label">{t}</div>)}
                                </div>
                                
                                <div className="week-grid">
                                    <div className="day-headers">
                                        {dayLabels.map(d => <span key={d} className="day-header">{d}</span>)}
                                    </div>
                                    
                                    <div className="calendar-body" ref={calendarRef}>
                                        {days.map(day => (
                                            <ScheduleColumn 
                                                key={day} 
                                                day={day}
                                                
                                                slots={(scheduleData[day] || [])
                                                    .map((slot, i) => slot ? { ...slot, _idx: i } : null)
                                                    .filter(Boolean)
                                                }
                                                
                                                dragPreview={getDragPreview(day)}
                                                onMouseDown={(e) => dragHookResult.handleMouseDown(e, day)}
                                                isDragging={dragHookResult.isDragging} 
                                                dragDay={dragHookResult.dragDay}
                                                
                                                onSlotClick={(e, slotIndex) => modalLogic.openForEdit(e, day, slotIndex, scheduleData)}
                                                isEditable={isEditable}
                                                
                                                selectedRecruitment={selectedRecruitment}
                                                gridStartHour={gridStartHour}
                                                
                                                showingHeatmap={heatmapLogic.showingHeatmap}
                                                heatmapData={heatmapLogic.heatmapData}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {heatmapLogic.showingHeatmap && heatmapLogic.heatmapData && <HeatmapLegend />}
                            
                            <AdvancedPreferences 
                                complexPrefs={complexPrefs} 
                                setComplexPrefs={setComplexPrefs} 
                                isEditable={isEditable}
                            />
                        </>
                    )}
                </main>
            </div>

            {modalLogic.showModal && (
                <PreferenceModal 
                    mode={modalLogic.modalMode} 
                    pendingSlot={modalLogic.pendingSlot} 
                    editingSlot={modalLogic.editingSlot}
                    setPendingSlot={modalLogic.setPendingSlot} 
                    setEditingSlot={modalLogic.setEditingSlot}
                    onClose={modalLogic.modalActions.close} 
                    onAdd={modalLogic.modalActions.add}
                    onUpdate={modalLogic.modalActions.update} 
                    onDelete={modalLogic.modalActions.delete}
                    isEditable={isEditable} 
                    selectedRecruitment={selectedRecruitment}
                />
            )}

            <style jsx>{`
                .entries-container { 
                    height: 100vh;
                    width: 100vw;
                    display: flex;
                    flex-direction: column;
                    padding-top: 5rem; 
                    overflow: hidden;
                    /* Brak background, aby nie nadpisywać stylu globalnego */
                }

                .entries-layout {
                    display: flex;
                    flex: 1;
                    height: 100%;
                    overflow: hidden;
                }

                .sidebar-wrapper {
                    height: 100%;
                    width: 300px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    z-index: 10;
                }

                /* Override stylów sidebara - przezroczystość */
                .sidebar-wrapper :global(.entries-sidebar) {
                    height: 100% !important;
                    background-color: transparent !important;
                    border-right: none !important;
                    width: 100% !important;
                }

                .schedule-area { 
                    flex: 1;              
                    height: 100%;         
                    overflow-y: auto;     
                    padding: 2rem; 
                }

                .loading-state { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    min-height: 400px; 
                    background: white; 
                    border-radius: 0.75rem; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
                    color: #6b7280; 
                    font-weight: 500; 
                }
                
                .schedule-grid { 
                    background: white; 
                    border-radius: 0.75rem; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
                    padding: 1.5rem; 
                    display: flex; 
                    gap: 1rem; 
                    overflow-x: auto; 
                }

                .schedule-grid.read-only { 
                    opacity: 0.95; 
                }
                
                .time-labels { 
                    display: flex; 
                    flex-direction: column; 
                    padding-top: 40px; 
                    min-width: 60px; 
                }

                .time-label { 
                    height: 60px; 
                    font-size: 0.75rem; 
                    color: #6b7280; 
                    border-top: 1px solid #f3f4f6; 
                    padding-right: 1rem; 
                    display: flex; 
                    align-items: flex-start; 
                }
                
                .week-grid { 
                    flex: 1; 
                    min-width: 600px; 
                }

                .day-headers { 
                    display: grid; 
                    grid-template-columns: repeat(5, 1fr); 
                    gap: 0.5rem; 
                    margin-bottom: 0.5rem; 
                    height: 40px; 
                    align-items: center; 
                }

                .day-header { 
                    font-weight: 600; 
                    text-align: center; 
                    border-bottom: 2px solid #e5e7eb; 
                    padding-bottom: 0.5rem; 
                    color: #1f2937; 
                    font-size: 0.875rem; 
                }

                .calendar-body { 
                    display: grid; 
                    grid-template-columns: repeat(5, 1fr); 
                    gap: 0.5rem; 
                    position: relative; 
                }
                
                @media (max-width: 1024px) { 
                    .entries-layout { flex-direction: column; height: auto; overflow: visible; } 
                    .entries-container { height: auto; overflow: auto; padding-top: 4rem; }
                    .sidebar-wrapper { height: auto; width: 100%; border-bottom: 1px solid #e5e7eb; }
                    .schedule-area { padding: 1rem; overflow: visible; height: auto; }
                }
            `}</style>
        </div>
    );
}