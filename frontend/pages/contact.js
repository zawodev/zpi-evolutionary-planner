import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Integrate with backend API to actually send the message
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFormData({ name: "", email: "", company: "", subject: "", message: "" });

    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactMethods = [
    {
      icon: "📧",
      title: "Email",
      value: "kontakt@optislots.pl",
      link: "mailto:kontakt@optislots.pl",
    },
    {
      icon: "📞",
      title: "Telefon",
      value: "+48 792 454 373",
      link: "tel:+48792454373",
    },
    {
      icon: "📍",
      title: "Adres",
      value: "ul. Wybrzeże Wyspiańskiego 23-25, Wrocław",
      link: "#",
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__content">
          <h1 style={{ textAlign: 'center' }}>
            Porozmawiajmy
            <br />
            <span>o Twoich potrzebach</span>
          </h1>
          <p>
            Masz pytania? Chcesz umówić prezentację? A może potrzebujesz
            dedykowanego rozwiązania? Jesteśmy tu, aby pomóc.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="contact-grid">
          {/* Contact Methods */}
          <div className="contact-methods">
            <h2 className="contact-section__title">Skontaktuj się z nami</h2>
            <p className="contact-section__description">
              Wybierz najwygodniejszą dla Ciebie metodę kontaktu. Odpowiadamy
              zwykle w ciągu 24 godzin.
            </p>

            <div className="methods-grid">
              {contactMethods.map((method, index) => (
                <a key={index} href={method.link} className="method-card">
                  <div className="method-icon">{method.icon}</div>
                  <div>
                    <div className="method-title">{method.title}</div>
                    <div className="method-value">{method.value}</div>
                  </div>
                </a>
              ))}
            </div>

            <div className="working-hours">
              <h3 className="hours-title">Godziny pracy</h3>
              <div className="hours-item">
                <span>Poniedziałek - Piątek:</span>
                <span className="hours-time">9:00 - 17:00</span>
              </div>
              <div className="hours-item">
                <span>Weekendy:</span>
                <span className="hours-time">Nieczynne</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="form-card">
            <h2 className="form-title">Wyślij wiadomość</h2>

            {submitSuccess && (
              <div className="success-message">
                ✓ Wiadomość została wysłana! Odezwiemy się wkrótce.
              </div>
            )}

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="input-wrapper">
                <label className="method-label">Imię i nazwisko *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jan Kowalski"
                  className="input"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="input-wrapper">
                <label className="method-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="jan.kowalski@firma.pl"
                  className="input"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="input-wrapper">
                <label className="method-label">Firma / Uczelnia</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Nazwa organizacji"
                  className="input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="input-wrapper">
                <label className="method-label">Temat *</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="select"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Wybierz temat</option>
                  <option value="demo">Prezentacja produktu</option>
                  <option value="pricing">Zapytanie o cenę</option>
                  <option value="support">Wsparcie techniczne</option>
                  <option value="partnership">Współpraca</option>
                  <option value="other">Inne</option>
                </select>
              </div>

              <div className="input-wrapper" style={{ gridColumn: "1 / -1" }}>
                <label className="method-label">Wiadomość *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Opisz swoją potrzebę lub zadaj pytanie..."
                  className="textarea"
                  rows="5"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className={`btn btn--primary ${isSubmitting ? "btn--disabled" : ""} `}
                style={{ width: "100%", gridColumn: "1 / -1" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Wysyłanie..." : "Wyślij wiadomość"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}