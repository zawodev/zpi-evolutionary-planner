/* pages/_app.js */

// Components
import Navbar from "@/components/navbar/Navbar.js";


// Base styles
import "@/styles/base/_reset.css";
import "@/styles/base/_typography.css";

// Component styles
import "@/styles/components/_background.css";
import "@/styles/components/_button.css";
import "@/styles/components/_card.css";
import "@/styles/components/_container.css"
import "@/styles/components/_header.css";
import "@/styles/components/_input.css";
import "@/styles/components/_label.css"
import "@/styles/components/_padding.css";

// Layout styles
import "@/styles/layout/_header.css";
import "@/styles/layout/_hero.css";
import "@/styles/layout/_login.css";
import "@/styles/layout/_position.css";
import "@/styles/layout/_entries.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}