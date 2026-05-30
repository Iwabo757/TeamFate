import RecentFinds from "../components/RecentFinds";
export default function Home() {
  return (
    <>
      <div className="hero">
        <h1>TEAM FATE</h1>
        <p>The ultimate PokeMMO shiny hunting community.</p>
      </div>
<RecentFinds />
      <div className="stats">
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
      </div>
    </>
  );
}