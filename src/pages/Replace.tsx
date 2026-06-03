import { useState } from "react";

import {
  Home as HomeIcon,
  Sparkles,
  BookOpen,
  Trophy,
  Calendar,
  Users,
  Shield,
} from "lucide-react";

import "./App.css";

import Home from "./Home";
import Showcase from "./Showcase";
import ShinyDex from "./ShinyDex";
import Leaderboard from "./Leaderboard";
import Events from "./Events";
import Bounty from "./Bounties";
import AdminDashboard from "./AdminDashboard";

function App() {
  const [page, setPage] = useState("home");

  const renderPage = () => {
    switch (page) {
      case "showcase":
        return <Showcase />;

      case "dex":
        return <ShinyDex />;

      case "board":
        return <Leaderboard />;

      case "events":
        return <Events />;

      case "bounty":
        return <Bounty />;

      case "admin":
        return <AdminDashboard />;

      default:
        return <Home />;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>TEAM FATE</h1>
        <p>PokeMMO Community</p>

        <nav>
          <button onClick={() => setPage("home")}>
            <HomeIcon size={20} />
            Home
          </button>

          <button onClick={() => setPage("showcase")}>
            <Sparkles size={20} />
            Showcase
          </button>

          <button onClick={() => setPage("dex")}>
            <BookOpen size={20} />
            Shiny Dex
          </button>

          <button onClick={() => setPage("board")}>
            <Trophy size={20} />
            Board
          </button>

          <button onClick={() => setPage("events")}>
            <Calendar size={20} />
            Events
          </button>

          <button onClick={() => setPage("bounty")}>
            <Users size={20} />
            Bounty
          </button>

          <button onClick={() => setPage("admin")}>
            <Shield size={20} />
            Admin
          </button>
        </nav>
      </aside>

      <main className="content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;