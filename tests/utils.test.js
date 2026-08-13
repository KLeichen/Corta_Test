const test = require('node:test');
const assert = require('node:assert/strict');
const { generarCodigo } = require('../utils');

test('generarCodigo devuelve un string de 3 caracteres', () => {
  const codigo = generarCodigo();
  assert.equal(typeof codigo, 'string');
  assert.equal(codigo.length, 3);
});

test('generarCodigo solo usa caracteres [a-z0-9]', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generarCodigo(), /^[a-z0-9]{3}$/);
  }
});
