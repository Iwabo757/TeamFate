import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
} from "react-router-dom";

import { supabase } from "./lib/supabase";
import Members from "./pages/Members";
import Home from "./pages/Home";
import ShinyShowcase from "./pages/Showcase";
import ShinyDex from "./pages/ShinyDex";
import ShinyBoard from "./pages/Leaderboard";
import Events from "./pages/Events";
import Forums from "./pages/Forums";
import AdminEvents from "./pages/AdminEvents";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AddShiny from "./pages/AddShiny";
import ManageShinies from "./pages/ManageShinies";
import ManageMembers from "./pages/ManageMembers";
import "./App.css";

type ProfileData = {
  id: string;
  username: string;
  avatar_url: string;
  role: string;
};

export default function App() {
  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("SESSION:", session);

      console.log(
        "URL:",
        window.location.href
      );

      console.log(
        "HASH:",
        window.location.hash
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);
    }

    checkUser();
  }, []);

  useEffect(() => {
    loadProfile();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      () => {
        loadProfile();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("NO USER");
      setProfile(null);
      return;
    }

    console.log("USER:", user);

    console.log(
      "METADATA:",
      user.user_metadata
    );
const result = await supabase
  .from("profiles")
  .upsert(
    {
      id: user.id,

      username:
        user.user_metadata.full_name ||
        user.user_metadata.name ||
        "Unknown",

      discord_name:
        user.user_metadata.name,

      avatar_url:
        user.user_metadata.avatar_url,

      discord_id:
        user.user_metadata.provider_id,

    },
    {
      onConflict: "id",
    }
  );

    console.log(
      "UPSERT DATA:",
      result.data
    );

    console.log(
      "UPSERT ERROR:",
      result.error
    );

    const profileResult =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    console.log(
      "PROFILE:",
      profileResult
    );

    console.log(
      "PROFILE DATA:",
      profileResult.data
    );

console.log(
  "PROFILE ROLE:",
  profileResult.data?.role
);
    console.log(
      "PROFILE ERROR:",
      profileResult.error
    );

    if (profileResult.data) {
      setProfile(profileResult.data);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <div className="logo-main">
            TEAM FATE
          </div>

          <div className="logo-sub">
            ⭐ One Wish. One Fate ⭐
          </div>
        </div>

        <nav className="nav-links">
          <NavLink to="/">
            Home
          </NavLink>

<div className="dropdown">
  <NavLink to="/dex">
    Shiny Dex
  </NavLink>

  <div className="dropdown-content">
    <NavLink to="/showcase">
      Showcase
    </NavLink>
  </div>
</div>

          <NavLink to="/board">
            Leaderboard
          </NavLink>

          <NavLink to="/events">
            Events
          </NavLink>

          <NavLink to="/forums">
            Forums
          </NavLink>

<NavLink to="/members">
  Members
</NavLink>

{profile?.role === "admin" && (
<div className="dropdown">
  <span>Admin ▼</span>

  <div className="dropdown-menu">
    <Link to="/admin">
      Dashboard
    </Link>

    <Link to="/admin/events">
      Create Event
    </Link>

    <Link to="/admin/shinies/add">
      Add Shiny
    </Link>

    <Link to="/admin/shinies">
      Manage Shinies
    </Link>

    <Link to="/admin/members">
      Manage Members
    </Link>
  </div>
</div>
)}
        </nav>

<div className="topbar-right">
          {profile ? (
  <div className="user-menu">
    <Link
      to="/profile"
      className="user-button"
    >
      <img
        src={profile.avatar_url}
        alt={profile.username}
        className="nav-avatar"
      />

      <div className="user-info">
        <span className="username">
          {profile.username}
        </span>

        <button
          className="logout-link"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          Logout
        </button>
      </div>
    </Link>
  </div>
) : (
  <NavLink
    to="/login"
    className="login-btn"
  >
    Login
  </NavLink>
)}
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/showcase"
            element={
              <ShinyShowcase />
            }
          />

          <Route
            path="/dex"
            element={<ShinyDex />}
          />
<Route
  path="/members"
  element={<Members />}
/>
          <Route
            path="/board"
            element={
              <ShinyBoard />
            }
          />

          <Route
            path="/events"
            element={<Events />}
          />

          <Route
            path="/forums"
            element={<Forums />}
          />

<Route
  path="/admin"
  element={<AdminDashboard />}
/>

<Route
  path="/admin/events"
  element={<AdminEvents />}
/>

<Route
  path="/admin/shinies/add"
  element={<AddShiny />}
/>

<Route
  path="/admin/shinies"
  element={<ManageShinies />}
/>

<Route
  path="/admin/members"
  element={<ManageMembers />}
/>

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/login"
            element={<Login />}
          />
        </Routes>
      </main>
    </div>
  );
}