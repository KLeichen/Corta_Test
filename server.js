const express = require('express');
const storage = require('./storage');
const { generarCodigoUnico } = require('./utils');

const app = express();
app.use(express.json());
app.use(express.static('public'));

function esUrlValida(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Express 4 no atrapa rechazos de promesas en handlers async: sin esto,
// un error de storage (ej. Postgres caido) deja el request colgado para siempre.
function asyncRoute(fn) {
  return function (req, res, next) {
    fn(req, res, next).catch(next);
  };
}

// crear un link corto
app.post('/api/links', asyncRoute(async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Falta la url' });
  }
  if (!esUrlValida(url)) {
    return res.status(400).json({ error: 'URL inválida' });
  }
  const links = await storage.leerLinks();
  const codigo = generarCodigoUnico(links.map(function (l) { return l.codigo; }));
  const nuevo = {
    codigo: codigo,
    url: url,
    clicks: 0,
    creado: new Date().toISOString()
  };
  await storage.crearLink(nuevo);
  res.json({ codigo: codigo, corta: '/' + codigo });
}));

// estadisticas de un link (no cuenta como visita)
app.get('/api/links/:codigo/stats', asyncRoute(async (req, res) => {
  const link = await storage.buscarLink(req.params.codigo);
  if (!link) {
    return res.status(404).json({ error: 'No existe ese link' });
  }
  res.json(link);
}));

// redirigir al destino
app.get('/:codigo', asyncRoute(async (req, res) => {
  const link = await storage.buscarLink(req.params.codigo);
  if (!link) {
    return res.status(404).send('No existe ese link');
  }
  await storage.incrementarClicks(req.params.codigo);
  res.redirect(link.url);
}));

// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await storage.init();
  app.listen(PORT, function () {
    console.log('Corta escuchando en el puerto ' + PORT);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
