/* pages/admin/register.js */

import React, { useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/general/AuthCard";

export default function RegisterPage() {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!orgName || !email || !password1 || !password2) {
      setError("Wszystkie pola są wymagane");
      return;
    }
    
    if (password1 !== password2) {
      setError("Hasła nie są identyczne");
      return;
    }
    
    if (password1.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Registering:", { orgName, email, password1 });
    } catch (error) {
      console.error("Registration failed:", error);
      setError("Rejestracja nie powiodła się. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Stwórz konto" 
      subtitle="Rozpocznij swoją przygodę z OptiSlots"
      error={error}
    >
      <form className="login-form" onSubmit={handleRegister}>
        <div className="login-field">
          <label className="method-label">Nazwa organizacji</label>
          <input
            type="text"
            placeholder="Firma LLM Sp. z o.o."
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="admin-input"
            disabled={isLoading}
            required
          />
        </div>

        <div className="login-field">
          <label className="method-label">Adres e-mail</label>
          <input
            type="email"
            placeholder="kontakt@firma.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="admin-input"
            disabled={isLoading}
            required
          />
        </div>

        <div className="login-field">
          <label className="method-label">Hasło</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            className="admin-input"
            disabled={isLoading}
            required
          />
        </div>

        <div className="login-field">
          <label className="method-label">Potwierdź hasło</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="admin-input"
            disabled={isLoading}
            required
          />
        </div>

        <button 
          type="submit" 
          className={`btn btn--primary ${isLoading ? "btn--disabled" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? "Rejestrowanie..." : "Zarejestruj się"}
        </button>

        <div className="register-prompt">
          <span className="register-text">Masz już konto?</span>
          <Link href="/login">
            <a className="register-link">Zaloguj się</a>
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}