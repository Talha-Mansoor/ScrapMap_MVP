
import React, { useState } from "react";
import { Link } from "react-router-dom";

export const theme = {
  bg: "#0f1115",
  panel: "#171a21",
  panel2: "#1d212b",
  soft: "#242938",
  border: "#2d3343",
  text: "#f3f5f7",
  muted: "#9ca3af",
  blue: "#4f8cff",
  blueSoft: "#1e3a8a",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  cardShadow: "0 10px 30px rgba(0,0,0,0.28)"
};

export function appShellStyle() {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #1b2130 0%, #11151d 30%, #0d1016 100%)",
    color: theme.text,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };
}

export function containerStyle() {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "24px 18px 48px"
  };
}

export function topBarStyle() {
  return {
    position: "sticky",
    top: 0,
    zIndex: 30,
    backdropFilter: "blur(12px)",
    background: "rgba(13,16,22,0.72)",
    borderBottom: `1px solid ${theme.border}`
  };
}

export function navInnerStyle() {
  return {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "14px 18px",
    display: "flex",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap"
  };
}

export function brandStyle() {
  return {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: theme.text,
    textDecoration: "none",
    marginRight: 8
  };
}

export function navLinkStyle(active = false) {
  return {
    textDecoration: "none",
    color: active ? theme.text : theme.muted,
    background: active ? theme.panel2 : "transparent",
    border: `1px solid ${active ? theme.border : "transparent"}`,
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 600
  };
}

export function heroCardStyle() {
  return {
    background:
      "linear-gradient(180deg, rgba(79,140,255,0.12), rgba(255,255,255,0.02))",
    border: `1px solid ${theme.border}`,
    borderRadius: 24,
    padding: 28,
    boxShadow: theme.cardShadow
  };
}

export function pageTitleStyle() {
  return {
    fontSize: 44,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    margin: "0 0 10px",
    fontWeight: 800
  };
}

export function pageSubtitleStyle() {
  return {
    margin: 0,
    color: theme.muted,
    fontSize: 18
  };
}

export function gridStyle(cols = "1fr 1fr") {
  return {
    display: "grid",
    gridTemplateColumns: cols,
    gap: 18
  };
}

export function cardStyle() {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 22,
    padding: 18,
    boxShadow: theme.cardShadow
  };
}

export function subtleCardStyle() {
  return {
    background: theme.panel2,
    border: `1px solid ${theme.border}`,
    borderRadius: 18,
    padding: 14
  };
}

export function sectionTitleStyle() {
  return {
    fontSize: 22,
    margin: "0 0 14px",
    fontWeight: 750,
    letterSpacing: "-0.02em"
  };
}

export function fieldLabelStyle() {
  return {
    display: "block",
    marginBottom: 8,
    color: theme.muted,
    fontWeight: 600,
    fontSize: 14
  };
}

export function inputStyle() {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    background: "#11151d",
    color: theme.text,
    outline: "none",
    fontSize: 15,
    boxSizing: "border-box"
  };
}

export function textareaStyle(rows = 6) {
  return {
    ...inputStyle(),
    minHeight: rows * 22,
    resize: "vertical"
  };
}

export function selectStyle() {
  return {
    ...inputStyle(),
    cursor: "pointer"
  };
}

export function buttonStyle(kind = "primary") {
  const styles = {
    primary: {
      background: theme.blue,
      color: "white",
      border: "none"
    },
    secondary: {
      background: theme.panel2,
      color: theme.text,
      border: `1px solid ${theme.border}`
    },
    ghost: {
      background: "transparent",
      color: theme.muted,
      border: `1px solid ${theme.border}`
    },
    danger: {
      background: "rgba(239,68,68,0.14)",
      color: "#fecaca",
      border: "1px solid rgba(239,68,68,0.35)"
    }
  };

  return {
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
    ...styles[kind]
  };
}

export function badgeStyle(kind = "neutral") {
  const map = {
    neutral: {
      background: "rgba(255,255,255,0.06)",
      color: theme.muted,
      border: `1px solid ${theme.border}`
    },
    blue: {
      background: "rgba(79,140,255,0.18)",
      color: "#bfd3ff",
      border: "1px solid rgba(79,140,255,0.3)"
    },
    green: {
      background: "rgba(34,197,94,0.14)",
      color: "#bbf7d0",
      border: "1px solid rgba(34,197,94,0.28)"
    },
    orange: {
      background: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.28)"
    },
    red: {
      background: "rgba(239,68,68,0.14)",
      color: "#fecaca",
      border: "1px solid rgba(239,68,68,0.28)"
    }
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    ...map[kind]
  };
}

