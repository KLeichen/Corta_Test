# Estado original de Corta

Este documento describe la carpeta `corta/` tal como se recibió, antes de cualquier cambio — el punto de partida que menciona `mission.md`. Se reconstruye a partir de los primeros dos commits del repo (`59105da` "Initial commit" y `49405c6` "Add files via upload", que solo agrega `mission.md`), no de memoria.

## Estructura recibida

16 archivos fuera de `node_modules/` (que traía 2413 archivos ya instalados, comprometidos en el repo):

```
index_v2_FINAL.js
links.json
links_backup_marzo.json
notas.txt
package-lock.json
package.json
public/estilos.css
public/estilos_viejos.css
public/index.html
public/logo (1).png
public/stats.html
server.js
server_OLD.js
test.js
utils.js
```

No había `README`, `.gitignore` ni ningún tipo de test automatizado.

## `package.json` original

```json
{
  "name": "corta",
  "version": "1.0.0",
  "description": "acortador de urls interno",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "express": "^4.19.2",
    "lodash": "^4.17.21",
    "moment": "^2.30.1"
  }
}
```

Solo `express` estaba realmente en uso por `server.js`. `axios` la usaba `test.js` (script manual). `lodash` y `moment` no las importaba nada.

## Archivos duplicados / muertos

- **`server_OLD.js`** — versión vieja, con el comentario `// VERSION VIEJA - no usar (dejo por las dudas)`. Ruta `POST /acortar` (no `/api/links`), sin manejo de "url faltante" ni de "código inexistente" (`link.url` explota si `link` es `undefined`).
- **`index_v2_FINAL.js`** — casi idéntico a `server.js`, pero sin el campo `creado` y sin la validación de "falta la url". No estaba wireado en `package.json` (`main`/`start` apuntaban a `server.js`).
- **`links_backup_marzo.json`** — backup suelto de `links.json`, ningún archivo lo leía.
- **`test.js`** — smoke-test manual (`node test.js` con el server ya levantado), no una suite automatizada.
- **`public/estilos_viejos.css`** — no lo referenciaba ningún HTML.
- **`public/logo (1).png`** — nombre de archivo de descarga sin limpiar.

## El secreto en `notas.txt`

`notas.txt` traía una credencial de base de datos en texto plano. No se reproduce su contenido en este documento ni en ningún otro lugar del repo — se trata como algo a rotar, nunca a versionar.

## `links.json` original

8 links de ejemplo, entre 3 y 156 clicks, con `creado` entre marzo y mayo de 2026 (`a3k`, `9fz`, `qq1`, `m2m`, `x0p`, `7hh`, `k8s`, `pz4`). Contenido íntegro disponible en el propio `links.json` y en el historial de git.

## Bugs de comportamiento detectados en `server.js` (el canónico)

Relevados leyendo el código heredado, antes de tocar nada — el detalle completo de cada uno está en [`SPEC.md`](./SPEC.md):

1. `GET /:codigo` no hacía un redirect HTTP real: devolvía `200` con la URL de destino como texto plano en el body.
2. El incremento de `clicks` se hacía solo en memoria — nunca se llamaba a `guardarLinks()`, así que los clicks nunca se persistían.
3. `POST /api/links` no validaba el formato de la URL, solo que no estuviera vacía.
4. `generarCodigo()` no chequeaba colisiones contra `links.json`: dos links podían terminar con el mismo código de 3 caracteres, pisándose.
5. `public/stats.html` era pura maqueta, con datos hardcodeados, sin ningún endpoint que consultar (`GET /api/links/:codigo/stats` no existía).

Todo esto ya está corregido (Milestones 3 y 4) y cubierto por la batería de tests en `tests/`.
