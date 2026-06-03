const express = require('express');
const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');

const app = express();
const db = new Database('links.db');
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'changeme';

db.exec(`CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`);

app.use(express.json());

// Shorten a URL
app.post('/shorten', (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const id = nanoid(6);
  db.prepare('INSERT INTO links (id, url) VALUES (?, ?)').run(id, url);
  res.json({ short: `${BASE_URL}/${id}` });
});

// List all links
app.get('/links', (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.prepare('SELECT * FROM links ORDER BY created_at DESC').all());
});

// Redirect
app.get('/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).send('Not found');
  db.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?').run(req.params.id);
  res.redirect(link.url);
});

app.listen(PORT, () => console.log(`Running on ${BASE_URL}`));
