import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
} from "react-router-dom";

import { supabase } from "./lib/supabase";

import Home from "./pages/Home";
import ShinyShowcase from "./pages/Showcase";
import ShinyDex from "./pages/ShinyDex";
import ShinyBoard from "./pages/Leaderboard";
import Events from "./pages/Events";
import Forums from "./pages/Forums";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Profile from "./pages/Profile";

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
            user.user_metadata
              .preferred_username ||
            user.user_metadata
              .global_name ||
            user.user_metadata
              .full_name ||
            user.user_metadata.name ||
            "Unknown",

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

          <NavLink to="/showcase">
            Showcase
          </NavLink>

          <NavLink to="/dex">
            Shiny Dex
          </NavLink>

          <NavLink to="/board">
            Leaderboard
          </NavLink>

          <NavLink to="/events">
            Events
          </NavLink>

          <NavLink to="/forums">
            Forums
          </NavLink>

          <NavLink to="/admin">
            Admin
          </NavLink>
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
            element={<Admin />}
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