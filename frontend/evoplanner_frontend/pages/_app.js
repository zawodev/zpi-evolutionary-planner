/* pages/_app.js */

// Components
import Navbar from "@/components/navbar/Navbar.js";
import Background from "@/components/Background.js";
import { AuthProvider } from "@/contexts/AuthContext.js";


// Base styles
import "@/styles/base/_reset.css";
import "@/styles/base/_typography.css";

// Component styles
import "@/styles/components/_button.css";
import "@/styles/components/_card.css";
import "@/styles/components/_container.css"
import "@/styles/components/_form.css";
import "@/styles/components/_header.css";
import "@/styles/components/_input.css";
import "@/styles/components/_label.css"
import "@/styles/components/_modal.css";
import "@/styles/components/_notification.css";
import "@/styles/components/_padding.css";
import "@/styles/components/_schedule.css";
import "@/styles/components/_sidebar.css";
import "@/styles/components/_slots.css";

// Layout styles
import "@/styles/layout/_auth.css";
import "@/styles/layout/_contact.css";
import "@/styles/layout/_features.css";
import "@/styles/layout/_header.css";
import "@/styles/layout/_hero.css";
import "@/styles/layout/_index.css";
import "@/styles/layout/_login.css";
import "@/styles/layout/_position.css";
import "@/styles/layout/_schedule_grid.css";

// Temporary styles
export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Background />
      <Navbar />
      <Component {...pageProps} />
    </AuthProvider>
  );
}