import {
  Home,
  Sparkles,
  BookOpen,
  Trophy,
  Calendar,
  Users,
  Shield,
} from "lucide-react";

import "./App.css";

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h1>TEAM FATE</h1>
        <p>PokeMMO Community</p>

        <nav>
          <a href="#">
            <Home size={20} />
            Home
          </a>

          <a href="#">
            <Sparkles size={20} />
            Shiny Showcase
          </a>

          <a href="#">
            <BookOpen size={20} />
            Shiny Dex
          </a>

          <a href="#">
            <Trophy size={20} />
            Shiny Board
          </a>

          <a href="#">
            <Calendar size={20} />
            Events
          </a>

          <a href="#">
            <Users size={20} />
            Forums
          </a>

          <a href="#">
            <Shield size={20} />
            Admin
          </a>
        </nav>
      </aside>

      <main className="content">
        <section className="hero">
          <h1>TEAM FATE</h1>

          <p>
            The ultimate PokeMMO shiny hunting community.
          </p>
        </section>

        <section className="stats">
          <div className="card">
            <h2>Members</h2>
            <span>155</span>
          </div>

          <div className="card">
            <h2>Team Shinies</h2>
            <span>2144</span>
          </div>

          <div className="card">
            <h2>Guild Points</h2>
            <span>9521</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;