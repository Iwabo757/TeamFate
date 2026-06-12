import { useEffect, useState, useRef } from "react";
import "./index.css";
import "./App.css";

import {
  Routes,
  Route,
  NavLink,
  Link,
} from "react-router-dom";

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
 
import { supabase } from "./lib/supabase";
import Members from "./pages/Members";
import Home from "./pages/Home";

import ShinyShowcase from "./pages/Showcase";
import ShinyDex from "./pages/ShinyDex";
import ShinyBoard from "./pages/Leaderboard";


import AdminEvents from "./pages/AdminEvents";
import AdminPastEvents from "./pages/AdminPastEvents";
import AdminCurrentEvents from "./pages/AdminCurrentEvents";
import Events from "./pages/Events";

import Login from "./pages/Login";
import Profile from "./pages/Profile";

import AdminDashboard from "./pages/AdminDashboard";

import ManageMembers from "./pages/ManageMembers";
import EventDashboard from "./pages/EventDashboard";

import SubmitShiny from "./pages/SubmitShiny";
import AdminShinyApprovals from "./pages/AdminShinyApprovals";
import ShinyDashboard from "./pages/ShinyDashboard";
import AddShiny from "./pages/AddShiny";
import ManageShinies from "./pages/ManageShinies";

import Bounties from "./pages/Bounties";
import AdminBounties from "./pages/AdminBounties";
import AdminCurrentBounties from "./pages/AdminCurrentBounties";
import AdminPastBounties from "./pages/AdminPastBounties";
import BountyDashboard from "./pages/BountytDashboard";

import EditHomepage from "./pages/EditHomepage";

import ShinyWars from "./pages/ShinyWars";
import ShinyWarHistory from "./pages/ShinyWarHistory";
import ShinyWarsDashboard from "./pages/ShinyWarsDashboard";
import CreateShinyWar from "./pages/CreateShinyWar";
import EditShinyWar from "./pages/EditShinyWar";
import ManageShinyWarTeams from "./pages/ManageShinyWarTeams";

import RaidTracker from "./pages/RaidTracker";
import ReadyRaiders from "./pages/ReadyRaiders";
import RaidBuilder from "./pages/RaidBuilder";
import AdminRaidDashboard from "./pages/AdminRaidDashboard";
import RaidOverview from "./pages/RaidOverview";

import RaidGuides from "./pages/RaidGuides";
import AdminRaidGuides from "./pages/AdminRaidGuides";

type ProfileData = {
  id: string;
  username: string;
  nickname?: string;
  avatar_url: string;
  role: string;
};


export default function App() {

  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

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

useEffect(() => {
  function handleClickOutside(
    event: MouseEvent
  ) {
    if (
      menuRef.current &&
      !menuRef.current.contains(
        event.target as Node
      )
    ) {
      setMobileOpen(false);
    }
  }

  document.addEventListener(
    "mousedown",
    handleClickOutside
  );

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, []);


async function loadProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setProfile(null);
    return;
  }

  // Check if profile exists
  const { data: existing } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  // First login only
  if (!existing) {
    await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username:
          user.user_metadata.name,

        discord_name:
          user.user_metadata.name,

        avatar_url:
          user.user_metadata.avatar_url,

        discord_id:
          user.user_metadata.provider_id,

        role: "guest",
      });
  }

  // Update Discord info but NEVER role
  await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,

        username:
          user.user_metadata.name,

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

  const profileResult =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (profileResult.data) {
    setProfile(
      profileResult.data
    );
  }
}


function canManageSite(
  role?: string
) {
  return [
    "officer",
    "commander",
    "leader",
    "admin",
  ].includes(role || "");
}

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <>
    <div className="app">
      <header className="topbar">
<div className="logo">
  <img
    src="/images/jirachi-banner.jpg"
    alt="Team Fate"
    className="logo-image"
  />

  <div className="logo-text">
    <div className="logo-main">
      Team Faté
    </div>

    <div className="logo-sub">
      ★ One Wish. One Faté ★
    </div>
  </div>
</div>

          <button
            className="mobile-menu-btn"
            onClick={() =>
              setMobileOpen(!mobileOpen)
            }
          >
            ☰
          </button>

        <nav className="nav-links">
          <NavLink to="/">
            Home
          </NavLink>

<div className="dropdown">
  <span> Shiny Dex ▼</span>

  <div className="dropdown-content">
    <Link to="/shinydex">
      ✨ Team Shiny Dex
    </Link>

    <Link to="/showcase">
      Shiny Showcase
    </Link>

<Link to="/submit-shiny">
  Submit Shiny
</Link>
  </div>
</div>



<div className="dropdown">
  <span>Events ▼</span>

  <div className="dropdown-content">
    <Link to="/events">
      📅 Current Events
    </Link>

    <Link to="/events?view=past">
      Past Events
    </Link>
    <Link
      to="/events/shinywars"
    >
      ⚔️ Shiny Wars
    </Link>

    <Link
      to="/events/shinywars/history"
    >
      War History
    </Link>
  </div>
</div>



<li className="dropdown">
  <span> Bounty ▼</span>

  <div className="dropdown-content">
    <Link to="/bounties">
      🎯 Active Bounties
    </Link>

    <Link to="/bounties?view=past">
      Completed Bounties
    </Link>
  </div>
</li>




<li className="dropdown">
  <span> Raids ▼</span>

  <div className="dropdown-content">
<Link to="/raid-tracker">
  My Raid Status
</Link>

<Link to="/raid-overview">
  Raid Overview
