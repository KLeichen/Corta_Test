const express = require('express');
const fs = require('fs');
const path = require('path');
const { generarCodigoUnico } = require('./utils');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DB_FILE = process.env.LINKS_DB_FILE || path.join(__dirname, 'links.json');

function leerLinks() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function guardarLinks(links) {
  fs.writeFileSync(DB_FILE, JSON.stringify(links, null, 2));
}

function esUrlValida(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// crear un link corto
app.post('/api/links', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Falta la url' });
  }
  if (!esUrlValida(url)) {
    return res.status(400).json({ error: 'URL inválida' });
  }
  const links = leerLinks();
  const codigo = generarCodigoUnico(links.map(function (l) { return l.codigo; }));
  const nuevo = {
    codigo: codigo,
    url: url,
    clicks: 0,
    creado: new Date().toISOString()
  };
  links.push(nuevo);
  guardarLinks(links);
  res.json({ codigo: codigo, corta: '/' + codigo });
});

// redirigir al destino
app.get('/:codigo', (req, res) => {
  const links = leerLinks();
  const link = links.find(function (l) { return l.codigo === req.params.codigo; });
  if (!link) {
    return res.status(404).send('No existe ese link');
  }
  link.clicks = link.clicks + 1;
  guardarLinks(links);
  res.redirect(link.url);
});

if (require.main === module) {
  app.listen(3000, function () {
    console.log('Corta escuchando en http://localhost:3000');
  });
}

module.exports = app;
