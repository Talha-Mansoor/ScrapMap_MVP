import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiSend } from "../api.js";
import {
  PageHeader,
  ErrorBanner,
  EmptyState,
  fieldLabelStyle,
  inputStyle,
  buttonStyle,
  subtleCardStyle,
  PostMeta,
  badgeStyle,
  theme,
  PreviewImages,
  VoteRail
} from "../ui.jsx";

const PAGE_SIZE = 10;
const FEATURED_SAMPLE_SIZE = 100;


export default function Home({ user }) {
  const navigate = useNavigate();
  const [homeSearch, setHomeSearch] = useState("");
  const [createPressed, setCreatePressed] = useState(false);
  const [loginPromptAttention, setLoginPromptAttention] = useState(false);
  const [channels, setChannels] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loginPrompt, setLoginPrompt] = useState(false);

  const [feed, setFeed] = useState([]);
  const [feedOffset, setFeedOffset] = useState(0);
  const [feedTotal, setFeedTotal] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredCounts, setFeaturedCounts] = useState({});
  const [postAttachmentMap, setPostAttachmentMap] = useState({});
  const [activeVotes, setActiveVotes] = useState({});

  const loadMoreRef = useRef(null);

  async function loadChannels() {
    const data = await apiGet("/api/channels");
    setChannels(data);
  }

  async function loadAttachmentsForPosts(posts, append = false) {
    const nextMap = {};
    await Promise.all(
      posts.map(async (post) => {
        try {
          const atts = await apiGet(`/api/attachments?target_type=post&target_id=${post.id}`);
          nextMap[`post-${post.id}`] = atts;
        } catch {
          nextMap[`post-${post.id}`] = [];
        }
      })
    );

    setPostAttachmentMap((prev) => (append ? { ...prev, ...nextMap } : nextMap));
  }

  function syncVotesFromPosts(posts, append = false) {
    const nextVotes = {};
    for (const post of posts) {
      nextVotes[`post-${post.id}`] = post.my_vote ?? 0;
    }
    setActiveVotes((prev) => (append ? { ...prev, ...nextVotes } : nextVotes));
  }

  async function loadFeedPage(offset, append = false) {
    const loadingSetter = append ? setLoadingMore : setLoadingFeed;
    loadingSetter(true);

    try {
      const data = await apiGet(
        `/api/posts?limit=${PAGE_SIZE}&offset=${offset}&sort=created_desc`
      );

      const posts = data.posts || [];
      const total = data.meta?.total || 0;

      setFeedTotal(total);
      setFeedOffset(offset + posts.length);
      setFeed((prev) => (append ? [...prev, ...posts] : posts));

      await loadAttachmentsForPosts(posts, append);
      syncVotesFromPosts(posts, append);
    } catch (e) {
      setErr(e.message);
    } finally {
      loadingSetter(false);
    }
  }

  async function loadFeaturedChannels() {
    setFeaturedLoading(true);
    try {
      const data = await apiGet(
        `/api/posts?limit=${FEATURED_SAMPLE_SIZE}&offset=0&sort=created_desc`
      );

      const counts = {};
      for (const post of data.posts || []) {
        const id = String(post.channel_id ?? "");
        if (!id) continue;
        counts[id] = (counts[id] || 0) + 1;
      }

      setFeaturedCounts(counts);
    } catch (e) {
      setErr((prev) => prev || e.message);
    } finally {
      setFeaturedLoading(false);
    }
  }

  async function initialLoad() {
    try {
      setErr("");
      await Promise.all([
        loadChannels(),
        loadFeedPage(0, false),
        loadFeaturedChannels()
      ]);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    initialLoad();
  }, [user]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const node = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) return;
        if (loadingFeed || loadingMore) return;
        if (feed.length >= feedTotal) return;

        loadFeedPage(feedOffset, true);
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [feed.length, feedOffset, feedTotal, loadingFeed, loadingMore]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!user) {
      setLoginPrompt(true);
      setLoginPromptAttention(true);
      setErr("Please log in first to create a channel.");

      window.setTimeout(() => {
        setLoginPromptAttention(false);
      }, 700);
      
      return;
    }

    setLoginPrompt(false);

    try {
    const created = await apiSend("POST", "/api/channels", { name });
    setName("");
    await loadChannels();
    navigate(`/channel/${created.id}`);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function onVote(postId, value) {
    if (!user) {
      setErr("Please log in first to vote.");
      return;
    }

    try {
      await apiSend("POST", "/api/votes", {
        target_type: "post",
        target_id: postId,
        value
      });

      setActiveVotes((prev) => ({
        ...prev,
        [`post-${postId}`]: value
      }));

      setFeed((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

          const oldVote = post.my_vote ?? 0;
          const oldScore = post.score ?? 0;
          const nextScore = oldScore - oldVote + value;

          return {
            ...post,
            score: nextScore,
            my_vote: value
          };
        })
      );
    } catch (e) {
      setErr(e.message);
    }
  }

  const channelsById = useMemo(() => {
    const map = {};
    for (const c of channels) map[String(c.id)] = c;
    return map;
  }, [channels]);
  

  

  const featuredChannels = useMemo(() => {
    return [...channels]
      .map((channel) => ({
        ...channel,
        activity: featuredCounts[String(channel.id)] || 0
      }))
      .sort((a, b) => b.activity - a.activity || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [channels, featuredCounts]);

  
  const loginPromptFlashStyle = loginPromptAttention
  ? {
      animation: "loginPromptShake 0.45s ease, loginPromptGlow 0.7s ease",
      border: "1px solid rgba(239,68,68,0.55)",
      boxShadow: "0 0 0 4px rgba(239,68,68,0.14)"
    }
  : {};

  function onHomeSearchSubmit(e) {
  e.preventDefault();
  const q = homeSearch.trim();
  if (!q) return;
  navigate(`/search?q=${encodeURIComponent(q)}&type=posts_text`);
}

  return (
      <>
    <style>{`
      @keyframes loginPromptShake {
        0% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
        100% { transform: translateX(0); }
      }

      @keyframes loginPromptGlow {
        0% { background: rgba(239,68,68,0.06); }
        50% { background: rgba(239,68,68,0.14); }
        100% { background: rgba(79,140,255,0.10); }
      }
        
  .create-btn:active {
    background: linear-gradient(135deg, #1e40af, #1e3a8a) !important; /* dark blue */
    transform: scale(0.96);
  }
    `}</style>
    <div>
<PageHeader
  title="Home"
  subtitle="A cross-channel feed of the newest programming discussions."
  action={
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        minWidth: 320
      }}
    >
      <form
        onSubmit={onHomeSearchSubmit}
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <input
          value={homeSearch}
          onChange={(e) => setHomeSearch(e.target.value)}
          placeholder="Search posts..."
          style={{
            ...inputStyle(),
            width: 260
          }}
        />
        <button type="submit" style={buttonStyle("secondary")}>
          Search
        </button>
      </form>

      <Link
        to="/search"
        style={{
          ...buttonStyle("ghost"),
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center"
        }}
      >
        Advanced search
      </Link>

      <span style={badgeStyle("blue")}>{feedTotal} total posts</span>
    </div>
  }
/>

      <ErrorBanner>{err}</ErrorBanner>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px minmax(0, 1fr)",
          gap: 18,
          alignItems: "start"
        }}
      >
        <aside
  style={{
    position: "sticky",
    top: 88,
    display: "grid",
    gap: 18,
    maxHeight: "calc(100vh - 104px)",
    overflowY: "auto",
    paddingRight: 6
  }}
