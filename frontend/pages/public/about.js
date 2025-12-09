import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function About() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const teamMembers = [
        {
            name: 'Aleksander Stepaniuk',
            role: 'System Architect & Full-Stack',
            description: 'Mózg operacji. Zaprojektował autorski algorytm genetyczny w C++, który stanowi serce silnika optymalizacji. Czuwa nad spójnością technologiczną całego projektu.',
            skills: ['C++', 'Algorithm Design', 'Full-Stack', 'Performance'],
            image: '/images/team/aleksander.png',
            github: 'https://github.com/zawodev',
            linkedin: 'https://www.linkedin.com/in/aleksander-stepaniuk/'
        },
        {
            name: 'Kacper Zakrzewski',
            role: 'Backend Developer',
            description: 'Fundament Systemu. Specjalista od bezpiecznej architektury serwerowej. Stworzył wydajną implementację REST API, zapewniając błyskawiczną komunikację między bazą danych a aplikacją.',
            skills: ['Python', 'Django', 'REST API', 'PostgreSQL'],
            image: '/images/team/kacper.jpeg',
            github: 'https://github.com/KaZak9u',
            linkedin: 'https://www.linkedin.com/in/kacper-zakrzewski-377715300/'
        },
        {
            name: 'Piotr Bonar',
            role: 'Frontend & UI/UX Designer',
            description: 'Twórca doświadczeń. Przekuł skomplikowaną logikę harmonogramów w przejrzysty i intuicyjny interfejs, dbając o każdy detal wizualny panelu użytkownika.',
            skills: ['React', 'Next.js', 'UI/UX', 'Design System'],
            image: '/images/team/piotr.png',
            github: 'https://github.com/pbonar',
            linkedin: 'https://www.linkedin.com/in/piotr-bonar/'
        },
        {
            name: 'Jakub Borsuk',
            role: 'Frontend & Tech Writer',
            description: 'Członek zespołu. Stworzył rzeczy. Zadbał o kompletną dokumentację techniczną projektu.',
            skills: ['React', 'Next.js', 'Admin Tools', 'Documentation'],
            image: '/images/team/jakub.png',
            github: 'https://github.com/Jborys49',
            linkedin: 'https://www.linkedin.com/in/jakub-borsuk-7a1497334/'
        }
    ];

    return (
        <>
            <Head>
                <title>O nas - OptiSlots</title>
                <meta name="description" content="Poznaj zespół twórców OptiSlots oraz naszą misję automatyzacji planowania harmonogramów" />
            </Head>

            <div className="about-page">
                {/* Hero Section */}
                <section className={`about-hero ${isMobile ? 'mobile' : ''}`}>
                    <div className="about-hero-content">
                        <h1 className="about-hero-title">
                            Poznaj zespół <span className="highlight">OptiSlots</span>
                        </h1>
                        <p className="about-hero-subtitle">
                            Jesteśmy zespołem pasjonatów, tworzących przyszłość inteligentnego planowania
                        </p>
                    </div>
                </section>

                {/* Project Description Section */}
                <section className={`about-project ${isMobile ? 'mobile' : ''}`}>
                    <div className="about-container">
                        <div className="about-section-header">
                            <h2>Czym jest OptiSlots?</h2>
                            <div className="about-divider"></div>
                        </div>
                        
                        <div className="about-project-content">
                            <div className="about-project-card">
                                <div className="about-project-icon">🎯</div>
                                <h3>Problem?</h3>
                                <p>
                                    Tradycyjne systemy harmonogramów często opierają się na modelu 
                                    "kto pierwszy, ten lepszy", co prowadzi do:
                                </p>
                                <ul>
                                    <li>Frustracji użytkowników konkurujących o ograniczoną liczbę miejsc</li>
                                    <li>Ekstremalnego obciążenia serwerów w godzinach szczytu</li>
                                    <li>Niskiej satysfakcji wszystkich zaangażowanych stron</li>
                                    <li>Planów, które nie odpowiadają niczyim realnym potrzebom</li>
                                </ul>
                            </div>

                            <div className="about-project-card">
                                <div className="about-project-icon">💡</div>
                                <h3>Nasze rozwiązanie?</h3>
                                <p>
                                    OptiSlots to nowoczesny system oparty o model SaaS. Dostarczamy inteligentne planowanie 
                                    oparte na preferencjach użytkowników:
                                </p>
                                <ul>
                                    <li>Asynchroniczna rejestracja bez konkurencji czasowej</li>
                                    <li>Algorytm genetyczny skierowany pod optymalizację satysfakcji</li>
                                    <li>Automatyczne wykrywanie i rozwiązywanie konfliktów</li>
                                    <li>Zwiększona satysfakcja użytkowników</li>
                                </ul>
                            </div>

                            <div className="about-project-card">
                                <div className="about-project-icon">🚀</div>
                                <h3>Dla kogo?</h3>
                                <p>
                                    System dedykowany dla trzech głównych grup:
                                </p>
                                <ul>
                                    <li><strong>Użytkownicy końcowi</strong> – studenci, pracownicy, którzy zyskują sprawiedliwy proces rejestracji</li>
                                    <li><strong>Administracja</strong> – dziekanaty, działy HR z radykalnie zmniejszoną ilością pracy administracyjnej</li>
                                    <li><strong>Działy IT</strong> – bez odpowiedzialności za infrastrukturę dzięki modelowi SaaS</li>
                                </ul>
                            </div>

                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className={`about-team ${isMobile ? 'mobile' : ''}`}>
                    <div className="about-container">
                        <div className="about-section-header">
                            <h2>Nasz zespół</h2>
                            <div className="about-divider"></div>
                            <p className="about-section-subtitle">
                                Poznaj ludzi, którzy stworzyli OptiSlots od podstaw
                            </p>
                        </div>

                        <div className={`about-team-grid ${isMobile ? 'mobile' : ''}`}>
                            {teamMembers.map((member, index) => (
                                <div 
                                    key={index} 
                                    className="about-team-card"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className="about-team-card-inner">
                                        <div className="about-team-image-wrapper">
                                            <img 
                                                src={member.image} 
                                                alt={member.name}
                                                className="about-team-image"
                                                onError={(e) => {
                                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23667eea" width="200" height="200"/%3E%3Ctext fill="white" font-size="60" font-family="Arial" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E' + member.name.split(' ').map(n => n[0]).join('') + '%3C/text%3E%3C/svg%3E';
                                                }}
                                            />
                                            <div className="about-team-overlay">
                                                <div className="about-team-social">
                                                    <a 
                                                        href={member.github} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="about-social-link"
                                                        aria-label="GitHub"
                                                    >
                                                        <svg className="about-social-icon" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                        </svg>
                                                    </a>
                                                    <a 
                                                        href={member.linkedin} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="about-social-link"
                                                        aria-label="LinkedIn"
                                                    >
                                                        <svg className="about-social-icon" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                                        </svg>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="about-team-info">
                                            <h3 className="about-team-name">{member.name}</h3>
                                            <p className="about-team-role">{member.role}</p>
                                            <p className="about-team-description">{member.description}</p>
                                            
                                            <div className="about-team-skills">
                                                {member.skills.map((skill, skillIndex) => (
                                                    <span key={skillIndex} className="about-skill-tag">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
