const test = require('node:test');
const assert = require('node:assert/strict');
const { levantarServer } = require('./helpers');

function seedLink(overrides = {}) {
  return {
    codigo: 'a3k',
    url: 'https://www.austral.edu.ar/ingenieria/',
    clicks: 0,
    creado: new Date().toISOString(),
    ...overrides
  };
}

test('GET /:codigo con codigo existente responde 302 con Location a la url destino', async (t) => {
  const link = seedLink();
  const srv = await levantarServer([link]);
  t.after(() => srv.cerrar());

  const res = await fetch(`${srv.baseUrl}/${link.codigo}`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), link.url);
});

test('GET /:codigo incrementa clicks en 1 por visita', async (t) => {
  const link = seedLink({ clicks: 5 });
  const srv = await levantarServer([link]);
  t.after(() => srv.cerrar());

  await fetch(`${srv.baseUrl}/${link.codigo}`, { redirect: 'manual' });

  const db = srv.leerDb();
  assert.equal(db.find((l) => l.codigo === link.codigo).clicks, 6);
});

test('GET /:codigo con varias visitas acumula clicks correctamente', async (t) => {
  const link = seedLink({ clicks: 0 });
  const srv = await levantarServer([link]);
  t.after(() => srv.cerrar());

  for (let i = 0; i < 3; i++) {
    await fetch(`${srv.baseUrl}/${link.codigo}`, { redirect: 'manual' });
  }

  const db = srv.leerDb();
  assert.equal(db.find((l) => l.codigo === link.codigo).clicks, 3);
});

test('GET /:codigo con codigo inexistente responde 404', async (t) => {
  const srv = await levantarServer([]);
  t.after(() => srv.cerrar());

  const res = await fetch(`${srv.baseUrl}/zzz`, { redirect: 'manual' });
  assert.equal(res.status, 404);
});

test('GET /:codigo con codigo inexistente no modifica la db', async (t) => {
  const srv = await levantarServer([]);
  t.after(() => srv.cerrar());

  await fetch(`${srv.baseUrl}/zzz`, { redirect: 'manual' });

  assert.deepEqual(srv.leerDb(), []);
});
