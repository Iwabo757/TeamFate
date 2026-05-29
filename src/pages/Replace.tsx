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

import Home from "./pages/Home";
import Showcase from "./pages/Showcase";
import ShinyDex from "./pages/ShinyDex";
import Leaderboard from "./pages/Leaderboard";
import Events from "./pages/Events";
import Forums from "./pages/Forums";
import Admin from "./pages/Admin";

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

      case "forums":
        return <Forums />;

      case "admin":
        return <Admin />;

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

          <button onClick={() => setPage("forums")}>
            <Users size={20} />
            Forums
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