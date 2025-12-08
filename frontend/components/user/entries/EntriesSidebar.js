import React from 'react';

const EntriesSidebar = ({ 
  fileError, isLoading, recruitments, 
  selectedRecruitment, onSelectRecruitment 
}) => {
    const editableRecruitments = recruitments.filter(rec => rec.plan_status === 'draft' || rec.plan_status === 'optimizing');
    const readOnlyRecruitments = recruitments.filter(rec => rec.plan_status !== 'draft' && rec.plan_status !== 'optimizing');
    const isEditableNow = selectedRecruitment?.plan_status === 'draft' || selectedRecruitment?.plan_status === 'optimizing';

    const getStatusBadge = (status) => {
        switch(status) {
            case 'draft': return { label: 'SZK', color: '#fef9c3', textColor: '#92400e' };
            case 'active': return { label: 'AKT', color: '#bbf7d0', textColor: '#065f46' };
            case 'optimizing': return { label: 'OPT', color: '#bbf7d0', textColor: '#065f46'};
            case 'completed': return { label: 'UKO', color: '#d1d5db', textColor: '#374151' };
            case 'failed': return { label: 'BŁĄ', color: '#fee2e2', textColor: '#dc2626' };
            case 'cancelled': return { label: 'ANU', color: '#e0e7ff', textColor: '#3730a3' };
            case 'archived': return { label: 'ARC', color: '#f3f4f6', textColor: '#6b7280' };
            default: return { label: status.substring(0,3).toUpperCase(), color: '#e5e7eb', textColor: '#374151' };
        }
    };

    const renderItem = (rec, isReadOnly) => {
        const badge = getStatusBadge(rec.plan_status);
        const isActive = selectedRecruitment?.recruitment_id === rec.recruitment_id;
        
        return (
            <div
                key={rec.recruitment_id}
                style={{
                    padding: isActive ? 'calc(0.75rem - 1px) calc(1rem - 1px)' : '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    background: isReadOnly ? '#f9fafb' : '#ffffff',
                    border: isActive ? `3px solid ${isReadOnly ? '#9ca3af' : '#3b82f6'}` : '2px solid #e5e7eb',
                    color: isReadOnly ? '#6b7280' : '#1f2937',
                    fontWeight: isActive && isReadOnly ? 600 : 500,
                    fontSize: '0.875rem',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '0.5rem',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                }}
                onClick={() => onSelectRecruitment(rec)}
                onMouseEnter={(e) => {
                    if (!isReadOnly) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#d1d5db';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isReadOnly) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = isActive ? '#3b82f6' : '#e5e7eb';
                    }
                }}
            >
                <span style={{
                    flex: 1,
                    minWidth: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.4'
                }}>
                    {rec.recruitment_name}
                </span>
                <span style={{
                    flexShrink: 0,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    textAlign: 'center',
                    backgroundColor: badge.color,
                    color: badge.textColor
                }}>
                    {badge.label}
                </span>
            </div>
        );
    };

    return (
        <aside style={{
            width: '300px',
            minWidth: '300px',
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            overflowY: 'auto'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 1rem 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>Otwarte</h3>
                {isLoading && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: '#f9fafb',
                        border: '2px dashed #e5e7eb',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        cursor: 'default'
                    }}>Ładowanie...</div>
                )}
                {fileError && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        color: '#dc2626',
                        marginBottom: '0.5rem'
                    }}>{fileError}</div>
                )}
                {!isLoading && !fileError && editableRecruitments.length > 0 ? (
                    editableRecruitments.map(rec => renderItem(rec, !isEditableNow && selectedRecruitment?.recruitment_id !== rec.recruitment_id))
                ) : (
                    !isLoading && !fileError && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            background: '#f9fafb',
                            border: '2px dashed #e5e7eb',
                            color: '#6b7280',
                            fontSize: '0.875rem',
                            cursor: 'default'
                        }}>Brak aktywnych rekrutacji.</div>
                    )
                )}
            </div>

            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 1rem 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>Zamknięte</h3>
                {isLoading && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: '#f9fafb',
                        border: '2px dashed #e5e7eb',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        cursor: 'default'
                    }}>Ładowanie...</div>
                )}
                {!isLoading && !fileError && readOnlyRecruitments.length > 0 ? (
                    readOnlyRecruitments.map(rec => renderItem(rec, true))
                ) : (
                    !isLoading && !fileError && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            background: '#f9fafb',
                            border: '2px dashed #e5e7eb',
                            color: '#6b7280',
                            fontSize: '0.875rem',
                            cursor: 'default'
                        }}>Brak zakończonych rekrutacji.</div>
                    )
                )}
            </div>
        </aside>
    );
};

export default EntriesSidebar;