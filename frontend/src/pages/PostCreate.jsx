import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiSend } from "../api.js";
import {
  PageHeader,
  SectionCard,
  ErrorBanner,
  fieldLabelStyle,
  inputStyle,
  textareaStyle,
  selectStyle,
  buttonStyle,
  PreviewImages,
  EmptyState,
  PageLink,
  badgeStyle,
  theme
} from "../ui.jsx";

const TITLE_MAX = 120;
const BODY_MAX = 5000;
const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function makeTempToken() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PostCreate({ user }) {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState(sp.get("channelId") ?? "1");
  const [topic, setTopic] = useState("");
  const [data, setData] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [tempToken] = useState(() => makeTempToken());

  useEffect(() => {
    apiGet("/api/channels").then(setChannels).catch(() => {});
  }, []);

  async function loadTempAttachments() {
    try {
      const rows = await apiGet(`/api/attachments?temp_token=${encodeURIComponent(tempToken)}`);
      setAttachments(rows);
    } catch {}
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");

    if (attachments.length >= MAX_IMAGES) {
      setErr(`You can upload at most ${MAX_IMAGES} images per post.`);
      e.target.value = "";
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErr("Only PNG, JPEG, and WEBP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErr("Image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("temp_token", tempToken);

      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd
      });

      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) throw new Error(body?.message || `Upload failed (${res.status})`);

      await loadTempAttachments();
      e.target.value = "";
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const trimmedTopic = topic.trim();
    const trimmedData = data.trim();

    if (!trimmedTopic) {
      setErr("Title is required.");
      return;
    }

    if (!trimmedData) {
      setErr("Body is required.");
      return;
    }

    if (trimmedTopic.length > TITLE_MAX) {
      setErr(`Title must be ${TITLE_MAX} characters or less.`);
      return;
    }

    if (trimmedData.length > BODY_MAX) {
      setErr(`Body must be ${BODY_MAX} characters or less.`);
      return;
    }

    if (attachments.length > MAX_IMAGES) {
      setErr(`You can upload at most ${MAX_IMAGES} images per post.`);
      return;
    }

    try {
      const created = await apiSend("POST", "/api/posts", {
        channel_id: Number(channelId),
        topic: trimmedTopic,
        data: trimmedData,
        temp_token: tempToken
      });
      nav(`/posts/${created.id}`);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <PageHeader title="Create post" subtitle="You must log in before creating posts." />
        <EmptyState title="Login required" text="Once logged in, you can post in any channel and attach screenshots." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <PageHeader
        title="Create post"
        subtitle="A slick composer for the features you actually have: channel, title, body, and image uploads."
        action={attachments.length > 0 ? <span style={badgeStyle("green")}>{attachments.length} image{attachments.length > 1 ? "s" : ""}</span> : null}
      />

      <SectionCard title="Compose">
        <ErrorBanner>{err}</ErrorBanner>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={fieldLabelStyle()}>Channel</label>
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)} style={selectStyle()}>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} (#{channel.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle()}>Title</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
              placeholder="What do you want to ask?"
              style={inputStyle()}
            />
            <div style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>
              {topic.length}/{TITLE_MAX}
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle()}>Body</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value.slice(0, BODY_MAX))}
              maxLength={BODY_MAX}
              placeholder="Provide context, code details, or the bug you are facing."
              rows={10}
              style={textareaStyle(10)}
            />
            <div style={{ color: theme.muted, fontSize: 13, marginTop: 6 }}>
              {data.length}/{BODY_MAX}
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle()}>Images</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onFileChange}
                disabled={attachments.length >= MAX_IMAGES}
              />
              {uploading ? <span style={{ color: theme.muted }}>Uploading…</span> : null}
              <span style={{ color: theme.muted, fontSize: 13 }}>
                {attachments.length}/{MAX_IMAGES} images, max 5 MB each
              </span>
            </div>
            <PreviewImages attachments={attachments} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" style={buttonStyle("primary")} disabled={!topic.trim() || !data.trim()}>
              Publish post
            </button>
            {channelId ? (
              <PageLink to={`/channel/${channelId}`}>Back to channel</PageLink>
            ) : null}
          </div>
        </form>
      </SectionCard>
    </div>
  );
}