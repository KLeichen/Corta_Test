const test = require('node:test');
const assert = require('node:assert/strict');
const { levantarServer } = require('./helpers');

function seedLink(overrides = {}) {
  return {
    codigo: 'm2m',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    clicks: 156,
    creado: '2026-03-12T11:45:00.000Z',
    ...overrides
  };
}

test('GET /api/links/:codigo/stats con codigo existente devuelve clicks, url y creado', async (t) => {
  const link = seedLink();
  const srv = await levantarServer([link]);
  t.after(() => srv.cerrar());

  const res = await fetch(`${srv.baseUrl}/api/links/${link.codigo}/stats`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.codigo, link.codigo);
  assert.equal(body.url, link.url);
  assert.equal(body.clicks, link.clicks);
  assert.equal(body.creado, link.creado);
});

test('GET /api/links/:codigo/stats con codigo inexistente devuelve 404', async (t) => {
  const srv = await levantarServer([]);
  t.after(() => srv.cerrar());

  const res = await fetch(`${srv.baseUrl}/api/links/zzz/stats`);
  assert.equal(res.status, 404);
});

test('GET /api/links/:codigo/stats no incrementa clicks (es de solo lectura)', async (t) => {
  const link = seedLink({ clicks: 10 });
  const srv = await levantarServer([link]);
  t.after(() => srv.cerrar());

  await fetch(`${srv.baseUrl}/api/links/${link.codigo}/stats`);
  await fetch(`${srv.baseUrl}/api/links/${link.codigo}/stats`);

  const db = srv.leerDb();
  assert.equal(db.find((l) => l.codigo === link.codigo).clicks, 10);
});

test('stats refleja una visita real hecha via GET /:codigo', async (t) => {
  const link = seedLink({ clicks: 0 });
  const srv = await levantarServer([link]);
  t.after(() => srv.cerrar());

  await fetch(`${srv.baseUrl}/${link.codigo}`, { redirect: 'manual' });

  const res = await fetch(`${srv.baseUrl}/api/links/${link.codigo}/stats`);
  const body = await res.json();
  assert.equal(body.clicks, 1);
});
