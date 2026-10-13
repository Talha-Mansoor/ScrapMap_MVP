import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api.js";
import {
  PageHeader,
  ErrorBanner,
  EmptyState,
  subtleCardStyle,
  theme,
  badgeStyle
} from "../ui.jsx";

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet("/api/channels");
      setChannels(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="All Channels"
        subtitle="Browse all discussion channels"
        action={<span style={badgeStyle("blue")}>{channels.length} channels</span>}
      />

      <ErrorBanner>{err}</ErrorBanner>

      {loading ? (
        <div style={{ color: theme.muted }}>Loading channels…</div>
      ) : channels.length === 0 ? (
        <EmptyState
          title="No channels yet"
          text="Create one from the home page."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16
          }}
        >
          {channels.map((c) => (
            <Link
              key={c.id}
              to={`/channel/${c.id}`}
              style={{
                ...subtleCardStyle(),
                textDecoration: "none",
                color: theme.text,
                display: "block"
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {c.name}
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: theme.muted,
                  fontSize: 13
                }}
              >
                Channel #{c.id}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}