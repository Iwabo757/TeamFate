import { useEffect, useRef, useState } from "react";
import "./index.css";
import "./App.css";

import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

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

import Recruitment from "./pages/Recruitment";
import AdminRecruitment from "./pages/AdminRecruitment";

import HordeHunter from "./pages/HordeHunter";
import ShuntMachine from "./pages/ShuntMachine";
import AlteringCave from "./pages/AlteringCave";

import Tools from "./pages/Tools";

import ThemeSelector from "./components/ThemeSelector";

type ProfileData = {
  id: string;
  username: string;
  nickname?: string;
  avatar_url: string;
  role: string;
};

type SubNavItem = {
  label: string;
  path: string;
  end?: boolean;
};

export default function App() {
  const location = useLocation();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileNavRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     AUTH / PROFILE
  ========================================================= */

  useEffect(() => {
    loadProfile();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     CLOSE MOBILE MENU ON PAGE CHANGE
  ========================================================= */

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* =========================================================
     CLOSE MOBILE MENU WHEN CLICKING OUTSIDE
  ========================================================= */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node)
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

  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      return;
    }

    const { data: existingProfile } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    /* First Login */

    if (!existingProfile) {
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

    /* Update Discord Information
       Role is intentionally NOT updated here */

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

    const { data: profileData } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (profileData) {
      setProfile(profileData);
    }
  }

  /* =========================================================
     ROLE PERMISSIONS
  ========================================================= */

  function canManageSite(role?: string) {
    return [
      "officer",
      "commander",
      "leader",
      "admin",
    ].includes(role || "");
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    await supabase.auth.signOut();

    setProfile(null);
    setMobileOpen(false);
  }

  /* =========================================================
     DYNAMIC DESKTOP SUB NAVIGATION
  ========================================================= */

  function getSubNav(): SubNavItem[] {
    const path = location.pathname;

    /* HOME */

    if (
      path === "/" ||
      path === "/recruitment"
    ) {
      return [
        {
          label: "Home",
          path: "/",
          end: true,
        },
        {
          label: "Recruitment",
          path: "/recruitment",
        },
      ];
    }

    /* SHINY */

    if (
      path === "/shinydex" ||
      path === "/showcase" ||
      path === "/submit-shiny"
    ) {
      return [
        {
          label: "Team Shiny Dex",
          path: "/shinydex",
        },
        {
          label: "Shiny Showcase",
          path: "/showcase",
        },
        {
          label: "Submit Shiny",
          path: "/submit-shiny",
        },
      ];
    }

    /* EVENTS */

    if (
      path.startsWith("/events") ||
      path.startsWith("/bounties")
    ) {
      return [
        {
          label: "Events",
          path: "/events",
        },
        {
          label: "Bounties",
          path: "/bounties",
        },
        {
          label: "Shiny Wars",
          path: "/events/shinywars",
        },
      ];
    }

    /* RAIDS */

    if (
      path === "/raid-tracker" ||
      path === "/raid-overview" ||
      path === "/raid-builder"
    ) {
      return [
        {
          label: "My Raid Status",
          path: "/raid-tracker",
        },
        {
          label: "Raid Overview",
          path: "/raid-overview",
        },
        {
          label: "Raid Builder",
          path: "/raid-builder",
        },
      ];
    }

    /* LEADERBOARD */

    if (path.startsWith("/board")) {
      return [
        {
          label: "Leaderboard",
          path: "/board",
        },
      ];
    }

    /* MEMBERS */

    if (path.startsWith("/members")) {
      return [
        {
          label: "Members",
          path: "/members",
        },
      ];
    }

    /* TOOLS */

    if (
      path.startsWith("/tools") ||
      path.startsWith("/guides") ||
      path.startsWith("/horde-hunter") ||
      path.startsWith("/shunt-machine") ||
      path.startsWith("/altering-cave")
    ) {
      return [
        {
          label: "Tools",
          path: "/tools",
        },
        {
          label: "Guides",
          path: "/guides",
        },
        {
          label: "Horde Hunter",
          path: "/horde-hunter",
        },
        {
          label: "Shunt Machine",
          path: "/shunt-machine",
        },
        {
          label: "Altering Cave",
          path: "/altering-cave",
        },
      ];
    }

    /* ADMIN */

    if (
      path.startsWith("/admin") &&
      canManageSite(profile?.role)
    ) {
      return [
        {
          label: "Admin Dashboard",
          path: "/admin",
          end: true,
        },
        {
          label: "Shiny Dashboard",
          path: "/admin/shiny-dashboard",
        },
        {
          label: "Bounty Dashboard",
          path: "/admin/bounty-dashboard",
        },
        {
          label: "Shiny Wars",
          path: "/admin/shinywars",
        },
        {
          label: "Events",
          path: "/admin/events",
        },
        {
          label: "Recruitment Editor",
          path: "/admin/recruitment",
        },
        {
          label: "Members",
          path: "/admin/members",
        },
      ];
    }

    return [];
  }

  const subNav = getSubNav();

  return (
    <>
      <div className="app">

        {/* =====================================================
            TOP HEADER
        ===================================================== */}

        <header className="topbar">

          {/* LOGO */}

          <div className="logo">
            <Link
              to="/"
              className="brand"
            >
              <img
                src="/images/jirachi-banner.jpg"
                alt="Team Fate"
                className="brand-logo"
              />

              <div className="logo-text">
                <div className="logo-main">
                  Team Faté
                </div>

                <div className="logo-sub">
                  ★ One Wish. One Faté ★
                </div>
              </div>
            </Link>
          </div>


          {/* =================================================
              MOBILE NAVIGATION WRAPPER
          ================================================= */}

          <div
            className="mobile-navigation"
            ref={mobileNavRef}
          >

            {/* HAMBURGER BUTTON */}

            <button
              className="mobile-menu-btn"
              onClick={() =>
                setMobileOpen((open) => !open)
              }
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              ☰
            </button>


            {/* MOBILE MENU */}

            {mobileOpen && (
              <div className="mobile-menu">

                <div className="mobile-menu-section">

                  <div className="mobile-menu-title">
                    Navigation
                  </div>

                  <Link to="/">
                    Home
                  </Link>

                  <Link to="/recruitment">
                    Recruitment
                  </Link>

                  <Link to="/shinydex">
                    Team Shiny Dex
                  </Link>

                  <Link to="/submit-shiny">
                    Submit Shiny
                  </Link>

                  <Link to="/showcase">
                    Shiny Showcase
                  </Link>

                  <Link to="/events">
                    Events
                  </Link>

                  <Link to="/bounties">
                    Bounties
                  </Link>

                  <Link to="/events/shinywars">
                    Shiny Wars
                  </Link>

                  <Link to="/raid-tracker">
                    My Raid Status
                  </Link>

                  <Link to="/raid-overview">
                    Raid Overview
                  </Link>

                  <Link to="/raid-builder">
                    Raid Builder
                  </Link>

                  <Link to="/board">
                    Leaderboard
                  </Link>

                  <Link to="/members">
                    Members
                  </Link>

                  <Link to="/tools">
                    Tools
                  </Link>

                </div>


                {/* ADMIN */}

                {canManageSite(profile?.role) && (
                  <div className="mobile-menu-section">

                    <div className="mobile-menu-title">
                      Staff
                    </div>

                    <Link to="/admin">
                      Admin Dashboard
                    </Link>

                  </div>
                )}


                {/* THEME ACCESSIBILITY */}

                <div className="mobile-menu-section mobile-theme-section">

                  <div className="mobile-menu-title">
                    Accessibility Theme
                  </div>

                  <ThemeSelector />

                </div>


                {/* MOBILE ACCOUNT */}

                <div className="mobile-menu-section mobile-account-section">

                  <div className="mobile-menu-title">
                    Account
                  </div>

                  {profile ? (
                    <>
                      <Link to="/profile">
                        Profile
                      </Link>

                      <button
                        className="mobile-logout-btn"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link to="/login">
                      Login
                    </Link>
                  )}

                </div>

              </div>
            )}

          </div>


          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav className="nav-links">

            <NavLink
              to="/"
              end
            >
              Home
            </NavLink>

            <NavLink to="/shinydex">
              Shiny
            </NavLink>

            <NavLink to="/events">
              Events
            </NavLink>

            <NavLink to="/board">
              Leaderboard
            </NavLink>

            <NavLink to="/raid-overview">
              Raids
            </NavLink>

            <NavLink to="/tools">
              Tools
            </NavLink>

            <NavLink to="/members">
              Members
            </NavLink>

          </nav>


          {/* =================================================
              DESKTOP RIGHT SIDE
          ================================================= */}

          <div className="topbar-right">

            {canManageSite(profile?.role) && (
              <NavLink
                to="/admin"
                className="admin-nav-link"
              >
                Admin
              </NavLink>
            )}


            {profile ? (
              <div className="user-menu">

                <Link
                  to="/profile"
                  className="user-button"
                >

                  <img
                    src={profile.avatar_url}
                    alt={
                      profile.nickname ||
                      profile.username
                    }
                    className="nav-avatar"
                  />

                  <div className="user-info">

                    <span className="username">
                      {profile.nickname ||
                        profile.username}
                    </span>

                    <button
                      className="logout-link"
                      onClick={(event) => {
                        event.preventDefault();
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


        {/* =====================================================
            DESKTOP SUB NAVIGATION ONLY

            CSS WILL HIDE THIS COMPLETELY ON MOBILE
        ===================================================== */}

        {subNav.length > 0 && (
          <div className="sub-nav">

            <div className="sub-nav-links">

              {subNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `sub-nav-link ${
                      isActive ? "active" : ""
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

            </div>


            {/* DESKTOP THEME SELECTOR */}

            <div className="sub-nav-theme">
              <ThemeSelector />
            </div>

          </div>
        )}


        {/* =====================================================
            PAGE CONTENT
        ===================================================== */}

        <main className="content">

          <Routes>

            {/* HOME */}

            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/recruitment"
              element={<Recruitment />}
            />


            {/* SHINY */}

            <Route
              path="/showcase"
              element={<ShinyShowcase />}
            />

            <Route
              path="/shinydex"
              element={<ShinyDex />}
            />

            <Route
              path="/submit-shiny"
              element={<SubmitShiny />}
            />


            {/* MEMBERS */}

            <Route
              path="/members"
              element={<Members />}
            />


            {/* LEADERBOARD */}

            <Route
              path="/board"
              element={<ShinyBoard />}
            />


            {/* EVENTS */}

            <Route
              path="/events"
              element={<Events />}
            />

            <Route
              path="/events/shinywars"
              element={<ShinyWars />}
            />

            <Route
              path="/events/shinywars/:warId"
              element={<ShinyWars />}
            />

            <Route
              path="/events/shinywars/history"
              element={<ShinyWarHistory />}
            />


            {/* BOUNTIES */}

            <Route
              path="/bounties"
              element={<Bounties />}
            />


            {/* RAIDS */}

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
              path="/raid-overview"
              element={<RaidOverview />}
            />

            <Route
              path="/guides"
              element={<RaidGuides />}
            />

            <Route
              path="/admin-raids"
              element={<AdminRaidDashboard />}
            />


            {/* TOOLS */}

            <Route
              path="/tools"
              element={<Tools />}
            />

            <Route
              path="/horde-hunter"
              element={<HordeHunter />}
            />

            <Route
              path="/shunt-machine"
              element={<ShuntMachine />}
            />

            <Route
              path="/altering-cave"
              element={<AlteringCave />}
            />


            {/* PROFILE */}

            <Route
              path="/profile"
              element={<Profile />}
            />

            <Route
              path="/login"
              element={<Login />}
            />


            {/* =================================================
                ADMIN
            ================================================= */}

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
              path="/admin/events/edit/:id"
              element={<AdminEvents />}
            />


            {/* ADMIN SHINIES */}

            <Route
              path="/admin/shinies/add"
              element={<AddShiny />}
            />

            <Route
              path="/admin/shinies"
              element={<ManageShinies />}
            />

            <Route
              path="/admin/shiny-approvals"
              element={<AdminShinyApprovals />}
            />

            <Route
              path="/admin/shiny-dashboard"
              element={<ShinyDashboard />}
            />


            {/* ADMIN MEMBERS */}

            <Route
              path="/admin/members"
              element={<ManageMembers />}
            />


            {/* ADMIN BOUNTIES */}

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
              path="/admin/bounties/edit/:id"
              element={<AdminBounties />}
            />

            <Route
              path="/admin/bounty-dashboard"
              element={<BountyDashboard />}
            />


            {/* ADMIN HOMEPAGE */}

            <Route
              path="/admin/homepage"
              element={<EditHomepage />}
            />


            {/* ADMIN SHINY WARS */}

            <Route
              path="/admin/shinywars"
              element={<ShinyWarsDashboard />}
            />

            <Route
              path="/admin/shinywars/create"
              element={<CreateShinyWar />}
            />

            <Route
              path="/admin/shinywars/edit/:id"
              element={<EditShinyWar />}
            />

            <Route
              path="/admin/shinywars/teams/:id"
              element={<ManageShinyWarTeams />}
            />


            {/* ADMIN RECRUITMENT */}

            <Route
              path="/admin/recruitment"
              element={<AdminRecruitment />}
            />

          </Routes>

        </main>

      </div>

      <Analytics />
      <SpeedInsights />
    </>
  );
}
