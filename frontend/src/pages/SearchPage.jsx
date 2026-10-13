import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../api.js";
import {
  PageHeader,
  SectionCard,
  ErrorBanner,
  EmptyState,
  fieldLabelStyle,
  inputStyle,
  selectStyle,
  buttonStyle,
  subtleCardStyle,
  PostMeta,
  theme,
  badgeStyle
} from "../ui.jsx";

export default function SearchPage() {
  const [searchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [type, setType] = useState(searchParams.get("type") || "posts_text");
  const [channelId, setChannelId] = useState(searchParams.get("channelId") || "");
  const [limit, setLimit] = useState(searchParams.get("limit") || "20");

  const [results, setResults] = useState({
    mode: "simple",
    posts: [],
    channels: [],
    replies: [],
    advanced: []
  });

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const channelFilterTypes = new Set(["highest_voted_posts", "lowest_voted_posts"]);

  useEffect(() => {
    const initialQ = searchParams.get("q");
    if (initialQ) {
      runSimpleSearch(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSimpleResults = useMemo(() => {
    return (
      (results.posts?.length || 0) > 0 ||
      (results.channels?.length || 0) > 0 ||
      (results.replies?.length || 0) > 0
    );
  }, [results]);

  async function runSimpleSearch(forcedQ) {
    const searchText = (forcedQ ?? q).trim();

    if (!searchText) {
      setResults({
        mode: "simple",
        posts: [],
        channels: [],
        replies: [],
        advanced: []
      });
      return;
    }

    setErr("");
    setLoading(true);

    try {
      const [postData, channelData] = await Promise.all([
        apiGet(`/api/posts?q=${encodeURIComponent(searchText)}&limit=${encodeURIComponent(limit)}&offset=0&sort=created_desc`),
        apiGet("/api/channels")
      ]);

      const posts = postData.posts || [];
      const channels = (channelData || []).filter((c) =>
        c.name?.toLowerCase().includes(searchText.toLowerCase())
      );

      let replies = [];
      if (posts.length === 0 && channels.length === 0) {
        const replyData = await apiGet(
          `/api/search?type=replies_text&q=${encodeURIComponent(searchText)}&limit=${encodeURIComponent(limit)}`
        );
        replies = replyData.results || [];
      }

      setResults({
        mode: "simple",
        posts,
        channels,
        replies,
        advanced: []
      });
    } catch (e) {
      setErr(e.message);
      setResults({
        mode: "simple",
        posts: [],
        channels: [],
        replies: [],
        advanced: []
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAdvancedSearch(e) {
    e.preventDefault();

    setErr("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("type", type);
      if (q.trim()) params.set("q", q.trim());
      if (channelId.trim() && channelFilterTypes.has(type)) {
        params.set("channelId", channelId.trim());
      }
      params.set("limit", limit);

      const data = await apiGet(`/api/search?${params.toString()}`);

      setResults({
        mode: "advanced",
        posts: [],
        channels: [],
        replies: [],
        advanced: data.results || []
      });
    } catch (e2) {
      setErr(e2.message);
      setResults({
        mode: "advanced",
        posts: [],
        channels: [],
        replies: [],
        advanced: []
      });
    } finally {
      setLoading(false);
    }
  }

  function renderAdvancedItem(item, idx) {
    return (
      <div key={item.id ?? `${type}-${idx}`} style={subtleCardStyle()}>
        {item.topic ? (
          <>
            <Link
              to={`/posts/${item.id}`}
              style={{
                color: "#e7eeff",
                textDecoration: "none",
                fontSize: 22,
                fontWeight: 800
              }}
            >
              {item.topic}
            </Link>
            <div style={{ marginTop: 8 }}>
              <PostMeta
                author={item.author_name}
                score={item.score}
                createdAt={item.created_at}
              />
            </div>
          </>
        ) : item.data ? (
          <>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 16 }}>{item.data}</div>
            <div style={{ marginTop: 8 }}>
              <PostMeta
                author={item.author_name}
                score={item.score}
                createdAt={item.created_at}
                extra={`reply #${item.id}`}
              />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 16 }}>
            <strong>{item.display_name}</strong> — posts {item.post_count}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle="Search normally first. Open advanced search only when you need filtering or ranked queries."
      />

      <SectionCard title="Search">
        <ErrorBanner>{err}</ErrorBanner>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSimpleSearch();
          }}
          style={{ display: "grid", gap: 14 }}
        >
          <div>
            <label style={fieldLabelStyle()}>Search</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 10
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search posts, channels, and if needed replies..."
                style={inputStyle()}
              />

              <button type="submit" style={buttonStyle("primary")}>
                Search
              </button>

              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                style={buttonStyle("ghost")}
              >
                {advancedOpen ? "Hide advanced" : "Advanced search"}
              </button>
            </div>
          </div>
        </form>

        {advancedOpen && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                ...subtleCardStyle(),
                padding: 16
              }}
            >
              <form onSubmit={runAdvancedSearch} style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={fieldLabelStyle()}>Search type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={selectStyle()}
                  >
                    <option value="posts_text">Posts text</option>
                    <option value="replies_text">Replies text</option>
                    <option value="posts_by_author">Posts by author</option>
                    <option value="most_posts_users">Users with most posts</option>
                    <option value="least_posts_users">Users with least posts</option>
                    <option value="highest_voted_posts">Highest voted posts</option>
                    <option value="lowest_voted_posts">Lowest voted posts</option>
                  </select>
                </div>

                <div>
                  <label style={fieldLabelStyle()}>Query</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search text or author"
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle()}>
                    Optional channel ID{" "}
                    {!channelFilterTypes.has(type)
                      ? "(only used for highest/lowest voted posts)"
                      : ""}
                  </label>
                  <input
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Channel id"
                    style={inputStyle()}
                    disabled={!channelFilterTypes.has(type)}
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle()}>Limit</label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    style={selectStyle()}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <button type="submit" style={buttonStyle("secondary")}>
                  Run advanced search
                </button>
              </form>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Results"
        action={
          results.mode === "advanced" ? (
            <span style={badgeStyle("orange")}>Advanced mode</span>
          ) : (
            <span style={badgeStyle("blue")}>Simple mode</span>
          )
        }
      >
        {loading && <div style={{ color: theme.muted }}>Loading results…</div>}

        {!loading && !err && results.mode === "simple" && !hasSimpleResults && (
          <EmptyState
            title="No results"
            text="Try another word or open advanced search for more control."
          />
        )}

        {!loading && !err && results.mode === "simple" && hasSimpleResults && (
          <div style={{ display: "grid", gap: 18 }}>
            {results.channels.length > 0 && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                  Matching channels
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {results.channels.map((channel) => (
                    <Link
                      key={channel.id}
                      to={`/channel/${channel.id}`}
                      style={{
                        ...subtleCardStyle(),
                        textDecoration: "none",
                        color: theme.text,
                        display: "block"
                      }}
                    >
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{channel.name}</div>
                      <div style={{ color: theme.muted, marginTop: 4 }}>
                        Channel #{channel.id}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.posts.length > 0 && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                  Matching posts
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {results.posts.map((item) => (
                    <div key={item.id} style={subtleCardStyle()}>
                      <Link
                        to={`/posts/${item.id}`}
                        style={{
                          color: "#e7eeff",
                          textDecoration: "none",
                          fontSize: 22,
                          fontWeight: 800
                        }}
                      >
                        {item.topic}
                      </Link>
                      <div style={{ marginTop: 8 }}>
                        <PostMeta
                          author={item.author_name}
                          score={item.score}
                          createdAt={item.created_at}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.replies.length > 0 && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                  Matching replies
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {results.replies.map((item) => (
                    <div key={item.id} style={subtleCardStyle()}>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 16 }}>{item.data}</div>
                      <div style={{ marginTop: 8 }}>
                        <PostMeta
                          author={item.author_name}
                          score={item.score}
                          createdAt={item.created_at}
                          extra={`reply #${item.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !err && results.mode === "advanced" && results.advanced.length === 0 && (
          <EmptyState
            title="No advanced results"
            text="Try changing type, query, or limit."
          />
        )}

        {!loading && !err && results.mode === "advanced" && results.advanced.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {results.advanced.map((item, idx) => renderAdvancedItem(item, idx))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}