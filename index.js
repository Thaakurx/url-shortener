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
app.use(express.urlencoded({ extended: false }));

// Homepage
app.get('/', (req, res) => {
  const links = db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
  const rows = links.map(l => `
    <tr>
      <td><a href="/${l.id}" target="_blank">${BASE_URL}/${l.id}</a></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.url}</td>
      <td>${l.clicks}</td>
      <td>${l.created_at}</td>
    </tr>`).join('');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>URL Shortener</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    input[type=text] { width: 60%; padding: 8px; font-size: 14px; }
    button { padding: 8px 16px; font-size: 14px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 13px; }
    #result { margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <h2>URL Shortener</h2>
  <form method="POST" action="/shorten-form">
    <input type="text" name="url" placeholder="https://example.com" required />
    <button type="submit">Shorten</button>
  </form>
  <div id="result"></div>
  <table>
    <thead><tr><th>Short URL</th><th>Original</th><th>Clicks</th><th>Created</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
});

// Form submit (no API key needed from browser)
app.post('/shorten-form', (req, res) => {
  const { url } = req.body;
  if (!url) return res.redirect('/');
  const id = nanoid(6);
  db.prepare('INSERT INTO links (id, url) VALUES (?, ?)').run(id, url);
  res.redirect('/');
});

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
