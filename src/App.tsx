import { Routes, Route, NavLink } from "react-router-dom";
import ShinyDetails from "./pages/ShinyDetails";
import Home from "./pages/Home";
import ShinyShowcase from "./pages/Showcase";
import ShinyDex from "./pages/ShinyDex";
import ShinyBoard from "./pages/Leaderboard";
import Events from "./pages/Events";
import Forums from "./pages/Forums";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

import {
  FaHome,
  FaStar,
  FaBook,
} from "react-icons/fa";

import "./App.css";

export default function App() {
  return (
   
      <div className="app">

<header className="topbar">
  <div className="logo">
    <div className="logo-main">TEAM FATE</div>
    <div className="logo-sub">One Wish. One Fate</div>
  </div>

  <nav className="nav-links">
    <NavLink to="/">Home</NavLink>
    <NavLink to="/showcase">Showcase</NavLink>
    <NavLink to="/dex">ShinyDex</NavLink>
    <NavLink to="/board">Leaderboard</NavLink>
    <NavLink to="/events">Events</NavLink>
    <NavLink to="/forums">Forums</NavLink>
    <NavLink to="/admin">Admin</NavLink>
  </nav>

  <div className="topbar-right">
    <NavLink to="/login" className="login-btn">
      Login
    </NavLink>
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
              element={<ShinyShowcase />}
            />

            <Route
              path="/dex"
              element={<ShinyDex />}
            />

            <Route
              path="/board"
              element={<ShinyBoard />}
            />
<Route
  path="/showcase/:id"
  element={<ShinyDetails />}
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
              path="/login"
              element={<Login />}
            />
          </Routes>
        </main>

      </div>
 
  );
}