import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiSend } from "../api.js";

import {
  PageHeader,
  SectionCard,
  ErrorBanner,
  PreviewImages,
  VoteRail,
  buttonStyle,
  fieldLabelStyle,
  textareaStyle,
  subtleCardStyle,
  PageLink,
  PostMeta,
  badgeStyle,
  theme
} from "../ui.jsx";

function makeTempToken() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ReplyComposer({
  user,
  replyText,
  setReplyText,
  onSubmit,
  uploading,
  onFileChange,
  draftAttachments,
  replyingTo,
  onCancel
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      {replyingTo && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={badgeStyle("orange")}>Replying to reply #{replyingTo}</span>
          <button type="button" onClick={onCancel} style={buttonStyle("ghost")}>Cancel</button>
        </div>
      )}

      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Write a reply"
        rows={4}
        style={textareaStyle(6)}
        disabled={!user}
      />

      {user && (
        <div>
          <label style={fieldLabelStyle()}>Reply image</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
            {uploading ? <span style={{ color: theme.muted }}>Uploading…</span> : null}
          </div>
          <PreviewImages attachments={draftAttachments} small />
        </div>
      )}

      <button type="submit" style={buttonStyle("primary")} disabled={!user || !replyText.trim()}>
        Post reply
      </button>
    </form>
  );
}

