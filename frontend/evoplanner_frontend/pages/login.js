import { useState } from "react";
import AuthCard from "../components/AuthCard";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/identity/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: login, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.access) localStorage.setItem("access_token", data.access);
        if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/entries";
      } else {
        setError(data.message || data.detail || "Nieprawidłowy login lub hasło");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Błąd połączenia z serwerem. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  const goToRegister = () => (window.location.href = "/register");

  return (
    <AuthCard title="Witaj ponownie" subtitle="Zaloguj się do swojego konta" error={error}>
      <form className="login-form" onSubmit={handleLogin}>
        <div className="login-field">
          <label className="method-label">Adres e-mail lub login</label>
          <input
            type="text"
            placeholder="imienazwisko@email.com"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="input"
            disabled={isLoading}
          />
        </div>

        <div className="login-field">
          <label className="method-label">Hasło</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            disabled={isLoading}
          />
          <a href="#" className="forgot-password">
            Zapomniałeś hasła?
          </a>
        </div>

        <button type="submit" className={`btn btn--primary ${isLoading ? "btn--disabled" : ""}`} disabled={isLoading}>
          {isLoading ? "Logowanie..." : "Zaloguj się"}
        </button>

        <div className="divider">
          <span className="line"></span>
          <span className="divider-text">Lub kontynuuj przez</span>
          <span className="line"></span>
        </div>

        <div className="socials">
          <button onClick={goToRegister} type="button" className="social-btn" disabled={isLoading}>
            <svg className="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button onClick={goToRegister} type="button" className="social-btn" disabled={isLoading}>
            USOS
          </button>
        </div>

        <div className="register-prompt">
          <span className="register-text">Nie masz konta?</span>
          <a href="/register" className="register-link">
            Zarejestruj się
          </a>
        </div>
      </form>
    </AuthCard>
  );
}