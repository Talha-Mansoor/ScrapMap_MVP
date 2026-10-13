import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiGet } from "../api.js";
import {
  PageHeader,
  SectionCard,
  ErrorBanner,
  EmptyState,
  inputStyle,
  selectStyle,
  buttonStyle,
  subtleCardStyle,
  PageLink,
  PostMeta,
  badgeStyle,
  theme
} from "../ui.jsx";

export default function PostsList({ user }) {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();

  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "created_desc";
  const limit = Number(sp.get("limit") ?? 20);
  const offset = Number(sp.get("offset") ?? 0);
  const author = sp.get("author") ?? "";

  const [data, setData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("channelId", id);
    p.set("limit", String(limit));
    p.set("offset", String(offset));
    p.set("sort", sort);
    if (q.trim()) p.set("q", q.trim());
    if (author.trim()) p.set("author", author.trim());
    return p.toString();
  }, [id, q, sort, limit, offset, author]);

  useEffect(() => {
    apiGet("/api/channels").then(setChannels).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setErr("");
    setLoading(true);

    apiGet(`/api/posts?${query}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  const posts = data?.posts ?? [];
  const total = data?.meta?.total ?? 0;
  const count = data?.meta?.count ?? 0;
  const channelName =
    channels.find((c) => String(c.id) === String(id))?.name || `Channel ${id}`;

  function update(params) {
    const next = new URLSearchParams(sp);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSp(next);
  }

  return (
    <div>
      <PageHeader
        title={channelName}
        subtitle="Browse channel posts, search locally within the channel, filter by author, and paginate."
        action={<PageLink to={`/create?channelId=${id}`}>Create post</PageLink>}
      />

      <SectionCard title="Feed controls">
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 160px 100px", gap: 12 }}>
          <input
            value={q}
            onChange={(e) => update({ q: e.target.value, offset: 0 })}
            placeholder="Search topic/body"
            style={inputStyle()}
          />
          <input
            value={author}
            onChange={(e) => update({ author: e.target.value, offset: 0 })}
            placeholder="Filter by author"
            style={inputStyle()}
          />
          <select value={sort} onChange={(e) => update({ sort: e.target.value, offset: 0 })} style={selectStyle()}>
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
          </select>
          <select value={limit} onChange={(e) => update({ limit: e.target.value, offset: 0 })} style={selectStyle()}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        {!user && (
          <div style={{ marginTop: 12, color: theme.muted }}>
            You can browse freely. Login is required to create posts and vote.
          </div>
        )}
      </SectionCard>

      <ErrorBanner>{err}</ErrorBanner>

      {loading && <div style={{ color: theme.muted }}>Loading posts…</div>}

      {!loading && !err && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={badgeStyle("neutral")}>Showing {count} of {total}</span>
          <span style={badgeStyle("neutral")}>Offset {offset}</span>
        </div>
      )}

      {!loading && !err && posts.length === 0 && (
        <EmptyState title="No posts found" text="Try changing filters or create the first post in this channel." />
      )}

      {!loading && !err && posts.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((p) => (
            <div key={p.id} style={subtleCardStyle()}>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Link to={`/posts/${p.id}`} style={{ fontSize: 24, fontWeight: 800, color: "#e7eeff", textDecoration: "none" }}>
                    {p.topic}
                  </Link>
                  <div style={{ marginTop: 6 }}>
                    <PostMeta author={p.author_name} score={p.score} createdAt={p.created_at} />
                  </div>
                </div>
                <span style={badgeStyle("blue")}>Post #{p.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !err && (
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            style={buttonStyle("secondary")}
            disabled={offset <= 0}
            onClick={() => update({ offset: Math.max(0, offset - limit) })}
          >
            Prev
          </button>
          <button
            style={buttonStyle("secondary")}
            disabled={offset + count >= total}
            onClick={() => update({ offset: offset + limit })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}