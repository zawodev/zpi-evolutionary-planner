import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar/Navbar";
import Image from "next/image";
import styles from "@/styles/components/_admin.module.css";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [name, setName] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // TODO: Replace with actual API call
    try {
      // const response = await fetch('/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ login, password })
      // });
      // if (response.ok) {
      //   window.location.href = "/dashboard";
      // }
      
      console.log("Logging in with:", login, password);
      window.location.href = "/check";
    } catch (error) {
      console.error("Login failed:", error);
    }
  };


  return (
    <div className={styles.background}>
      <Navbar />
      
      <div className="login-frame">
        <div className="card card--login">
          <strong className="logo logo--login" style={{ 
            position: 'static', 
            display: 'block', 
            textAlign: 'center', 
            fontSize: 'clamp(32px, 4vh, 48px)',
            marginBottom: '24px'
          }}>
            Rekruter+
          </strong>
          
          <form onSubmit={handleRegister}>
            <div className="login-input-wrapper" style={{ marginTop: '60px' }}>
              <p className="info-text">Nazwa firmy</p>
              <input
                type="name"
                placeholder="Firma LLM"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="input input--login"
                required
              />
            </div>

            <div className="login-input-wrapper">
              <p className="info-text">Adres e-mail</p>
              <input
                type="email"
                placeholder="imienazwisko@email.com"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="input input--login"
                required
              />
            </div>

            <div className="login-input-wrapper">
              <p className="info-text">Hasło</p>
              <input
                type="password"
                placeholder="*********"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                className="input input--login"
                required
              />
            </div>

            <div className="login-input-wrapper">
              <p className="info-text">Potwierdź hasło</p>
              <input
                type="password"
                placeholder="*********"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="input input--login"
                required
              />
            </div>

            <div className="login-button-wrapper">
              <button type="submit" className={`btn btn--form ${styles.btn}`}>
                Zarejestruj
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}