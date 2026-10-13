import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiSend } from "../api.js";
import { PageHeader, SectionCard, ErrorBanner, fieldLabelStyle, inputStyle, buttonStyle, PageLink } from "../ui.jsx";

export default function Login({ onAuth }) {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      await apiSend("POST", "/api/login", { username, password });
      await onAuth();
      nav("/");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <PageHeader title="Login" subtitle="Sign in to create channels, posts, replies, votes, and uploads." />
      <SectionCard title="Account access">
        <ErrorBanner>{err}</ErrorBanner>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={fieldLabelStyle()}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle()} />
          </div>

          <div>
            <label style={fieldLabelStyle()}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle()} />
          </div>

          <button type="submit" style={buttonStyle("primary")}>Login</button>
        </form>

        <div style={{ marginTop: 14 }}>
          No account? <PageLink to="/signup">Create one</PageLink>
        </div>
      </SectionCard>
    </div>
  );
}