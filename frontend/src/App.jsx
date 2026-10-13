import React, { useEffect, useState } from "react";

import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiSend } from "./api.js";
import Home from "./pages/Home.jsx";
import ScrapMap from "./pages/ScrapMap.jsx";
import PostsList from "./pages/PostsList.jsx";
import PostView from "./pages/PostView.jsx";
import PostCreate from "./pages/PostCreate.jsx";
import PostEdit from "./pages/PostEdit.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import Channels from "./pages/Channels.jsx";
import {
  appShellStyle,
  containerStyle,
  topBarStyle,
  navInnerStyle,
  brandStyle,
  navLinkStyle,
  buttonStyle,
  badgeStyle
} from "./ui.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  async function loadMe() {
    try {
      const data = await apiGet("/api/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function onLogout() {
    try {
      await apiSend("POST", "/api/logout");
      setUser(null);
      navigate("/");
    } catch {}
  }

  const isActive = (path) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <div style={appShellStyle()}>
      <div style={topBarStyle()}>
        <div style={navInnerStyle()}>
          <Link to="/" style={brandStyle()}>
            ScrapMap
          </Link>

          <Link to="/" style={navLinkStyle(isActive("/"))}>Explore</Link>
          <Link to="/community" style={navLinkStyle(isActive("/community"))}>Community</Link>
          <Link to="/create" style={navLinkStyle(isActive("/create"))}>Create Post</Link>
          <Link to="/search" style={navLinkStyle(isActive("/search"))}>Search</Link>
          {user?.role === "admin" && (
            <Link to="/admin" style={navLinkStyle(isActive("/admin"))}>Admin</Link>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {user ? (
              <>
                <span style={badgeStyle(user.role === "admin" ? "orange" : "blue")}>
                  {user.display_name} · {user.role}
                </span>
                <button onClick={onLogout} style={buttonStyle("secondary")}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" style={navLinkStyle(isActive("/login"))}>Login</Link>
                <Link to="/signup" style={navLinkStyle(isActive("/signup"))}>Signup</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={containerStyle()}>
        <Routes>
          <Route path="/" element={<ScrapMap />} />
          <Route path="/community" element={<Home user={user} />} />
          <Route path="/channel/:id" element={<PostsList user={user} />} />
          <Route path="/posts/:id" element={<PostView user={user} />} />
          <Route path="/create" element={<PostCreate user={user} />} />
          
          <Route path="/login" element={<Login onAuth={loadMe} />} />
          <Route path="/signup" element={<Signup onAuth={loadMe} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/admin" element={<AdminPage user={user} />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/posts/:id/edit" element={<PostEdit user={user} />} />
        </Routes>
      </div>
    </div>
  );
}