// components/AuthCard.jsx
import React from "react";

export default function AuthCard({ title, subtitle, error, children }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    padding: "40px 20px",
    background: "linear-gradient(135deg, #f9fafb, #eef2ff)",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  card: {
    background: "#fff",
    borderRadius: "24px",
    padding: "48px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  title: {
    fontSize: "30px",
    fontWeight: 900,
    color: "#000",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#64748b",
    margin: 0,
  },
  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "20px",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
};