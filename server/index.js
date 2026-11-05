import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { pool, initDb } from "./db.js";
import { makeToken, requireAuth, requireAdmin } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 10000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Nexora" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 80);
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8)
      return res.status(400).json({ error: "Enter a name, valid email and password of at least 8 characters." });
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rowCount) return res.status(409).json({ error: "An account with that email already exists." });
    const hash = await bcrypt.hash(password, 12);
    const role = process.env.ADMIN_EMAIL?.toLowerCase() === email ? "admin" : "user";
    const result = await pool.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,created_at",
      [name, email, hash, role]
    );
    const user = result.rows[0];
    res.status(201).json({ token: makeToken(user), user });
  } catch (e) {
    console.error("register:", e);
    res.status(500).json({ error: "Could not create account. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: "Email or password is incorrect." });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ token: makeToken(safeUser), user: safeUser });
  } catch (e) {
    console.error("login:", e);
    res.status(500).json({ error: "Unable to log in right now." });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  const r = await pool.query("SELECT id,name,email,role,created_at FROM users WHERE id=$1", [req.user.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Account not found." });
  res.json({ user: r.rows[0] });
});

app.get("/api/notes", requireAuth, async (req, res) => {
  const r = await pool.query("SELECT id,title,body,created_at,updated_at FROM notes WHERE user_id=$1 ORDER BY updated_at DESC", [req.user.id]);
  res.json({ notes: r.rows });
});
app.post("/api/notes", requireAuth, async (req, res) => {
  const title = String(req.body.title || "").trim().slice(0,160);
  const body = String(req.body.body || "").slice(0,20000);
  if (!title) return res.status(400).json({ error: "A note title is required." });
  const r = await pool.query("INSERT INTO notes(user_id,title,body) VALUES($1,$2,$3) RETURNING id,title,body,created_at,updated_at", [req.user.id,title,body]);
  res.status(201).json({ note: r.rows[0] });
});
app.put("/api/notes/:id", requireAuth, async (req, res) => {
  const title = String(req.body.title || "").trim().slice(0,160);
  const body = String(req.body.body || "").slice(0,20000);
  const r = await pool.query("UPDATE notes SET title=$1,body=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4 RETURNING id,title,body,created_at,updated_at", [title,body,req.params.id,req.user.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Note not found." });
  res.json({ note: r.rows[0] });
});
app.delete("/api/notes/:id", requireAuth, async (req, res) => {
  const r = await pool.query("DELETE FROM notes WHERE id=$1 AND user_id=$2", [req.params.id,req.user.id]);
  if (!r.rowCount) return res.status(404).json({ error: "Note not found." });
  res.json({ ok: true });
});

app.post("/api/ai/chat", requireAuth, async (req, res) => {
  const prompt = String(req.body.message || "").trim().slice(0,6000);
  if (!prompt) return res.status(400).json({ error: "Write a message first." });
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: "AI is not configured yet. Add OPENROUTER_API_KEY in Render Environment settings." });
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://nexora.onrender.com", "X-Title": "Nexora" },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || "openrouter/free", messages: [{ role: "system", content: "You are Nexora's helpful, clear and friendly AI assistant." }, { role: "user", content: prompt }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `AI provider returned ${response.status}`);
    const answer = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    await pool.query("INSERT INTO chats(user_id,prompt,answer) VALUES($1,$2,$3)", [req.user.id,prompt,answer]);
    res.json({ answer });
  } catch (e) {
    console.error("AI:", e.message);
    res.status(502).json({ error: "The AI service could not respond. Check your API key and try again." });
  }
});

app.get("/api/admin/overview", requireAuth, requireAdmin, async (_req, res) => {
  const [users, notes, chats, latest] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM notes"),
    pool.query("SELECT COUNT(*)::int AS count FROM chats"),
    pool.query("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 12")
  ]);
  res.json({ stats: { users: users.rows[0].count, notes: notes.rows[0].count, chats: chats.rows[0].count }, latestUsers: latest.rows });
});

app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));

initDb().then(() => app.listen(PORT, () => console.log(`Nexora listening on ${PORT}`)))
  .catch(e => { console.error("Database initialization failed:", e); process.exit(1); });
