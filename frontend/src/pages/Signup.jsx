import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiSend } from "../api.js";
import { PageHeader, SectionCard, ErrorBanner, fieldLabelStyle, inputStyle, buttonStyle, PageLink } from "../ui.jsx";

export default function Signup({ onAuth }) {
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      await apiSend("POST", "/api/signup", {
        display_name: displayName,
        username,
        password
      });
      await onAuth();
      nav("/");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <PageHeader title="Create account" subtitle="Use a display name that will appear on posts and replies." />
      <SectionCard title="Sign up">
        <ErrorBanner>{err}</ErrorBanner>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={fieldLabelStyle()}>Display name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            <label style={fieldLabelStyle()}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            <label style={fieldLabelStyle()}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle()} />
          </div>

          <button type="submit" style={buttonStyle("primary")}>Create account</button>
        </form>

        <div style={{ marginTop: 14 }}>
          Already have an account? <PageLink to="/login">Login</PageLink>
        </div>
      </SectionCard>
    </div>
  );
}