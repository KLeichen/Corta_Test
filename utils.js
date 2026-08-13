const CARACTERES = 'abcdefghijklmnopqrstuvwxyz0123456789';

// genera un codigo corto de 3 caracteres
function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < 3; i++) {
    codigo += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
  }
  return codigo;
}

// genera un codigo que no este en `existentes` (evita pisar links ya creados)
function generarCodigoUnico(existentes) {
  const usados = existentes instanceof Set ? existentes : new Set(existentes);
  let codigo;
  do {
    codigo = generarCodigo();
  } while (usados.has(codigo));
  return codigo;
}

module.exports = { generarCodigo, generarCodigoUnico };
