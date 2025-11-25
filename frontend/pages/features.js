import { useState } from "react";
import { useRouter } from "next/router"; // ✅ Next.js router

export default function FeaturesPage() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const router = useRouter(); // ✅ inicjalizacja routera

  const handleRedirect = () => {
    router.push("/contact"); // ✅ przekierowanie do strony kontaktowej
  };

  const features = [
    {
      icon: "🤖",
      title: "Automatyczna optymalizacja",
      description:
        "Algorytm Genetyczny analizuje tysiące kombinacji i wybiera najlepsze rozwiązanie w krótkim czasie, uwzględniając wszystkie ograniczenia i preferencje.",
    },
    {
      icon: "📊",
      title: "Analityka w czasie rzeczywistym",
      description:
        "Monitoruj wykorzystanie zasobów, identyfikuj wąskie gardła i optymalizuj procesy na podstawie danych w czasie rzeczywistym.",
    },
    {
      icon: "🔄",
      title: "Synchronizacja multi-platform",
      description:
        "Dostęp z każdego urządzenia — komputer, tablet, smartfon. Wszystkie zmiany synchronizowane automatycznie w chmurze.",
    },
    {
      icon: "👥",
      title: "Zarządzanie zespołem",
      description:
        "Przypisuj role, zarządzaj dostępem i współpracuj z całym zespołem w jednym miejscu. Każdy widzi tylko to, co powinien.",
    },
    {
      icon: "📅",
      title: "Inteligentne harmonogramy",
      description:
        "Twórz harmonogramy pracy, zajęć lub rezerwacji sal. System automatycznie wykrywa i rozwiązuje konflikty.",
    },
    {
      icon: "🔔",
      title: "Powiadomienia i przypomnienia",
      description:
        "Nigdy nie przegap ważnego spotkania. Konfigurowalne powiadomienia email, SMS i push na wszystkich urządzeniach.",
    },
    {
      icon: "📈",
      title: "Raporty i statystyki",
      description:
        "Generuj szczegółowe raporty dotyczące wykorzystania zasobów, efektywności zespołu i KPI organizacji.",
    },
    {
      icon: "🔒",
      title: "Bezpieczeństwo danych",
      description:
        "Szyfrowanie end-to-end, kopie zapasowe, zgodność z RODO. Twoje dane są bezpieczne i tylko Ty masz do nich dostęp.",
    },
    {
      icon: "🔌",
      title: "Integracje",
      description:
        "Połącz się z Google Calendar, Microsoft Outlook, Slack, Teams i dziesiątkami innych narzędzi, których używasz codziennie.",
    },
  ];

  return (
    <div className="features-body">
      {/* Hero Section */}
      <section className="features-hero">
        <div className="features-hero-content">
          <h1 className="features-title" style={{ textAlign: 'center' }}>
            Wszystko czego potrzebujesz <br />
            <span className="features-highlight">w jednym miejscu</span>
          </h1>
          <p className="features-description">
            Kompleksowe rozwiązanie do planowania i zarządzania zasobami. Od automatycznej optymalizacji po zaawansowaną analitykę — wszystko zaprojektowane, aby oszczędzać Twój czas i zwiększać efektywność.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`features-card ${hoveredCard === index ? "hovered" : ""}`}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="features-icon">{feature.icon}</div>
              <h3 className="features-card-title">{feature.title}</h3>
              <p className="features-card-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="features-cta">
        <div className="features-cta-card">
          <h2 className="features-cta-title">Gotowy na start?</h2>
          <p className="features-cta-description">
            Dołącz do ponad 800 organizacji, które zaufały OptiSlots i oszczędzają 40% czasu na planowaniu.
          </p>
          <div className="features-cta-buttons">
            <button
              className="features-btn features-btn--primary"
              onClick={handleRedirect}
            >
              Rozpocznij za darmo
            </button>
            <button
              className="features-btn features-btn--secondary"
              onClick={handleRedirect}
            >
              Umów demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}