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
    "Pref. Groups",
    "Pref. Timeslots"
];


// 1. Progress bar helper
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
                    <div
                        className={isZeroWeight ? styles["not-applicable-overlay"] : styles["progress-fill"]}
                        style={{
                            width: `${percentage * 100}%`,
                            background: getColor(percentage)
                        }}
                    />
                </div>
                <div className={styles["metric-values"]}>
                    {!isZeroWeight ? (<span className={styles["val-pct"]}>{(percentage * 100).toFixed(0)}%</span>) : (<></>)}
                    {!isZeroWeight ? (<span className={styles["val-wgt"]}>Punkty: {weight}</span>) : (<span className={styles["val-wgt"]}>Brak preferencji</span>)}
                </div>
            </div>
        </div>
    );
};

// 2. Card Component for a single Person (Student or Teacher)
const PersonCard = ({
    title,
    overallFitness,
    weightedFitness,
    details,
    isExpanded,
    onToggle,
    overallWeight
}) => {
    return (
        <div className={styles["card"]}>
            <div className={styles["card-header"]} onClick={onToggle}>
                <div className="header-info">
                    <span className={styles["toggle-icon"]}>{isExpanded ? '▼' : '▶'}</span>
                    <span className={styles["person-name"]}>{title}</span>
                </div>
                <div className={styles["header-score"]}>
                    Wynik: <span className={styles["score-val"]}>{overallFitness.toFixed(2)* 100}%</span>
                </div>
            </div>

            {isExpanded && (
                <div className={styles["card-body"]}>
                    <div className={styles["summary-stat"]}>
                        <strong>Wynik ważony:</strong> {((Number(weightedFitness)/Number(overallWeight))*100).toFixed(2)}%
                    </div>
                    <div className="detailed-list">
                        {details.map((pair, idx) => (
                            <DetailedMetric
                                key={idx}
                                label={PREFERENCE_LABELS[idx] || `Preference ${idx + 1}`}
                                valuePair={pair}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Solution Column Component
const SolutionColumn = ({
    title,
    solutionData,
    expandedStudents,
    toggleStudent,
    expandedTeachers,
    toggleTeacher,
    overallWeight
}) => {
    return (
        <div className={styles["solution-column"]}>
            {/* Fixed Header Content */}
            <h2 className={styles["column-title"]}>{title}</h2>

            <div className={styles["global-stats"]}>
                <div className={styles["stat-box"]}>
                    <span className={styles["stat-label"]}>Ogólne przystosowanie</span>
                    <span className={styles["stat-value"]}>{(solutionData.fitness.toFixed(2) * 100).toFixed(0)}%</span>
                </div>
                <div className={styles["stat-box"]}>
                    <span className={styles["stat-label"]}>Dni w cyklu</span>
                    <span className={styles["stat-value"]}>{solutionData.days_in_cycle}</span>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className={styles["scrollable-content"]}>
                <h3 className={styles["section-title"]}>Prowadzący ({solutionData.teacher_fitnesses.length})</h3>
                <div className={styles["list-container"]}>
                    {solutionData.teacher_fitnesses.map((fitness, idx) => (
                        <PersonCard
                            key={`teacher-${title}-${idx}`} // Added 'title' to key for stronger uniqueness
                            title={`Teacher ${idx + 1}`}
                            overallFitness={fitness}
                            weightedFitness={solutionData.teacher_weighted_fitnesses[idx]}
                            details={solutionData.teacher_detailed_fitnesses[idx]}
                            isExpanded={expandedTeachers.has(idx)}
                            onToggle={() => toggleTeacher(idx)}
                            overallWeight={overallWeight}
                        />
                    ))}
                </div>

                <h3 className={styles["section-title"]}>Uczestnicy ({solutionData.student_fitnesses.length})</h3>
                <div className={styles["list-container"]}>
                    {solutionData.student_fitnesses.map((fitness, idx) => (
                        <PersonCard
                            key={`student-${title}-${idx}`} // Added 'title' to key for stronger uniqueness
                            title={`Student ${idx + 1}`}
                            overallFitness={fitness}
                            weightedFitness={solutionData.student_weighted_fitnesses[idx]}
                            details={solutionData.student_detailed_fitnesses[idx]}
                            isExpanded={expandedStudents.has(idx)}
                            onToggle={() => toggleStudent(idx)}
                            overallWeight={overallWeight}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export default function ScheduleComparisonPage() {
    const [data, setData] = useState(null);

    const [expandedStudents, setExpandedStudents] = useState(new Set());
    const [expandedTeachers, setExpandedTeachers] = useState(new Set());

    const fetchWithBackoff = async (url, options, maxRetries = 5) => {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return await response.json();
                }
                // If response is not OK, throw error to trigger retry logic
                throw new Error(`HTTP error! status: ${response.status}`);
            } catch (error) {
                lastError = error;
                const delay = Math.pow(2, i) * 1000;
                if (i < maxRetries - 1) {
                    // Wait before retrying, but don't log errors during backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        // If all retries fail, re-throw the last error
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
            } finally {
            }
        }

        fetchLastData();
    }, []);

    const toggleStudent = (index) => {
        const newSet = new Set(expandedStudents);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setExpandedStudents(newSet);
    };

    const toggleTeacher = (index) => {
        const newSet = new Set(expandedTeachers);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setExpandedTeachers(newSet);
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
    console.log(data)
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
                        <div className={styles['comparison-grid']}>
                            <SolutionColumn
                                title="First Solution"
                                solutionData={first_solution}
                                expandedStudents={expandedStudents}
                                toggleStudent={toggleStudent}
                                expandedTeachers={expandedTeachers}
                                toggleTeacher={toggleTeacher}
                                overallWeight={Number(data.first_solution.total_student_weight)+Number(data.first_solution.total_teacher_weight)}
                            />

                            <SolutionColumn
                                title="Final Solution"
                                solutionData={final_solution}
                                expandedStudents={expandedStudents}
                                toggleStudent={toggleStudent}
                                expandedTeachers={expandedTeachers}
                                toggleTeacher={toggleTeacher}
                                overallWeight={Number(data.final_solution.total_student_weight)+Number(data.final_solution.total_teacher_weight)}
                            />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}