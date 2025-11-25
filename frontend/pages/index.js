/* pages/index.js */
import { useState, useEffect } from 'react';

export default function OptiSlots() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div>
            {/* Hero Section */}
            <section className={`hero ${isMobile ? 'mobile' : ''}`}>
                <div className={`hero-content ${isMobile ? 'mobile' : ''}`}>
                    {/* Left Column */}
                    <div className="hero-left">
                        
                        <div className="badge">
                            <span className="pulse-dot"></span>
                            Inteligentne planowanie dla biznesu i edukacji
                        </div>

                        <h1 className={isMobile ? 'mobile' : ''}>
                            Twoja organizacja.<br />
                            Twoje zasoby.<br />
                            <span className="highlight">Zero chaosu.</span>
                        </h1>

                        <p className={`hero-description ${isMobile ? 'mobile' : ''}`}>
                            Zaawansowany system automatycznego planowania dla firm i uczelni. 
                            Optymalizuj harmonogramy pracy, sale konferencyjne, zasoby produkcyjne 
                            lub zajęcia akademickie. Wprowadź dostępność zespołu i preferencje — 
                            algorytm znajdzie najefektywniejsze rozwiązanie, eliminując konflikty 
                            i maksymalizując wykorzystanie zasobów.
                        </p>
                        <p className={`hero-description ${isMobile ? 'mobile' : ''}`}
                        style={{ marginBottom: '2rem' }}></p>
                        <div className={`cta-buttons ${isMobile ? 'mobile' : ''}`}>
                            <button className={`btn-primary-big ${isMobile ? 'mobile' : ''}`}>
                                Wypróbuj za darmo
                            </button>
                            <button className={`btn-secondary-big ${isMobile ? 'mobile' : ''}`}>
                                Umów prezentację
                            </button>
                        </div>

                        <div className={`stats ${isMobile ? 'mobile' : ''}`}>
                            <div className="stat-item">
                                <div className={`stat-number ${isMobile ? 'mobile' : ''}`}>800+</div>
                                <div className="stat-label">Organizacji</div>
                            </div>
                            <div className="stat-item">
                                <div className={`stat-number ${isMobile ? 'mobile' : ''}`}>150k+</div>
                                <div className="stat-label">Użytkowników</div>
                            </div>
                            <div className="stat-item">
                                <div className={`stat-number ${isMobile ? 'mobile' : ''}`}>40%</div>
                                <div className="stat-label">Oszczędność czasu</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Cards - Only on desktop */}
                    {!isMobile && (
                        <div className="hero-right">
                            <div className="card card-1">
                                <div className="card-header">
                                    <span className="card-day">Poniedziałek</span>
                                    <span className="status-dot"></span>
                                </div>
                                <div className="schedule-item schedule-blue">
                                    <div className="schedule-time">9:00 - 10:30</div>
                                    <div className="schedule-subject">Spotkanie zespołu</div>
                                </div>
                                <div className="schedule-item schedule-purple">
                                    <div className="schedule-time">11:00 - 12:30</div>
                                    <div className="schedule-subject">Konferencja</div>
                                </div>
                                <div className="schedule-item schedule-pink">
                                    <div className="schedule-time">13:00 - 14:30</div>
                                    <div className="schedule-subject"></div>
                                </div>
                            </div>

                            <div className="card card-2">
                                <div className="card-2-title">Optymalizacja</div>
                                <div className="progress-bar">
                                    <div className="progress-fill"></div>
                                </div>
                                <div className="card-2-footer">
                                    <span className="card-2-label">Konflikty rozwiązane</span>
                                    <span className="card-2-percentage">95%</span>
                                </div>
                            </div>

                            <div className="card card-3">
                                <div className="card-3-title">✨ Automatyczna optymalizacja</div>
                                <div className="card-3-text">
                                    System przeanalizował 1,247 możliwych układów i wybrał najlepszy w 0.3 sekundy
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}