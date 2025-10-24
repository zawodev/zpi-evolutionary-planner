// components/navbar/Navbar.js
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="header">
      <div className="logo logo--header">OptiSlots</div>
      
      <nav>
        <Link href="/">
          <button className="header-nav nav-home">Strona główna</button>
        </Link>
        <Link href="/admin/login">
          <button className="header-nav nav-func">OptiSlots dla firm</button>
        </Link>
        <button className="header-nav nav-contact">Kontakt</button>
      </nav>
      
      <div>
        <div className="header-icon header-icon--main"></div>
        <div className="login-btn-wrapper">
          <Link href="/login">
            <button className="btn btn--primary btn--login">Zaloguj się!</button>
          </Link>        
        </div>        
      </div>
    </header>
  );
}