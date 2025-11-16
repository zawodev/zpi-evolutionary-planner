/* frontend/evoplanner_frontend/components/navbar/Navbar.js */
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext.js';

export default function Navbar() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="logo logo--header">OptiSlots</div>
      <nav>
        {user ? (
          <>
            <Link href="/entries">
              <button className="header-nav nav-entries">Zgłoszenia</button>
            </Link>
            <Link href="/plans">
              <button className="header-nav nav-plans">Plany</button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/">
              <button className="header-nav nav-home">Strona główna</button>
            </Link>
            <Link href="/features">
              <button className="header-nav nav-func">Funkcjonalności</button>
            </Link>
            <Link href="/contact">
              <button className="header-nav nav-contact">Kontakt</button>
            </Link>
          </>
        )}
      </nav>
      <div>
        <div className="header-icon header-icon--main"></div>
        <div className="login-btn-wrapper">
          {user ? (
            <button 
              onClick={handleLogout} 
              className="btn btn--primary btn--neutral"
            >
              Wyloguj
            </button>
          ) : (
            <Link href="/login">
              <button className="btn btn--primary btn--login">Zaloguj się!</button>
            </Link>
          )}
        </div>        
      </div>
    </header>
  );
}