export function metaStyle() {
  return {
    color: theme.muted,
    fontSize: 14
  };
}

export function dividerStyle() {
  return {
    height: 1,
    background: theme.border,
    margin: "14px 0"
  };
}

export function linkStyle() {
  return {
    color: "#c4d7ff",
    textDecoration: "none",
    fontWeight: 650
  };
}

export function EmptyState({ title, text }) {
  return (
    <div style={{ ...subtleCardStyle(), textAlign: "center", padding: 28 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ color: theme.muted }}>{text}</div>
    </div>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.14)",
        border: "1px solid rgba(239,68,68,0.28)",
        color: "#fecaca",
        padding: "12px 14px",
        borderRadius: 14,
        marginBottom: 14
      }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ ...heroCardStyle(), marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h1 style={pageTitleStyle()}>{title}</h1>
          {subtitle ? <p style={pageSubtitleStyle()}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function SectionCard({ title, children, action }) {
  return (
    <section style={{ ...cardStyle(), marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap"
        }}
      >
        <h2 style={{ ...sectionTitleStyle(), marginBottom: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PostMeta({ author, score, createdAt, extra }) {
  return (
    <div style={metaStyle()}>
      by {author || "Unknown"} • score {score ?? 0} • {createdAt}
      {extra ? ` • ${extra}` : ""}
    </div>
  );
}

export function PageLink({ to, children }) {
  return (
    <Link to={to} style={linkStyle()}>
      {children}
    </Link>
  );
}

export function PreviewImages({ attachments, small }) {
  const [openImg, setOpenImg] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: small ? "repeat(auto-fill, 120px)" : "repeat(auto-fill, 200px)",
          gap: 10,
          marginTop: 12
        }}
      >
        {attachments.map((att) => (
          <img
            key={att.id}
            src={att.url || att.path}
            alt=""
            onClick={() => setOpenImg(att.url || att.path)}
            style={{
              width: "100%",
              height: small ? 90 : 160,
              objectFit: "cover",
              borderRadius: 12,
              cursor: "zoom-in",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        ))}
      </div>

      {/* LIGHTBOX */}
      {openImg && (
        <div
          onClick={() => setOpenImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out"
          }}
        >
          <img
            src={openImg}
            alt=""
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 16,
              boxShadow: "0 20px 80px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* close button */}
          <div
            onClick={() => setOpenImg(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              fontSize: 28,
              color: "#fff",
              cursor: "pointer",
              opacity: 0.8
            }}
          >
            ✕
          </div>
        </div>
      )}
    </>
  );
}

export function VoteRail({ user, score, onVote, activeVote = 0, compact = false }) {
  const btn = (active, tone) => ({
    width: compact ? 36 : 42,
    height: compact ? 36 : 42,
    borderRadius: 12,
    border: active
      ? tone === "up"
        ? "1px solid rgba(79,140,255,0.5)"
        : "1px solid rgba(239,68,68,0.5)"
      : `1px solid ${theme.border}`,
    background: active
      ? tone === "up"
        ? "rgba(79,140,255,0.18)"
        : "rgba(239,68,68,0.16)"
      : theme.panel2,
    color: active
      ? tone === "up"
        ? "#bfdbfe"
        : "#fecaca"
      : theme.muted,
    cursor: user ? "pointer" : "not-allowed",
    fontSize: compact ? 16 : 18,
    fontWeight: 800
  });

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? 6 : 8,
        borderRadius: 16,
        background: theme.panel2,
        border: `1px solid ${theme.border}`
      }}
    >
      <button disabled={!user} onClick={() => onVote(1)} style={btn(activeVote === 1, "up")}>
        ↑
      </button>
      <div style={{ minWidth: 24, textAlign: "center", fontWeight: 800 }}>{score ?? 0}</div>
      <button disabled={!user} onClick={() => onVote(-1)} style={btn(activeVote === -1, "down")}>
        ↓
      </button>
      <button disabled={!user} onClick={() => onVote(0)} style={{ ...buttonStyle("ghost"), padding: "8px 10px" }}>
        Clear
      </button>
    </div>
  );
}