import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; // Change to your existing Supabase client path.

type Category = { id: string; name: string; description: string | null; voting_open: boolean };
type Nominee = { id: string; category_id: string; trainer_name: string; description: string | null; image_url: string | null };
type Role = "member" | "staff" | "admin";

export default function TeamFateAwardsPage() {
  const [categories,setCategories]=useState<Category[]>([]);
  const [nominees,setNominees]=useState<Nominee[]>([]);
  const [role,setRole]=useState<Role>("member");
  const [votes,setVotes]=useState<Record<string,string>>({});
  const [choices,setChoices]=useState<Record<string,string>>({});
  const [rankings,setRankings]=useState<Record<string,any[]>>({});
  const [winners,setWinners]=useState<Record<string,Nominee>>({});
  const [audit,setAudit]=useState<any[]>([]);
  const [auditCategory,setAuditCategory]=useState("");
  const [categoryId,setCategoryId]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  async function load() {
    setError("");
    try {
      const [c,n,r,v,w] = await Promise.all([
        supabase.from("award_categories").select("id,name,description,voting_open").order("display_order"),
        supabase.from("award_nominees").select("id,category_id,trainer_name,description,image_url").eq("approved_for_voting",true).order("trainer_name"),
        supabase.rpc("get_my_award_role"),
        supabase.rpc("get_my_award_votes"),
        supabase.from("award_winners").select("category_id,award_nominees(id,category_id,trainer_name,description,image_url)")
      ]);
      if(c.error) throw c.error; if(n.error) throw n.error; if(r.error) throw r.error; if(v.error) throw v.error; if(w.error) throw w.error;
      setCategories(c.data||[]); setNominees(n.data||[]); setRole(r.data||"member");
      setCategoryId(old=>old || c.data?.[0]?.id || "");
      const vm:Record<string,string>={}; (v.data||[]).forEach((x:any)=>vm[x.category_id]=x.nominee_id); setVotes(vm);
      const wm:Record<string,Nominee>={}; (w.data||[]).forEach((x:any)=>{if(x.award_nominees)wm[x.category_id]=x.award_nominees}); setWinners(wm);
      if(r.data==="staff"||r.data==="admin") {
        const q=await supabase.rpc("get_award_review_rankings"); if(q.error) throw q.error;
        const groups:Record<string,any[]>={}; (q.data||[]).forEach((x:any)=>(groups[x.category_id]??=[]).push(x)); setRankings(groups);
      }
    } catch(e:any) { setError(e.message||"Could not load awards."); }
  }
  useEffect(()=>{void load();},[]);
  async function castVote() {
    if(!choices[categoryId]) return setError("Choose a nominee first.");
    setBusy(true);setError("");setNotice("");
    const {error:e}=await supabase.rpc("cast_award_vote",{p_category_id:categoryId,p_nominee_id:choices[categoryId]});
    setBusy(false); if(e){setError(e.message);return;} setNotice("Your private vote has been recorded."); await load();
  }
  async function review(category:string, nominee:string, decision:"approve"|"deny") {
    let reason:string|null=null;
    if(decision==="deny"){reason=window.prompt("Reason for denying this candidate?")?.trim()||null;if(!reason)return;}
    setBusy(true);setError("");setNotice("");
    const {error:e}=await supabase.rpc("review_award_candidate",{p_category_id:category,p_nominee_id:nominee,p_decision:decision,p_reason:reason});
    setBusy(false);if(e){setError(e.message);return;}
    setNotice(decision==="approve"?"Winner approved.":"Candidate denied; the next eligible candidate moves into review.");await load();
  }
  async function loadAudit() {
    const {data,error:e}=await supabase.rpc("admin_get_award_ballot_audit",{p_category_id:auditCategory||null});
    if(e){setError(e.message);return;}setAudit(data||[]);
  }
  const active=categories.find(c=>c.id===categoryId);
  return <main className="fate-awards-page"><div className="awards-shade"/><div className="awards-shell">
    <header className="awards-hero"><div className="awards-eyebrow">ONE WISH. ONE FATÉ.</div><h1>TEAM FATÉ <span>AWARDS</span></h1><p>Celebrating the trainers who make our community unforgettable.</p></header>
    {(error||notice)&&<div className={"awards-alert "+(error?"error":"success")}>{error||notice}<button onClick={()=>{setError("");setNotice("");}}>×</button></div>}
    <section className="awards-panel"><div className="section-head"><div><small>THE HONORS</small><h2>Award Categories</h2></div></div>
      <div className="category-tabs">{categories.map(c=><button key={c.id} className={c.id===categoryId?"active":""} onClick={()=>setCategoryId(c.id)}>{c.name}</button>)}</div>
      {active&&<article className="category-content"><div className="category-heading"><div><h3>{active.name}</h3><p>{active.description}</p></div><span className={active.voting_open?"open":"closed"}>{active.voting_open?"Voting Open":"Voting Closed"}</span></div>
        {winners[active.id]&&<div className="winner-banner"><span>♛ OFFICIAL WINNER</span><strong>{winners[active.id].trainer_name}</strong></div>}
        <div className="nominee-grid">{nominees.filter(n=>n.category_id===active.id).map(n=><button key={n.id} className={"nominee "+(choices[active.id]===n.id||votes[active.id]===n.id?"chosen":"")} disabled={!active.voting_open||!!votes[active.id]} onClick={()=>setChoices(old=>({...old,[active.id]:n.id}))}>
          <div className="avatar">{n.image_url?<img src={n.image_url} alt=""/>:n.trainer_name.slice(0,1)}</div><strong>{n.trainer_name}</strong>{n.description&&<small>{n.description}</small>}<em>{votes[active.id]===n.id?"Your vote":choices[active.id]===n.id?"Selected":"Select nominee"}</em>
        </button>)}</div>
        {!nominees.some(n=>n.category_id===active.id)&&<p className="empty">Nominees will appear here once added.</p>}
        {active.voting_open&&!votes[active.id]&&<div className="vote-row"><span>Private ballot · one vote per category</span><button className="gold-button" disabled={busy||!choices[active.id]} onClick={()=>void castVote()}>{busy?"Submitting…":"Submit Vote"}</button></div>}
        {!!votes[active.id]&&<p className="confirmed">✓ Your vote has been recorded.</p>}
      </article>}
    </section>
    <section className="awards-panel"><div className="section-head"><div><small>THE LEGACY</small><h2>Hall of Winners</h2></div></div><div className="winner-grid">{categories.map(c=><div className="winner-card" key={c.id}><span>♛</span><small>{c.name}</small><strong>{winners[c.id]?.trainer_name||"Winner to be announced"}</strong></div>)}</div></section>
    {(role==="staff"||role==="admin")&&<section className="awards-panel"><div className="section-head"><div><small>RESTRICTED ACCESS</small><h2>Staff Review Queue</h2></div><span className="role-tag">No voter identities</span></div><p className="staff-note">Staff can see weighted rankings and review candidates, but cannot see who voted for whom.</p>
      {categories.map(c=>{const rows=rankings[c.id]||[];const current=rows.find(x=>["pending","queued"].includes(x.review_status));return <div className="review-block" key={c.id}><h3>{c.name}</h3>{rows.map(x=><div className={"rank-row "+(x.nominee_id===current?.nominee_id?"current":"")} key={x.nominee_id}><span>{nominees.find(n=>n.id===x.nominee_id)?.trainer_name||"Nominee"}</span><strong>{x.weighted_points} points</strong><small>{x.review_status}</small></div>)}{current&&<div className="review-actions"><button className="gold-button" disabled={busy} onClick={()=>void review(c.id,current.nominee_id,"approve")}>Approve Winner</button><button className="deny-button" disabled={busy} onClick={()=>void review(c.id,current.nominee_id,"deny")}>Deny & Advance Next</button></div>}</div>})}
    </section>}
    {role==="admin"&&<section className="awards-panel"><div className="section-head"><div><small>ADMIN ONLY</small><h2>Ballot Audit</h2></div><span className="role-tag admin">Full audit access</span></div><p className="staff-note">This is the only screen that can display voter identities and individual selections.</p><div className="audit-controls"><select value={auditCategory} onChange={e=>setAuditCategory(e.target.value)}><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="gold-button" onClick={()=>void loadAudit()}>Load Audit</button></div>{audit.length>0&&<div className="table-wrap"><table><thead><tr><th>Category</th><th>Voter</th><th>Voted for</th><th>Weight</th></tr></thead><tbody>{audit.map((r,i)=><tr key={i}><td>{r.category_name}</td><td>{r.voter_name}</td><td>{r.nominee_name}</td><td>{r.weight}</td></tr>)}</tbody></table></div>}</section>}
    <footer className="awards-footer"><b>TEAM FATÉ</b><span>ONE WISH. ONE FATÉ.</span></footer>
  </div></main>;
}