function ReplyNode({
  reply,
  childrenMap,
  onReplyClick,
  user,
  onVote,
  activeVotes,
  attachmentMap,
  replyingTo,
  replyText,
  setReplyText,
  onSubmitReply,
  replyUploading,
  onReplyFileChange,
  replyDraftAttachments,
  onCancelReply
}) {
  const children = childrenMap[reply.id] || [];

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          borderLeft: "2px solid rgba(255,255,255,0.08)",
          paddingLeft: 14,
          marginLeft: 6
        }}
      >
        <div style={subtleCardStyle()}>
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, overflowWrap: "anywhere",
    wordBreak: "break-word"}}>{reply.data}</div>
              <div style={{ marginTop: 10 }}>
                <PostMeta
                  author={reply.author_name}
                  score={reply.score}
                  createdAt={reply.created_at}
                  extra={`reply #${reply.id}`}
                />
              </div>
            </div>

            <VoteRail
              user={user}
              score={reply.score}
              compact
              activeVote={activeVotes[`reply-${reply.id}`] ?? 0}
              onVote={(value) => onVote("reply", reply.id, value)}
            />
          </div>

          <PreviewImages attachments={attachmentMap[`reply-${reply.id}`] || []} small />

          <div style={{ marginTop: 12 }}>
            <button onClick={() => onReplyClick(reply.id)} style={buttonStyle("secondary")}>
              Reply
            </button>
          </div>

          {replyingTo === reply.id && (
            <div style={{ marginTop: 14 }}>
              <ReplyComposer
                user={user}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmit={onSubmitReply}
                uploading={replyUploading}
                onFileChange={onReplyFileChange}
                draftAttachments={replyDraftAttachments}
                replyingTo={replyingTo}
                onCancel={onCancelReply}
              />
            </div>
          )}
        </div>
      </div>

      {children.length > 0 && (
        <div style={{ marginLeft: 18 }}>
          {children.map((child) => (
            <ReplyNode
              key={child.id}
              reply={child}
              childrenMap={childrenMap}
              onReplyClick={onReplyClick}
              user={user}
              onVote={onVote}
              activeVotes={activeVotes}
              attachmentMap={attachmentMap}
              replyingTo={replyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={onSubmitReply}
              replyUploading={replyUploading}
              onReplyFileChange={onReplyFileChange}
              replyDraftAttachments={replyDraftAttachments}
              onCancelReply={onCancelReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostView({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [postAttachments, setPostAttachments] = useState([]);
  const [replyAttachmentMap, setReplyAttachmentMap] = useState({});
  const [replyText, setReplyText] = useState("");
  const [parentReplyId, setParentReplyId] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeVotes, setActiveVotes] = useState({});

  const [replyTempToken, setReplyTempToken] = useState(makeTempToken());
  const [replyDraftAttachments, setReplyDraftAttachments] = useState([]);
  const [replyUploading, setReplyUploading] = useState(false);

  async function loadAll() {
    try {
      setErr("");
      setLoading(true);

      const [postData, repliesData, postAtts] = await Promise.all([
        apiGet(`/api/posts/${id}`),
        apiGet(`/api/replies?postId=${id}`),
        apiGet(`/api/attachments?target_type=post&target_id=${id}`)
      ]);

      setPost(postData);
      setReplies(repliesData);
      setPostAttachments(postAtts);

      const nextVotes = {
        [`post-${postData.id}`]: Number(postData.my_vote ?? 0)
      };

      for (const reply of repliesData) {
        nextVotes[`reply-${reply.id}`] = Number(reply.my_vote ?? 0);
      }

      setActiveVotes(nextVotes);

      const replyAttMap = {};
      await Promise.all(
        repliesData.map(async (reply) => {
          const atts = await apiGet(`/api/attachments?target_type=reply&target_id=${reply.id}`);
          replyAttMap[`reply-${reply.id}`] = atts;
        })
      );
      setReplyAttachmentMap(replyAttMap);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReplyDraftAttachments(token) {
    try {
      const rows = await apiGet(`/api/attachments?temp_token=${encodeURIComponent(token)}`);
      setReplyDraftAttachments(rows);
    } catch {}
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  async function onReplyFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setReplyUploading(true);

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("temp_token", replyTempToken);

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

      await loadReplyDraftAttachments(replyTempToken);
      e.target.value = "";
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setReplyUploading(false);
    }
  }

  async function onReplySubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      await apiSend("POST", "/api/replies", {
        post_id: Number(id),
        parent_reply_id: parentReplyId,
        data: replyText,
        temp_token: replyTempToken
      });

      setReplyText("");
      setParentReplyId(null);
      const nextToken = makeTempToken();
      setReplyTempToken(nextToken);
      setReplyDraftAttachments([]);
      await loadAll();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function onVote(targetType, targetId, value) {
    setErr("");
    try {
      await apiSend("POST", "/api/votes", {
        target_type: targetType,
        target_id: targetId,
        value
      });
      setActiveVotes((prev) => ({
  ...prev,
  [`${targetType}-${targetId}`]: Number(value)
}));
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  }

  const rootReplies = useMemo(
    () => replies.filter((r) => r.parent_reply_id == null),
    [replies]
  );

  const childrenMap = useMemo(() => {
    const map = {};
    for (const reply of replies) {
      const parent = reply.parent_reply_id;
      if (parent == null) continue;
      if (!map[parent]) map[parent] = [];
      map[parent].push(reply);
    }
    return map;
  }, [replies]);

  return (
    <div>
      <PageHeader
  title={
    <div
      style={{
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        whiteSpace: "normal"
      }}
    >
      {post?.topic || "Post"}
    </div>
  }
        subtitle={post ? `Open discussion in channel #${post.channel_id}` : "Loading discussion…"}
        action={post?.channel_id ? <PageLink to={`/channel/${post.channel_id}`}>Back to channel</PageLink> : null}
      />

      <ErrorBanner>{err}</ErrorBanner>
      {loading && <div style={{ color: theme.muted }}>Loading post…</div>}

      {!loading && post && (
        <>
          <SectionCard title="Post">
            <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    background: "#11151d",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 18,
                    padding: 16,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                        overflowWrap: "anywhere",
    wordBreak: "break-word"
                  }}
                >
                  {post.data}
                </div>

                <div style={{ marginTop: 12 }}>
                  <PostMeta author={post.author_name} score={post.score} createdAt={post.created_at} extra={`post #${post.id}`} />
                </div>

                <PreviewImages attachments={postAttachments} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
  <VoteRail
    user={user}
    score={post.score}
    activeVote={activeVotes[`post-${post.id}`] ?? 0}
    onVote={(value) => onVote("post", post.id, value)}
  />

  {user && post.author_id === user.id && (
    <button
      onClick={() => navigate(`/posts/${post.id}/edit`)}
      style={buttonStyle("secondary")}
    >
      Edit post
    </button>
  )}
</div>
            </div>
          </SectionCard>

          <SectionCard title="Reply">
            {!user && <div style={{ color: theme.muted, marginBottom: 12 }}>You must log in before replying.</div>}

            {parentReplyId == null ? (
              <ReplyComposer
                user={user}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmit={onReplySubmit}
                uploading={replyUploading}
                onFileChange={onReplyFileChange}
                draftAttachments={replyDraftAttachments}
                replyingTo={null}
                onCancel={() => {}}
              />
            ) : (
              <div style={{ color: theme.muted }}>
                Reply composer is shown directly under the selected reply.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Replies"
            action={<span style={badgeStyle("blue")}>{replies.length} total</span>}
          >
            {rootReplies.length === 0 ? (
              <div style={{ color: theme.muted }}>No replies yet.</div>
            ) : (
              rootReplies.map((reply) => (
                <ReplyNode
                  key={reply.id}
                  reply={reply}
                  childrenMap={childrenMap}
                  onReplyClick={(replyId) => {
                    setParentReplyId(replyId);
                    setReplyText("");
                    const nextToken = makeTempToken();
                    setReplyTempToken(nextToken);
                    setReplyDraftAttachments([]);
                  }}
                  user={user}
                  onVote={onVote}
                  activeVotes={activeVotes}
                  attachmentMap={replyAttachmentMap}
                  replyingTo={parentReplyId}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onSubmitReply={onReplySubmit}
                  replyUploading={replyUploading}
                  onReplyFileChange={onReplyFileChange}
                  replyDraftAttachments={replyDraftAttachments}
                  onCancelReply={() => {
                    setParentReplyId(null);
                    setReplyText("");
                    setReplyDraftAttachments([]);
                  }}
                />
              ))
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}