import React, { useEffect, useState } from "react";
import { apiGet, apiSend } from "../api.js";
import {
  PageHeader,
  SectionCard,
  ErrorBanner,
  EmptyState,
  fieldLabelStyle,
  inputStyle,
  buttonStyle,
  subtleCardStyle,
  badgeStyle
} from "../ui.jsx";

export default function AdminPage({ user }) {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [posts, setPosts] = useState([]);
  const [replyPostId, setReplyPostId] = useState("1");
  const [replies, setReplies] = useState([]);
  const [err, setErr] = useState("");

  async function loadAll() {
    try {
      setErr("");
      const [me, channelList, postList] = await Promise.all([
        apiGet("/api/me"),
        apiGet("/api/channels"),
        apiGet("/api/posts?limit=50&offset=0")
      ]);

      setChannels(channelList);
      setPosts(postList.posts || []);

      if (postList.posts?.length) {
        const firstPostId = replyPostId || String(postList.posts[0].id);
        setReplyPostId(firstPostId);
        try {
          const replyData = await apiGet(`/api/replies?postId=${firstPostId}`);
          setReplies(replyData);
        } catch {
          setReplies([]);
        }
      }

      if (me.user?.role === "admin") {
        const userResults = await apiGet("/api/search?type=most_posts_users&limit=50");
        setUsers(userResults.results || []);
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    if (user?.role === "admin") loadAll();
  }, [user]);

  useEffect(() => {
    if (!replyPostId) return;
    apiGet(`/api/replies?postId=${replyPostId}`)
      .then(setReplies)
      .catch(() => setReplies([]));
  }, [replyPostId]);

  async function remove(path, label) {
    if (!confirm(`Delete this ${label}?`)) return;

    try {
      await apiSend("DELETE", path);
      loadAll();
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!user) return <EmptyState title="Login required" text="You need an account to access admin tools." />;
  if (user.role !== "admin") return <EmptyState title="Admin only" text="This page is only available to admin accounts." />;

  const stats = [
    { label: "Users", value: users.length },
    { label: "Channels", value: channels.length },
    { label: "Posts", value: posts.length },
    { label: "Replies", value: replies.length }
  ];

  const row = (title, item, actions) => (
    <div key={item.id} style={{ ...subtleCardStyle(), display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <div>{title}</div>
      <div>{actions}</div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Moderation tools for users, channels, posts, and replies."
        action={<span style={badgeStyle("orange")}>Admin mode</span>}
      />

      <ErrorBanner>{err}</ErrorBanner>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        {stats.map((s) => (
          <div key={s.label} style={subtleCardStyle()}>
            <div style={{ color: "#9ca3af", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <SectionCard title="Users">
        {users.length === 0 ? (
          <EmptyState title="No user data" text="No users available yet." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {users.map((u) =>
              row(
                `${u.display_name} · id ${u.id} · posts ${u.post_count}`,
                u,
                u.id !== user.id ? (
                  <button onClick={() => remove(`/api/admin/users/${u.id}`, "user")} style={buttonStyle("danger")}>Delete</button>
                ) : (
                  <span style={badgeStyle("neutral")}>You</span>
                )
              )
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Channels">
        <div style={{ display: "grid", gap: 10 }}>
          {channels.map((c) =>
            row(
              `${c.name} · id ${c.id}`,
              c,
              <button onClick={() => remove(`/api/admin/channels/${c.id}`, "channel")} style={buttonStyle("danger")}>Delete</button>
            )
          )}
        </div>
      </SectionCard>

      <SectionCard title="Posts">
        <div style={{ display: "grid", gap: 10 }}>
          {posts.map((p) =>
            row(
              `${p.topic} · id ${p.id}`,
              p,
              <button onClick={() => remove(`/api/admin/posts/${p.id}`, "post")} style={buttonStyle("danger")}>Delete</button>
            )
          )}
        </div>
      </SectionCard>

      <SectionCard title="Replies">
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabelStyle()}>Post ID</label>
          <input value={replyPostId} onChange={(e) => setReplyPostId(e.target.value)} style={inputStyle()} />
        </div>

        {replies.length === 0 ? (
          <EmptyState title="No replies" text="No replies were found for that post id." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {replies.map((r) =>
              row(
                `reply #${r.id}: ${r.data}`,
                r,
                <button onClick={() => remove(`/api/admin/replies/${r.id}`, "reply")} style={buttonStyle("danger")}>Delete</button>
              )
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}