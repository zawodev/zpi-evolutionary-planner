import React, { useState, useEffect } from 'react';
import styles from "@/styles/layout/_latestjob.module.css";

const PREFERENCE_LABELS = [
    "Free Days",
    "Short Days",
    "Uniform Days",
    "Concentrated Days",
    "Min Gaps Length",
    "Max Gaps Length",
    "Min Day Length",
    "Max Day Length",
    "Pref. Start Time",
    "Pref. End Time",
    "Tag Order",
    "Pref. Timeslots",
    "Pref. Groups"
];

const DetailedMetric = ({ label, valuePair }) => {
    const percentage = valuePair[0];
    const weight = valuePair[1];

    // Color logic: Red for low, Green for high
    const getColor = (p) => {
        p = Number(p); 
        if (p < 0.5) return '#ef4444'; // red-500
        if (p < 0.8) return '#f59e0b'; // amber-500
        return '#10b981'; // emerald-500
    };
    const isZeroWeight = Number(weight) === 0;

    return (
        <div className={styles["metric-row"]}>
            <div className={styles["metric-label"]}>{label}</div>
            <div className={styles["metric-viz"]}>
                <div className={styles["progress-bg"]}>
                    {isZeroWeight ? (
                        <div className={styles["progress-empty"]} />
                    ) : (
                        <div
                            className={styles["progress-fill-metric"]} 
                            style={{
                                width: `${percentage * 100}%`,
                                background: getColor(percentage)
                            }}
                        />
                    )}
                </div>
                <div className={styles["metric-values"]}>
                    {!isZeroWeight ? (
                        <>
                            <span className={styles["val-pct"]}>{(percentage * 100).toFixed(0)}%</span>
                            <span className={styles["val-wgt"]}>Punkty: {weight}</span>
                        </>
                    ) : (
                        <span className={styles["val-wgt"]}>Brak preferencji</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const PersonCard = ({
    title,
    overallFitness,
    weightedFitness,
    details,
    isExpanded,
    onToggle,
    overallWeight
}) => {
    const totalPreferences = details.length;
    const activePreferences = details.filter(([_, weight]) => Number(weight) > 0).length;
    const hasNoPreferences = activePreferences === 0;
    const weightedScore = hasNoPreferences ? 0 : ((Number(weightedFitness) / Number(overallWeight)) * 100).toFixed(1);
    const overallScore = (overallFitness * 100).toFixed(1);
    
    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981'; // green
        if (score >= 60) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    return (
        <div className={styles["card"]}>
            <div className={styles["card-header"]} onClick={onToggle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span className={styles["toggle-icon"]}>{isExpanded ? '▼' : '▶'}</span>
                    <div style={{ flex: 1 }}>
                        <div className={styles["person-name"]}>{title}</div>
                        <div style={{ fontSize: '0.75rem', color: hasNoPreferences ? '#ef4444' : '#6b7280', marginTop: '2px', fontWeight: hasNoPreferences ? '500' : 'normal' }}>
                            {hasNoPreferences ? (
                                'Brak uzupełnionych preferencji'
                            ) : (
                                `${activePreferences} z ${totalPreferences} aktywnych preferencji`
                            )}
                        </div>
                    </div>
                </div>
                {hasNoPreferences ? (
                    <></>
                ) : (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Wynik ogólny</div>
                            <div style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '700',
                                color: getScoreColor(overallScore)
                            }}>
                                {overallScore}%
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Wynik ważony</div>
                            <div style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '700',
                                color: getScoreColor(weightedScore)
                            }}>
                                {weightedScore}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className={styles["card-body"]}>
                    {hasNoPreferences ? (
                        <div style={{ 
                            padding: '24px',
                            textAlign: 'center',
                            background: '#fef2f2',
                            borderRadius: '6px',
                            border: '1px solid #fecaca'
                        }}>
                            <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600', 
                                color: '#991b1b',
                                marginBottom: '8px'
                            }}>
                                Brak uzupełnionych preferencji
                            </div>
                            <div style={{ 
                                fontSize: '0.875rem',
                                color: '#7f1d1d',
                                lineHeight: '1.5'
                            }}>
                                Ta osoba nie uzupełniła żadnych preferencji dotyczących planu zajęć.
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={styles["summary-stat"]}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                                            Punkty uzyskane
                                        </div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>
                                            {Number(weightedFitness).toFixed(1)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                                            Maksymalne punkty
                                        </div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>
                                            {Number(overallWeight).toFixed(1)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                                            Aktywne preferencje
                                        </div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>
                                            {activePreferences}/{totalPreferences}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ 
                                    fontSize: '0.875rem', 
                                    fontWeight: '600', 
                                    color: '#374151',
                                    marginBottom: '12px' 
                                }}>
                                    Szczegóły preferencji
                                </div>
                                {details.map((pair, idx) => (
                                    <DetailedMetric
                                        key={idx}
                                        label={PREFERENCE_LABELS[idx] || `Preference ${idx + 1}`}
                                        valuePair={pair}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const CollapsibleSection = ({ 
    title, 
    count, 
    isExpanded, 
    onToggle, 
    children,
    avgScore 
}) => {
    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div style={{ marginBottom: '32px' }}>
            <div 
                onClick={onToggle}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: isExpanded ? '16px' : '0',
                    transition: 'all 0.2s ease',
                    border: '1px solid #e5e7eb'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={styles["toggle-icon"]} style={{ fontSize: '12px' }}>
                        {isExpanded ? '▼' : '▶'}
                    </span>
                    <h3 className={styles["section-title"]} style={{ margin: 0 }}>
                        {title} ({count})
                    </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Średni wynik</div>
                    <div style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '700',
                        color: getScoreColor(avgScore)
                    }}>
                        {avgScore.toFixed(1)}%
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className={styles["list-container"]}>
                    {children}
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, initialVal, finalVal }) => {
    const start = Number(initialVal);
    const end = Number(finalVal);
    const diff = end - start;
    const isImproved = diff >= 0;

    const deltaColor = isImproved ? '#059669' : '#dc2626';
    const deltaBg = 'white';
    const arrow = isImproved ? '↑' : '↓';

    return (
        <div className={styles["stat-card"]}>
            <div className={styles["stat-header"]}>
                <div className={styles["stat-title"]}>{title}</div>
                <div 
                    className={styles["stat-delta"]}
                    style={{ color: deltaColor, backgroundColor: deltaBg }}
                >
                    <span>{arrow}</span>
                    <span>{Math.abs(diff).toFixed(1)}%</span>
                </div>
            </div>

            <div className={styles["bars-wrapper"]}>
                <div className={styles["bar-group"]}>
                    <div className={styles["bar-info"]}>
                        <span className={styles["bar-label-text"]} style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            Przed
                        </span>
                        <span className={styles["bar-value-text"]} style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                            {start.toFixed(1)}%
                        </span>
                    </div>
                    <div className={styles["progress-track"]}>
                        <div 
                            className={`${styles["progress-fill"]} ${styles["initial"]}`}
                            style={{ width: `${start}%` }}
                        />
                    </div>
                </div>

                <div className={styles["bar-group"]}>
                    <div className={styles["bar-info"]}>
                        <span className={styles["bar-label-text"]}>
                            Po optymalizacji
                        </span>
                        <span className={styles["bar-value-text"]} style={{ color: '#111827', fontSize: '1.1rem' }}>
                            {end.toFixed(1)}%
                        </span>
                    </div>
                    <div className={styles["progress-track"]}>
                        <div 
                            className={`${styles["progress-fill"]} ${styles["final"]}`}
                            style={{ width: `${end}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ComparisonChart = ({ firstSolution, finalSolution }) => {
    const firstFitness = (firstSolution.fitness * 100);
    const finalFitness = (finalSolution.fitness * 100);
    const improvement = (finalFitness - firstFitness);

    const calcAvg = (arr) => arr.length > 0 
        ? (arr.reduce((a, b) => a + b, 0) / arr.length * 100) 
        : 0;

    const firstAvgTeacher = calcAvg(firstSolution.teacher_fitnesses);
    const finalAvgTeacher = calcAvg(finalSolution.teacher_fitnesses);
    
    const firstAvgStudent = calcAvg(firstSolution.student_fitnesses);
    const finalAvgStudent = calcAvg(finalSolution.student_fitnesses);

    const isPositive = improvement >= 0;
    const headerBadgeStyle = {
        background: isPositive ? '#10b981' : '#ef4444',
        color: 'white'
    };

    return (
        <div className={styles["comparison-chart-container"]}>
            <div className={styles["chart-header-row"]}>
                <div>
                    <h2 className={styles["chart-main-title"]}>
                        Wyniki Optymalizacji
                    </h2>
                    <p className={styles["chart-subtitle"]}>
                        Zestawienie efektywności algorytmu
                    </p>
                </div>
                
                <div className={styles["global-improvement-badge"]} style={headerBadgeStyle}>
                    <span>{isPositive ? 'Wzrost jakości o' : 'Spadek jakości o'}</span>
                    <span style={{ fontSize: '1.1rem' }}>
                        {isPositive ? '+' : ''}{improvement.toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className={styles["stats-grid"]}>
                <StatCard 
                    title="Ogólne Przystosowanie" 
                    initialVal={firstFitness} 
                    finalVal={finalFitness} 
                />
                <StatCard 
                    title="Satysfakcja Prowadzących" 
                    initialVal={firstAvgTeacher} 
                    finalVal={finalAvgTeacher} 
                />
                <StatCard 
                    title="Satysfakcja Uczestników" 
                    initialVal={firstAvgStudent} 
                    finalVal={finalAvgStudent} 
                />
            </div>
        </div>
    );
};

const SolutionColumn = ({
    title,
    solutionData,
    expandedStudents,
    toggleStudent,
    expandedTeachers,
    toggleTeacher,
    overallWeight,
    teachersSectionExpanded,
    toggleTeachersSection,
    studentsSectionExpanded,
    toggleStudentsSection
}) => {
    // Calculate average scores
    const avgTeacherScore = solutionData.teacher_fitnesses.length > 0
        ? (solutionData.teacher_fitnesses.reduce((a, b) => a + b, 0) / solutionData.teacher_fitnesses.length * 100)
        : 0;
    
    const avgStudentScore = solutionData.student_fitnesses.length > 0
        ? (solutionData.student_fitnesses.reduce((a, b) => a + b, 0) / solutionData.student_fitnesses.length * 100)
        : 0;

    return (
        <div className={styles["solution-column"]}>
            {/* Fixed Header Content */}
            <h2 className={styles["column-title"]}>{title}</h2>

            {/* Scrollable Content Area */}
            <div className={styles["scrollable-content"]}>
                <CollapsibleSection
                    title="Prowadzący"
                    count={solutionData.teacher_fitnesses.length}
                    isExpanded={teachersSectionExpanded}
                    onToggle={toggleTeachersSection}
                    avgScore={avgTeacherScore}
                >
                    {solutionData.teacher_fitnesses.map((fitness, idx) => (
                        <PersonCard
                            key={`teacher-${title}-${idx}`}
                            title={`Prowadzący ${idx + 1}`}
                            overallFitness={fitness}
                            weightedFitness={solutionData.teacher_weighted_fitnesses[idx]}
                            details={solutionData.teacher_detailed_fitnesses[idx]}
                            isExpanded={expandedTeachers.has(idx)}
                            onToggle={() => toggleTeacher(idx)}
                            overallWeight={overallWeight}
                        />
                    ))}
                </CollapsibleSection>

                <CollapsibleSection
                    title="Uczestnicy"
                    count={solutionData.student_fitnesses.length}
                    isExpanded={studentsSectionExpanded}
                    onToggle={toggleStudentsSection}
                    avgScore={avgStudentScore}
                >
                    {solutionData.student_fitnesses.map((fitness, idx) => (
                        <PersonCard
                            key={`student-${title}-${idx}`}
                            title={`Uczestnik ${idx + 1}`}
                            overallFitness={fitness}
                            weightedFitness={solutionData.student_weighted_fitnesses[idx]}
                            details={solutionData.student_detailed_fitnesses[idx]}
                            isExpanded={expandedStudents.has(idx)}
                            onToggle={() => toggleStudent(idx)}
                            overallWeight={overallWeight}
                        />
                    ))}
                </CollapsibleSection>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export default function ScheduleComparisonPage() {
    const [data, setData] = useState(null);

    const [expandedStudents, setExpandedStudents] = useState(new Set());
    const [expandedTeachers, setExpandedTeachers] = useState(new Set());

    const [teachersSectionExpanded, setTeachersSectionExpanded] = useState(true);
    const [studentsSectionExpanded, setStudentsSectionExpanded] = useState(true);

    const fetchWithBackoff = async (url, options, maxRetries = 5) => {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return await response.json();
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            } catch (error) {
                lastError = error;
                const delay = Math.pow(2, i) * 1000;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    };

    useEffect(() => {
        const fetchLastData = async () => {
            const apiUrl = 'http://127.0.0.1:8000/api/v1/optimizer/jobs/latest/?status=completed';

            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            try {
                const dataJob = await fetchWithBackoff(apiUrl, options);
                setData(dataJob);
            } catch (error) {
                console.error("Error fetching optimization results after all retries:", error);
            }
        };

        fetchLastData();
    }, []);

    const toggleStudent = (index) => {
        setExpandedStudents(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleTeacher = (index) => {
        setExpandedTeachers(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    if (!data || !data.first_solution || !data.final_solution) {
        return (
            <div className="admin-container loading-state">
                <div className="admin-wrapper" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', color: '#ef4444' }}>
                        Nie znaleziono skończonych optymalizacji.<br /> Upewnij się że zadanie optymalizacyjne jest ukończone.
                    </div>
                </div>
            </div>
        );
    }

    const { first_solution, final_solution } = data;

    return (
        <div className="admin-container">
            <div className="admin-wrapper">
                {/* Header */}
                <div className="admin-header-section">
                    <div className="admin-header-wrapper">
                        <div className="admin-header-gradient">
                            <div className="admin-header-content">
                                <div className="admin-header-title">
                                    <h1>Porównanie wyników optymalizacji</h1>
                                    <p className="admin-header-subtitle">
                                        Porównaj wynik optymalizacji z przykładowym planem.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div>
                    <main>
                        <ComparisonChart 
                            firstSolution={first_solution}
                            finalSolution={final_solution}
                        />

                        <div className={styles['comparison-grid']}>
                            <SolutionColumn
                                title="Rozwiązanie przed Optymalizacją"
                                solutionData={first_solution}
                                expandedStudents={expandedStudents}
                                toggleStudent={toggleStudent}
                                expandedTeachers={expandedTeachers}
                                toggleTeacher={toggleTeacher}
                                overallWeight={Number(data.first_solution.total_student_weight) + Number(data.first_solution.total_teacher_weight)}
                                teachersSectionExpanded={teachersSectionExpanded}
                                toggleTeachersSection={() => setTeachersSectionExpanded(!teachersSectionExpanded)}
                                studentsSectionExpanded={studentsSectionExpanded}
                                toggleStudentsSection={() => setStudentsSectionExpanded(!studentsSectionExpanded)}
                            />

                            <SolutionColumn
                                title="Rozwiązanie po Optymalizacji"
                                solutionData={final_solution}
                                expandedStudents={expandedStudents}
                                toggleStudent={toggleStudent}
                                expandedTeachers={expandedTeachers}
                                toggleTeacher={toggleTeacher}
                                overallWeight={Number(data.final_solution.total_student_weight) + Number(data.final_solution.total_teacher_weight)}
                                teachersSectionExpanded={teachersSectionExpanded}
                                toggleTeachersSection={() => setTeachersSectionExpanded(!teachersSectionExpanded)}
                                studentsSectionExpanded={studentsSectionExpanded}
                                toggleStudentsSection={() => setStudentsSectionExpanded(!studentsSectionExpanded)}
                            />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}