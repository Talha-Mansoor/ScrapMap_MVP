import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiSend } from "../api.js";
import {
  PageHeader,
  SectionCard,
  ErrorBanner,
  fieldLabelStyle,
  inputStyle,
  textareaStyle,
  buttonStyle,
  theme,
  PreviewImages
} from "../ui.jsx";

function makeTempToken() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PostEdit({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [data, setData] = useState("");
  const [post, setPost] = useState(null);

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removeExisting, setRemoveExisting] = useState(false);

  const [tempToken, setTempToken] = useState(makeTempToken());
  const [newAttachments, setNewAttachments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const canEdit = useMemo(() => {
    return user && post && (user.id === post.author_id || user.role === "admin");
  }, [user, post]);

  async function loadAll() {
    setLoading(true);
    setErr("");

    try {
      const [postData, attData] = await Promise.all([
        apiGet(`/api/posts/${id}`),
        apiGet(`/api/attachments?target_type=post&target_id=${id}`)
      ]);

      setPost(postData);
      setTopic(postData.topic || "");
      setData(postData.data || "");
      setExistingAttachments(attData || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setErr("Please log in first.");
      return;
    }

    setUploading(true);
    setErr("");

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("temp_token", tempToken);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: form,
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      const list = await apiGet(`/api/attachments?temp_token=${encodeURIComponent(tempToken)}`);
      setNewAttachments(list || []);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!canEdit) {
      setErr("You can only edit your own post.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      await apiSend("PUT", `/api/posts/${id}`, {
        topic,
        data,
        remove_attachments: removeExisting,
        temp_token: newAttachments.length > 0 ? tempToken : ""
      });

      navigate(`/posts/${id}`);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <SectionCard title="Edit post">
        <div style={{ color: theme.muted, marginBottom: 12 }}>
          Login required.
        </div>
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
      </SectionCard>
    );
  }

  if (loading) {
    return <div style={{ color: theme.muted }}>Loading post…</div>;
  }

  if (err && !post) {
    return <ErrorBanner>{err}</ErrorBanner>;
  }

  if (!canEdit) {
    return (
      <SectionCard title="Edit post">
        <div style={{ color: theme.muted }}>
          You can only edit your own post.
        </div>
      </SectionCard>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit post"
        subtitle="Update your title, body, and image."
        action={
          <Link
            to={`/posts/${id}`}
            style={{
              ...buttonStyle("ghost"),
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            Back to post
          </Link>
        }
      />

      <ErrorBanner>{err}</ErrorBanner>

      <SectionCard title="Edit">
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={fieldLabelStyle()}>Title</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={inputStyle()}
              placeholder="Post title"
            />
          </div>

          <div>
            <label style={fieldLabelStyle()}>Body</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={textareaStyle(180)}
              placeholder="Write your post"
            />
          </div>

          <div>
            <label style={fieldLabelStyle()}>Current image(s)</label>
            {existingAttachments.length > 0 ? (
              <>
                <PreviewImages attachments={existingAttachments} />
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    color: theme.text
                  }}
                >
                  <input
                    type="checkbox"
                    checked={removeExisting}
                    onChange={(e) => setRemoveExisting(e.target.checked)}
                  />
                  Remove current image(s)
                </label>
              </>
            ) : (
              <div style={{ color: theme.muted }}>No current images.</div>
            )}
          </div>

          <div>
            <label style={fieldLabelStyle()}>Upload replacement image</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
            {uploading && (
              <div style={{ color: theme.muted, marginTop: 8 }}>Uploading…</div>
            )}
            {newAttachments.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: theme.muted, marginBottom: 6 }}>
                  New image preview
                </div>
                <PreviewImages attachments={newAttachments} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="submit"
              style={buttonStyle("primary")}
              disabled={saving || !topic.trim() || !data.trim()}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            <Link
              to={`/posts/${id}`}
              style={{
                ...buttonStyle("ghost"),
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center"
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}