>
          <section
            style={{
              ...subtleCardStyle(),
              border: loginPrompt
                ? "1px solid rgba(239,68,68,0.45)"
                : subtleCardStyle().border,
              boxShadow: loginPrompt
                ? "0 0 0 3px rgba(239,68,68,0.12)"
                : "none"
            }}
          >
            
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
              Create channel
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={fieldLabelStyle()}>Channel name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. webdev"
                  style={inputStyle()}
                />
              </div>

              <button
                type="submit"
                style={{
                  ...buttonStyle("primary"),
                  background: name.trim()
                    ? "linear-gradient(135deg, #3b82f6, #2563eb)" // blue
                    : "rgba(255,255,255,0.08)", // inactive
                  color: name.trim() ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: name.trim() ? "pointer" : "not-allowed",
                  opacity: name.trim() ? 1 : 0.6,
                  transition: "all 0.15s ease"
                }}
                className="create-btn"
              >
                Create channel
              </button>
            </form>
            <div style={{ marginTop: 12 }}>
  <Link
    to="/channels"
    style={{
      ...buttonStyle("ghost"),
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      boxSizing: "border-box"
    }}
  >
    All channels
  </Link>
</div>

              {!user && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(79,140,255,0.1)",
                    border: "1px solid rgba(79,140,255,0.2)",
                    ...loginPromptFlashStyle
                  }}
                >
                <div style={{ marginBottom: 8, color: "#dbeafe", fontWeight: 700 }}>
                  Login required
                </div>
                <div style={{ color: theme.muted, marginBottom: 10 }}>
                  You need an account before creating channels.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link
                    to="/login"
                    style={{
                      ...buttonStyle("secondary"),
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center"
                    }}
                  >
                    Go to login
                  </Link>
                  <Link
                    to="/signup"
                    style={{
                      ...buttonStyle("ghost"),
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center"
                    }}
                  >
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section style={subtleCardStyle()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 12
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Featured channels
              </div>
              <span style={badgeStyle("neutral")}>recent activity</span>
            </div>

            {featuredLoading ? (
              <div style={{ color: theme.muted }}>Loading channels…</div>
            ) : featuredChannels.length === 0 ? (
              <EmptyState
                title="No channels yet"
                text="Create a channel to start the feed."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {featuredChannels.map((channel) => (
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 750 }}>{channel.name}</div>
                        <div style={{ color: theme.muted, fontSize: 13 }}>
                          Channel #{channel.id}
                        </div>
                      </div>
                      <span style={badgeStyle(channel.activity > 0 ? "green" : "neutral")}>
                        {channel.activity} recent
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main style={{ display: "grid", gap: 14 }}>
          {loadingFeed ? (
            <div style={{ color: theme.muted }}>Loading feed…</div>
          ) : feed.length === 0 ? (
            <EmptyState
              title="No posts yet"
              text="Once posts are created in channels, they will appear here."
            />
          ) : (
            <>
              {feed.map((post) => {
                const channel = channelsById[String(post.channel_id)];
                const attachments = postAttachmentMap[`post-${post.id}`] || [];

                return (
                  <article key={post.id} style={subtleCardStyle()}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: 14,
                        alignItems: "start"
                      }}
                    >
                      <VoteRail
                        user={user}
                        score={post.score}
                        compact
                        activeVote={activeVotes[`post-${post.id}`] ?? post.my_vote ?? 0}
                        onVote={(value) => onVote(post.id, value)}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 8 }}>
                          <Link
                            to={`/channel/${post.channel_id}`}
                            style={{
                              color: theme.muted,
                              textDecoration: "none",
                              fontSize: 13,
                              fontWeight: 700
                            }}
                          >
                            {channel?.name || `Channel ${post.channel_id}`}
                          </Link>
                        </div>

                        <Link
                          to={`/posts/${post.id}`}
                          style={{
                            color: "#eef4ff",
                            textDecoration: "none",
                            fontSize: 28,
                            fontWeight: 850,
                            lineHeight: 1.1,
                            letterSpacing: "-0.03em",
                            overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "normal",
    display: "block",
    minWidth: 0
                          }}
                        >
                          {post.topic}
                        </Link>

                        <div style={{ marginTop: 8 }}>
                          <PostMeta
                            author={post.author_name}
                            score={post.score}
                            createdAt={post.created_at}
                          />
                        </div>

                        {post.data ? (
                          <div
                            style={{
                              marginTop: 14,
                              color: theme.text,
                              lineHeight: 1.65,
                              whiteSpace: "pre-wrap",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: attachments.length > 0 ? 2 : 3,
                              WebkitBoxOrient: "vertical",
                              overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0
                            }}
                          >
                            {post.data}
                          </div>
                        ) : null}

                        {attachments.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <PreviewImages attachments={attachments} />
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            marginTop: 14
                          }}
                        >
                          <Link
                            to={`/posts/${post.id}`}
                            style={{
                              ...buttonStyle("secondary"),
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            Open discussion
                          </Link>

                          <Link
                            to={`/channel/${post.channel_id}`}
                            style={{
                              ...buttonStyle("ghost"),
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            More from channel
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {loadingMore && (
                <div style={{ color: theme.muted, padding: "6px 4px" }}>
                  Loading more posts…
                </div>
              )}

              {!loadingMore && feed.length >= feedTotal && feedTotal > 0 && (
                <div style={{ color: theme.muted, padding: "6px 4px" }}>
                  You’ve reached the end.
                </div>
              )}

              <div ref={loadMoreRef} style={{ height: 1 }} />
            </>
          )}
        </main>
      </div>
    </div>
  </>
  );
  
}