</Link>

<Link to="/raid-builder">
  Raid Builder
</Link>
<Link to="/raid-guides">
  Guides
</Link>
  </div>
</li>


          <NavLink to="/board">
            Leaderboard 
          </NavLink>

<NavLink to="/members">
  Members
</NavLink>

{canManageSite(
  profile?.role
) && (
<div className="dropdown">
  <span>Admin ▼</span>

  <div className="dropdown-menu">
    <Link to="/admin">
      Admin Dashboard
    </Link>

    <Link to="/admin/shiny-dashboard">
      Shiny Dashboard
    </Link>

    <Link to="/admin/bounty-dashboard">
      Bounty Dashboard
    </Link>

    <Link
      to="/admin/shinywars"
      className="admin-card"
    >
      Shiny Wars Dashboard
    </Link>

    <Link to="/admin/events">
       Events Dashboard
    </Link>

<Link to="/admin-raids">
  Raid Dashboard
</Link>
<Link to="/admin-raid-guides">
  Raid Guides
</Link>
    <Link to="/admin/members">
      Manage Members
    </Link>
  </div>
</div>
)}
        </nav>


<div
  className="mobile-nav-container"
  ref={menuRef}
>
  {mobileOpen && (
    <div className="mobile-nav">

      <Link
        to="/"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Home
      </Link>

      <Link
        to="/shinydex"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Team Shiny Dex
      </Link>

      <Link
        to="/showcase"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Shiny Showcase
      </Link>

      <Link 
        to="/submit-shiny"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Submit Shiny
      </Link>

      <Link
        to="/events"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Events

      </Link>

      <Link
        to="/events/shinywars"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Shiny Wars
      </Link>
      <Link
        to="/bounties"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Bounties
      </Link>

      <Link
        to="/raid-overview"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Raid Overview
      </Link>

      <Link
        to="/raid-tracker"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        My Raid Status
      </Link>


      <Link
        to="/raid-guides"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Raid Guides
      </Link>

      <Link
        to="/board"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Leaderboard
      </Link>



      <Link
        to="/members"
        onClick={() =>
          setMobileOpen(false)
        }
      >
        Members
      </Link>

      {canManageSite(
        profile?.role
      ) && (
        <>
          <Link
            to="/admin"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            Admin Dashboard
          </Link>

        </>
      )}
    </div>
  )}
</div>


<div className="topbar-right">
          {profile ? (
  <div className="user-menu">
    <Link
      to="/profile"
      className="user-button"
    >
      <img
        src={profile.avatar_url}
        alt={profile.nickname ||
 profile.username}
        className="nav-avatar"
      />

      <div className="user-info">
        <span className="username">
          {profile.nickname ||
 profile.username}
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
            path="/shinydex"
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
  path="/admin"
  element={<AdminDashboard />}
/>

<Route
  path="/admin/events"
  element={<EventDashboard />}
/>

<Route
  path="/admin/current-events"
  element={<AdminCurrentEvents />}
/>

<Route
  path="/admin/past-events"
  element={<AdminPastEvents />}
/>

<Route
  path="/admin/events/create"
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
  path="/submit-shiny"
  element={<SubmitShiny />}
/>

<Route
  path="/admin/shiny-approvals"
  element={<AdminShinyApprovals />}
/>

<Route
  path="/submit-shiny"
  element={<SubmitShiny />}
/>
<Route
  path="/admin/shiny-dashboard"
  element={<ShinyDashboard />}
/>
<Route
  path="/bounties"
  element={<Bounties />}
/>

<Route
  path="/admin/bounties"
  element={<AdminBounties />}
/>

<Route
  path="/admin/current-bounties"
  element={<AdminCurrentBounties />}
/>

<Route
  path="/admin/past-bounties"
  element={<AdminPastBounties />}
/>

<Route
  path="/admin/bounties/create"
  element={<AdminBounties />}
/>
<Route
  path="/admin/bounty-dashboard"
  element={<BountyDashboard />}
 />
<Route
  path="/admin/events/edit/:id"
  element={<AdminEvents />}
/>
<Route
  path="/admin/bounties/edit/:id"
  element={<AdminBounties />}
/>
<Route
  path="/admin/homepage"
  element={<EditHomepage />}
/>

<Route
  path="/admin/shinywars"
  element={
    <ShinyWarsDashboard />
  }
/>
<Route
  path="/admin/shinywars/create"
  element={<CreateShinyWar />}
/>

<Route
  path="/admin/shinywars/teams/:id"
  element={
    <ManageShinyWarTeams />
  }
/>
<Route
  path="/admin/shinywars/edit/:id"
  element={<EditShinyWar />}
/>
<Route
  path="/events/shinywars/history"
  element={
    <ShinyWarHistory />
  }
/>
<Route
  path="/events/shinywars"
  element={<ShinyWars />}
/>
<Route
  path="/raid-tracker"
  element={<RaidTracker />}
/>
<Route
  path="/ready-raiders"
  element={<ReadyRaiders />}
/>
<Route
  path="/raid-builder"
  element={<RaidBuilder />}
/>
<Route
  path="/admin-raids"
  element={
    <AdminRaidDashboard />
  }
/>
<Route
  path="/raid-overview"
  element={<RaidOverview />}
/>
<Route
  path="/raid-guides"
  element={<RaidGuides />}
/>

<Route
  path="/admin-raid-guides"
  element={
    <AdminRaidGuides />
  }
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

    <Analytics />
    <SpeedInsights />
  </>
  );
}