const fs = require('fs');
const os = require('os');
const path = require('path');

// Levanta una instancia del server sobre una DB temporal y aislada,
// para que los tests no toquen el links.json real ni se pisen entre si.
async function levantarServer(seedLinks = []) {
  const archivo = path.join(
    os.tmpdir(),
    `corta-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  fs.writeFileSync(archivo, JSON.stringify(seedLinks, null, 2));

  process.env.LINKS_DB_FILE = archivo;
  delete require.cache[require.resolve('../server')];
  const app = require('../server');

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://localhost:${port}`,
    leerDb() {
      return JSON.parse(fs.readFileSync(archivo, 'utf8'));
    },
    async cerrar() {
      await new Promise((resolve) => server.close(resolve));
      fs.unlinkSync(archivo);
      delete process.env.LINKS_DB_FILE;
    }
  };
}

module.exports = { levantarServer };
