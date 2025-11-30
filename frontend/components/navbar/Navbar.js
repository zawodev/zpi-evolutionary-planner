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
      <div className="logo logo--header" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
        <img src="/images/monkey-logo.png" alt="OptiSlots Logo" style={{height: '40px', width: 'auto'}} />
        OptiSlots
      </div>
      <nav>
        {user ? (user.role === 'office' ? (
          <>
            <Link href="/admin/users">
              <button className="header-nav nav-home">Użytkownicy</button>
            </Link>
            <Link href="/admin/rooms">
              <button className="header-nav nav-func">Pokoje</button>
            </Link>
            <Link href="/admin/createrec">
              <button className="header-nav nav-contact">Stwórz rekrutacje</button>
            </Link>
            <Link href="/admin/managerecs">
              <button className="header-nav nav-about">Zarządzaj rekrutacjami</button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/user/entries">
              <button className="header-nav nav-entries">Rekrutacje</button>
            </Link>
            <Link href="/user/plan">
              <button className="header-nav nav-plans">Plany</button>
            </Link>
          </>
        )
        ) : (
          <>
            <Link href="/">
              <button className="header-nav nav-home">Strona główna</button>
            </Link>
            <Link href="/features">
              <button className="header-nav nav-func">Funkcjonalności</button>
            </Link>
            <Link href="/about">
              <button className="header-nav nav-about">O nas</button>
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
            <>
              <span style={{marginRight: '1rem', color: '#374151', fontWeight: '500'}}>
                Witaj, <strong>{user.username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="btn btn--primary btn--neutral"
              >
                Wyloguj
              </button>
            </>
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
