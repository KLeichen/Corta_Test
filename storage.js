const fs = require('fs');
const path = require('path');

function getDbFile() {
  return process.env.LINKS_DB_FILE || path.join(__dirname, 'links.json');
}

// si hay DATABASE_URL usamos Postgres (produccion); si no, el links.json de siempre (local/tests)
const pool = process.env.DATABASE_URL
  ? new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL })
  : null;

async function init() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      codigo TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      creado TIMESTAMPTZ NOT NULL
    )
  `);
}

function leerLinksSync() {
  return JSON.parse(fs.readFileSync(getDbFile(), 'utf8'));
}

function guardarLinksSync(links) {
  fs.writeFileSync(getDbFile(), JSON.stringify(links, null, 2));
}

function filaALink(fila) {
  return { codigo: fila.codigo, url: fila.url, clicks: fila.clicks, creado: fila.creado.toISOString() };
}

async function leerLinks() {
  if (!pool) return leerLinksSync();
  const { rows } = await pool.query('SELECT codigo, url, clicks, creado FROM links');
  return rows.map(filaALink);
}

async function buscarLink(codigo) {
  if (!pool) return leerLinksSync().find((l) => l.codigo === codigo) || null;
  const { rows } = await pool.query('SELECT codigo, url, clicks, creado FROM links WHERE codigo = $1', [codigo]);
  return rows[0] ? filaALink(rows[0]) : null;
}

async function crearLink(link) {
  if (!pool) {
    const links = leerLinksSync();
    links.push(link);
    guardarLinksSync(links);
    return;
  }
  await pool.query(
    'INSERT INTO links (codigo, url, clicks, creado) VALUES ($1, $2, $3, $4)',
    [link.codigo, link.url, link.clicks, link.creado]
  );
}

async function incrementarClicks(codigo) {
  if (!pool) {
    const links = leerLinksSync();
    const link = links.find((l) => l.codigo === codigo);
    if (!link) return null;
    link.clicks += 1;
    guardarLinksSync(links);
    return link;
  }
  const { rows } = await pool.query(
    'UPDATE links SET clicks = clicks + 1 WHERE codigo = $1 RETURNING codigo, url, clicks, creado',
    [codigo]
  );
  return rows[0] ? filaALink(rows[0]) : null;
}

module.exports = { init, leerLinks, buscarLink, crearLink, incrementarClicks };
