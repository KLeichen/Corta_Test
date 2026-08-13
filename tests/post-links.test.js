const test = require('node:test');
const assert = require('node:assert/strict');
const { levantarServer } = require('./helpers');

function postLink(baseUrl, body) {
  return fetch(`${baseUrl}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('POST /api/links sin url devuelve 400 "Falta la url"', async (t) => {
  const srv = await levantarServer();
  t.after(() => srv.cerrar());

  const res = await postLink(srv.baseUrl, {});
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'Falta la url' });
});

test('POST /api/links con url vacia devuelve 400', async (t) => {
  const srv = await levantarServer();
  t.after(() => srv.cerrar());

  const res = await postLink(srv.baseUrl, { url: '' });
  assert.equal(res.status, 400);
});

test('POST /api/links con url que no es string devuelve 400', async (t) => {
  const srv = await levantarServer();
  t.after(() => srv.cerrar());

  const res = await postLink(srv.baseUrl, { url: 12345 });
  assert.equal(res.status, 400);
});

test('POST /api/links con url invalida (no parseable / sin protocolo http) devuelve 400 "URL inválida"', async (t) => {
  const srv = await levantarServer();
  t.after(() => srv.cerrar());

  const res = await postLink(srv.baseUrl, { url: 'esto-no-es-una-url' });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'URL inválida' });
});

test('POST /api/links con url http(s) valida devuelve 200 con codigo y corta', async (t) => {
  const srv = await levantarServer();
  t.after(() => srv.cerrar());

  const res = await postLink(srv.baseUrl, { url: 'https://www.austral.edu.ar/ingenieria/' });
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.match(body.codigo, /^[a-z0-9]{3}$/);
  assert.equal(body.corta, '/' + body.codigo);
});

test('POST /api/links persiste el link con clicks 0 y creado reciente', async (t) => {
  const srv = await levantarServer();
  t.after(() => srv.cerrar());

  const antes = Date.now();
  const res = await postLink(srv.baseUrl, { url: 'https://www.austral.edu.ar/ingenieria/' });
  const { codigo } = await res.json();

  const db = srv.leerDb();
  const link = db.find((l) => l.codigo === codigo);
  assert.ok(link, 'el link creado tiene que estar en la db');
  assert.equal(link.url, 'https://www.austral.edu.ar/ingenieria/');
  assert.equal(link.clicks, 0);
  assert.ok(Date.parse(link.creado) >= antes);
});

test('POST /api/links nunca genera un codigo duplicado, incluso cuando casi todos los codigos posibles ya estan tomados', async (t) => {
  const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
  const todos = [];
  for (const a of ALFABETO) {
    for (const b of ALFABETO) {
      for (const c of ALFABETO) {
        todos.push(a + b + c);
      }
    }
  }
  const libre = todos[todos.length - 1];
  const ocupados = todos.slice(0, -1).map((codigo) => ({
    codigo,
    url: 'https://ocupado.example.com',
    clicks: 0,
    creado: new Date().toISOString()
  }));

  const srv = await levantarServer(ocupados);
  t.after(() => srv.cerrar());

  const res = await postLink(srv.baseUrl, { url: 'https://nuevo.example.com' });
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.codigo, libre, 'tiene que usar el unico codigo libre que queda');

  const db = srv.leerDb();
  assert.equal(db.length, todos.length);
  const codigos = db.map((l) => l.codigo);
  assert.equal(new Set(codigos).size, codigos.length, 'no puede haber codigos repetidos');
});
