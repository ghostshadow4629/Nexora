import React, { useEffect, useState } from "react";

const API = "/api";
function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></>,
    note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>
  };
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
async function request(path, token, options={}) {
  const res = await fetch(API+path, { ...options, headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`} : {}), ...(options.headers||{}) } });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function App() {
  const [token,setToken] = useState(localStorage.getItem("nexora_token") || "");
  const [user,setUser] = useState(null);
  const [authMode,setAuthMode] = useState("login");
  const [auth,setAuth] = useState({name:"",email:"",password:""});
  const [page,setPage] = useState("overview");
  const [notes,setNotes] = useState([]);
  const [note,setNote] = useState({title:"",body:""});
  const [editing,setEditing] = useState(null);
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState([]);
  const [busy,setBusy] = useState(false);
  const [admin,setAdmin] = useState(null);
  const [error,setError] = useState("");
  const [mobileNav,setMobileNav] = useState(false);

  useEffect(()=>{ if(token) request("/me",token).then(d=>setUser(d.user)).catch(()=>logout()); },[]);
  useEffect(()=>{ if(token && user) loadNotes(); },[token,user]);
  async function loadNotes(){ try { const d=await request("/notes",token); setNotes(d.notes); } catch(e){setError(e.message);} }
  function logout(){ localStorage.removeItem("nexora_token"); setToken(""); setUser(null); setPage("overview"); setNotes([]); }
  async function submitAuth(e){
    e.preventDefault(); setError(""); setBusy(true);
    try { const d=await request(`/auth/${authMode}`,null,{method:"POST",body:JSON.stringify(auth)}); localStorage.setItem("nexora_token",d.token); setToken(d.token); setUser(d.user); }
    catch(e){setError(e.message);} finally{setBusy(false);}
  }
  async function saveNote(e){
    e.preventDefault(); setError("");
    try {
      if(editing) await request(`/notes/${editing}`,token,{method:"PUT",body:JSON.stringify(note)});
      else await request("/notes",token,{method:"POST",body:JSON.stringify(note)});
      setNote({title:"",body:""}); setEditing(null); await loadNotes();
    } catch(e){setError(e.message);}
  }
  async function deleteNote(id){ try{await request(`/notes/${id}`,token,{method:"DELETE"}); await loadNotes();}catch(e){setError(e.message);} }
  async function sendAI(e){
    e.preventDefault(); if(!message.trim()||busy)return;
    const prompt=message.trim(); setMessage(""); setMessages(m=>[...m,{role:"user",text:prompt}]); setBusy(true); setError("");
    try{const d=await request("/ai/chat",token,{method:"POST",body:JSON.stringify({message:prompt})});setMessages(m=>[...m,{role:"assistant",text:d.answer}]);}
    catch(e){setError(e.message);setMessages(m=>[...m,{role:"assistant",text:"I couldn't complete that request. "+e.message}]);}
    finally{setBusy(false);}
  }
  async function loadAdmin(){try{const d=await request("/admin/overview",token);setAdmin(d);setPage("admin");}catch(e){setError(e.message);}}
  if(!user) return <div className="auth-shell"><div className="auth-visual"><div className="brand"><span className="brand-mark">N</span>NEXORA</div><div className="auth-copy"><span className="eyebrow">YOUR DIGITAL WORLD</span><h1>Make space for<br/><em>what's next.</em></h1><p>A smarter place to think, create and keep everything moving.</p><div className="orbit"><div className="orbit-core">N</div><span className="orbit-dot dot-a">✦</span><span className="orbit-dot dot-b">✧</span><span className="orbit-dot dot-c">✳</span></div></div><div className="auth-foot">A calmer way to move forward. <span>© 2026 NEXORA</span></div></div><div className="auth-panel"><div className="auth-card"><div className="mobile-brand brand"><span className="brand-mark">N</span>NEXORA</div><span className="eyebrow">{authMode==="login"?"WELCOME BACK":"GET STARTED"}</span><h2>{authMode==="login"?"Sign in to Nexora":"Create your account"}</h2><p className="muted">{authMode==="login"?"Pick up where you left off.":"Your personal workspace is one step away."}</p><form onSubmit={submitAuth}>{authMode==="register"&&<label>Your name<input required value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} placeholder="Alex Morgan"/></label>}<label>Email address<input type="email" required value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength="8" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} placeholder="At least 8 characters"/></label><button className="primary full" disabled={busy}>{busy?"Please wait":authMode==="login"?"Sign in":"Create account"} <Icon name="arrow"/></button></form>{error&&<div className="alert">{error}</div>}<p className="switch-auth">{authMode==="login"?"New to Nexora?":"Already have an account?"} <button onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setError("");}}>{authMode==="login"?"Create an account":"Sign in"}</button></p><div className="secure-note">⌑ &nbsp; Your workspace is private and secure</div></div></div></div>;

  const navItems=[["overview","Overview","grid"],["assistant","AI Assistant","spark"],["notes","My Notes","note"],["music","Music","music"]];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"open":""}`}><div className="brand"><span className="brand-mark">N</span>NEXORA</div><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([id,label,icon])=><button key={id} className={page===id?"nav-item active":"nav-item"} onClick={()=>{setPage(id);setMobileNav(false);}}><Icon name={icon}/>{label}{id==="assistant"&&<span className="nav-new">NEW</span>}</button>)}</nav><div className="sidebar-bottom"><div className="side-tip"><div className="tip-icon">✦</div><b>Make today count.</b><p>Your ideas deserve a place to grow.</p></div><div className="profile"><div className="avatar">{user.name?.slice(0,1).toUpperCase()}</div><div className="profile-info"><b>{user.name}</b><span>{user.role==="admin"?"Administrator":"Personal workspace"}</span></div><button className="icon-btn" title="Sign out" onClick={logout}><Icon name="logout"/></button></div></div></aside>
    {mobileNav&&<button className="scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-btn" onClick={()=>setMobileNav(!mobileNav)}><Icon name="menu"/></button><div className="crumb">Workspace <span>/</span> <b>{page==="overview"?"Overview":page==="assistant"?"AI Assistant":page==="notes"?"My Notes":"Admin"}</b></div><div className="top-actions"><span className="status-dot"/> All systems normal <div className="top-avatar">{user.name?.slice(0,1).toUpperCase()}</div></div></header>
    <div className="content">
      {error&&<div className="alert dismiss-alert">{error}<button onClick={()=>setError("")}>×</button></div>}
      {page==="overview"&&<><div className="welcome-row"><div><span className="eyebrow">YOUR SPACE, YOUR PACE</span><h1>Good to see you, {user.name.split(" ")[0]}<span className="wave">✦</span></h1><p className="muted">A little progress each day adds up to big things.</p></div><div className="date-chip">{new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}</div></div><section className="hero-card"><div className="hero-glow"/><div className="hero-content"><span className="hero-tag"><span/> YOUR PERSONAL HQ</span><h2>Ideas become things<br/>when you <em>make room.</em></h2><p>Think clearly. Create freely. Keep your momentum.</p><button className="light-btn" onClick={()=>setPage("assistant")}>Explore AI assistant <Icon name="arrow"/></button></div><div className="hero-art"><div className="glass-orb orb-one"/><div className="glass-orb orb-two"/><div className="hero-star">✳</div><div className="hero-ring"/></div></section><div className="section-heading"><div><span className="eyebrow">GET THINGS DONE</span><h2>Your workspace</h2></div><span className="muted small">Everything in one place</span></div><div className="feature-grid"><button className="feature-card" onClick={()=>setPage("assistant")}><div className="feature-icon purple"><Icon name="spark"/></div><div className="feature-arrow">↗</div><h3>AI Assistant</h3><p>Explore ideas, ask questions and get unstuck with your AI companion.</p><span className="feature-link">Start a conversation <Icon name="arrow"/></span></button><button className="feature-card" onClick={()=>setPage("notes")}><div className="feature-icon blue"><Icon name="note"/></div><div className="feature-arrow">↗</div><h3>My Notes</h3><p>Capture thoughts, save important details and keep your ideas close.</p><span className="feature-link">Open your notes <Icon name="arrow"/></span></button><button className="feature-card" onClick={()=>setPage("notes")}><div className="feature-icon mint"><Icon name="grid"/></div><div className="feature-arrow">↗</div><h3>Saved space</h3><p>{notes.length} {notes.length===1?"note":"notes"} saved in your personal workspace.</p><span className="feature-link">View saved items <Icon name="arrow"/></span></button></div>{user.role==="admin"&&<button className="admin-shortcut" onClick={loadAdmin}><Icon name="users"/> Open administrator dashboard <Icon name="arrow"/></button>}</>}
      {page==="notes"&&<><div className="page-heading"><span className="eyebrow">YOUR PERSONAL LIBRARY</span><h1>My Notes</h1><p className="muted">A home for the thoughts worth keeping.</p></div><div className="notes-layout"><form className="note-editor panel" onSubmit={saveNote}><span className="eyebrow">{editing?"EDIT NOTE":"QUICK CAPTURE"}</span><h3>{editing?"Update your note":"Create a note"}</h3><input required maxLength="160" placeholder="Give your note a title" value={note.title} onChange={e=>setNote({...note,title:e.target.value})}/><textarea placeholder="Start writing..." rows="7" value={note.body} onChange={e=>setNote({...note,body:e.target.value})}/><div className="editor-actions"><button className="primary" type="submit"><Icon name="plus"/> {editing?"Save changes":"Save note"}</button>{editing&&<button type="button" className="text-btn" onClick={()=>{setEditing(null);setNote({title:"",body:""});}}>Cancel</button>}</div></form><div className="notes-list">{notes.length===0?<div className="empty-state"><div className="empty-icon"><Icon name="note"/></div><h3>Your page is still blank.</h3><p>Create your first note and it will live here.</p></div>:notes.map(n=><article className="saved-note panel" key={n.id}><div className="note-top"><span className="note-date">{new Date(n.updated_at).toLocaleDateString()}</span><button className="icon-btn danger" onClick={()=>deleteNote(n.id)} title="Delete note"><Icon name="trash"/></button></div><h3>{n.title}</h3><p>{n.body||"No additional details."}</p><button className="text-btn" onClick={()=>{setEditing(n.id);setNote({title:n.title,body:n.body});window.scrollTo({top:0,behavior:"smooth"});}}>Edit note ↗</button></article>)}</div></div></>}
      {page==="assistant"&&<><div className="page-heading"><span className="eyebrow">THINK OUT LOUD</span><h1>AI Assistant</h1><p className="muted">A thoughtful companion for your next big idea.</p></div><div className="chat-panel panel"><div className="chat-top"><div className="ai-badge"><Icon name="spark"/></div><div><b>Nexora Intelligence</b><span><i/> Ready when you are</span></div><span className="powered">AI POWERED</span></div><div className="chat-messages">{messages.length===0&&<div className="chat-welcome"><div className="welcome-spark">✳</div><h2>What’s on your mind?</h2><p>Ask a question, explore an idea or start something new.</p><div className="prompt-chips">{["Help me plan my week","Explain a difficult idea","Brainstorm a new project"].map(x=><button key={x} onClick={()=>setMessage(x)}>{x} ↗</button>)}</div></div>}{messages.map((m,i)=><div className={`chat-message ${m.role}`} key={i}><div className="message-avatar">{m.role==="assistant"?"✳":user.name[0].toUpperCase()}</div><div className="message-bubble">{m.text}</div></div>)}{busy&&<div className="chat-message assistant"><div className="message-avatar">✳</div><div className="message-bubble typing"><i/><i/><i/></div></div>}</div><form className="chat-input" onSubmit={sendAI}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask Nexora anything..." /><button className="send-btn" disabled={busy||!message.trim()}><Icon name="send"/></button></form><div className="chat-disclaimer">AI can make mistakes. Check important information.</div></div></>}
      {page==="admin"&&<><div className="page-heading"><span className="eyebrow">CONTROL CENTRE</span><h1>Admin dashboard</h1><p className="muted">A live overview of your Nexora platform.</p></div>{admin&&<><div className="stats-grid">{[["Total users",admin.stats.users,"users"],["Saved notes",admin.stats.notes,"note"],["AI conversations",admin.stats.chats,"spark"]].map(([label,value,ic])=><div className="stat-card panel" key={label}><div className="stat-icon"><Icon name={ic}/></div><span>{label}</span><strong>{value}</strong><small>All time</small></div>)}</div><div className="panel users-panel"><div className="section-heading"><div><span className="eyebrow">COMMUNITY</span><h2>Recent members</h2></div></div><div className="user-table"><div className="user-row user-head"><span>MEMBER</span><span>ROLE</span><span>JOINED</span></div>{admin.latestUsers.map(u=><div className="user-row" key={u.id}><span className="member-cell"><i>{u.name[0]}</i><span><b>{u.name}</b><small>{u.email}</small></span></span><span className="role-pill">{u.role}</span><span>{new Date(u.created_at).toLocaleDateString()}</span></div>)}</div></div></>}</>}
    </div><footer className="footer"><span>© 2026 NEXORA</span><span>Built for what's next <b>✦</b></span></footer></main>
  </div>;
}
