const express = require('express');
const fs = require('fs');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'changeme';
const DB_FILE = process.env.DB_FILE || 'links.json';

function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return []; }
}
function save(links) {
  fs.writeFileSync(DB_FILE, JSON.stringify(links, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Homepage
app.get('/', (req, res) => {
  const links = load();
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
  </style>
</head>
<body>
  <h2>URL Shortener</h2>
  <form method="POST" action="/shorten-form">
    <input type="text" name="url" placeholder="https://example.com" required />
    <button type="submit">Shorten</button>
  </form>
  <table>
    <thead><tr><th>Short URL</th><th>Original</th><th>Clicks</th><th>Created</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
});

// Form submit
app.post('/shorten-form', (req, res) => {
  const { url } = req.body;
  if (!url) return res.redirect('/');
  const links = load();
  links.unshift({ id: nanoid(6), url, clicks: 0, created_at: new Date().toISOString() });
  save(links);
  res.redirect('/');
});

// API: shorten
app.post('/shorten', (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  const links = load();
  const id = nanoid(6);
  links.unshift({ id, url, clicks: 0, created_at: new Date().toISOString() });
  save(links);
  res.json({ short: `${BASE_URL}/${id}` });
});

// API: list
app.get('/links', (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  res.json(load());
});

// Redirect
app.get('/:id', (req, res) => {
  const links = load();
  const link = links.find(l => l.id === req.params.id);
  if (!link) return res.status(404).send('Not found');
  link.clicks++;
  save(links);
  res.redirect(link.url);
});

app.listen(PORT, () => console.log(`Running on ${BASE_URL}`));
