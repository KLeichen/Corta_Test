# Corta

Corta es el acortador de URLs interno de la empresa. Un empleado pega una URL larga, recibe un código corto de 3 caracteres, y ese código lo redirige al destino original. Cada link lleva la cuenta de cuántas veces se usó, y el navegador guarda un historial de los links que fuiste creando.

<p align="center">
  <img src="docs/screenshots/inicio.png" alt="Pantalla principal de Corta: panel para acortar un link junto al historial de links creados en este navegador" width="680">
</p>

**En producción:** https://corta-production-2bad.up.railway.app

## Demo

Flujo completo grabado sobre el deploy real en producción: acortar un link, ver cómo aparece en el historial, entrar al link corto (redirect real), y confirmar el click en la pantalla de estadísticas — cerrando con la vista mobile.

<p align="center">
  <img src="docs/corta-demo.gif" alt="Demo animado: se acorta un link, aparece en el historial, se visita el link corto, se confirma el click en estadísticas, y se muestra la vista mobile" width="700">
</p>

## De dónde viene este proyecto

El desarrollador original de Corta se fue de la empresa sin dejar documentación. Lo único que entregó fue una carpeta de código: archivos duplicados, versiones viejas dando vueltas, dependencias sin usar, una nota con una credencial en texto plano, y una app que "más o menos andaba" pero con errores conocidos por los usuarios (el link corto no redirigía de verdad, los clicks no se guardaban, dos links podían terminar compartiendo el mismo código y pisarse) y una funcionalidad a medio terminar (la página de estadísticas).

Este repo documenta ese proceso completo: desde el desorden inicial (primer commit) hasta una versión en producción, con [`SPEC.md`](./SPEC.md) escrito a partir de lo que se fue descubriendo del comportamiento esperado, y una batería de tests que corre en rojo antes de cada fix y en verde después.

## Cómo usarlo

### 1. Acortar un link

Pegás una URL, apretás "Acortar", y te devuelve un link corto para compartir (con botón para copiarlo). El link nuevo aparece al toque en el historial de al lado.

<p align="center">
  <img src="docs/screenshots/link-generado.png" alt="Corta mostrando el link corto generado, con botón para copiarlo, y el historial actualizado con los links creados" width="680">
</p>

### 2. Historial de links (por navegador)

Cada link que acortás queda guardado en el `localStorage` de tu navegador — no en el servidor, así que es privado a tu sesión y no requiere login. Desde cada item del historial podés abrir el link corto o ir directo a sus estadísticas con el botón "Stats". Hay un botón "Borrar" para vaciarlo cuando quieras.

### 3. Visitar el link corto

Entrar a `/:codigo` hace un redirect real (302) al destino original — no es una pantalla intermedia, el navegador navega directo — y ese acceso queda contado.

### 4. Ver estadísticas

Desde la página principal, "Ver estadísticas" lleva a una pantalla donde, poniendo el código de 3 caracteres, se consultan sus clicks, la URL de destino y la fecha de creación. Si venís de un link del historial, el código ya llega precargado y la búsqueda se dispara sola (`stats.html?codigo=xxx`).

<p align="center">
  <img src="docs/screenshots/estadisticas.png" alt="Pantalla de estadísticas mostrando clicks, URL original y fecha de creación de un link" width="420">
</p>

Si el código no existe, se muestra un mensaje en vez de romper la pantalla:

<p align="center">
  <img src="docs/screenshots/estadisticas-error.png" alt="Pantalla de estadísticas mostrando el mensaje 'No existe ese link' para un código inválido" width="420">
</p>

### 5. Responsive

El layout de dos columnas (panel principal + historial) pasa a una sola columna apilada en pantallas chicas — probado en un viewport de celular real:

<p align="center">
  <img src="docs/screenshots/mobile.png" alt="Corta en un viewport de celular: el panel de acortar y el historial apilados en una sola columna" width="320">
</p>

## Cómo correrlo

```bash
npm install
npm start
```

El server queda escuchando en `http://localhost:3000`.

## Cómo correr los tests

```bash
npm test
```

Corre la batería de tests (`node --test`) contra una base de datos temporal y aislada — no toca `links.json`.

## Arquitectura

- **Server**: Express (`server.js`). Un único proceso, sin capas ni framework extra.
- **Storage**: `storage.js` usa Postgres cuando hay `DATABASE_URL` seteada (producción); si no, cae a `links.json` en la raíz del repo, leído y escrito entero en cada request (local y tests). Así los links y clicks sobreviven a un redeploy en producción sin necesitar una base real para desarrollar.
- **Frontend**: HTML/CSS/JS plano en `public/`, servido como estático por Express. Sin build step ni framework. El historial de links vive enteramente en el navegador (`localStorage`), no toca el backend.
- **Generación de códigos**: `utils.js` arma códigos de 3 caracteres `[a-z0-9]` y reintenta hasta encontrar uno que no esté en uso, para que dos links nunca puedan pisarse.

### Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/links` | Crea un link corto a partir de `{ url }`. Valida que sea una URL http(s) válida. |
| `GET` | `/:codigo` | Redirige (302) al destino del código, e incrementa su contador de clicks. |
| `GET` | `/api/links/:codigo/stats` | Devuelve `{ codigo, url, clicks, creado }` de un link, sin modificarlo. |

El comportamiento esperado de cada endpoint, con sus casos borde, está detallado en [`SPEC.md`](./SPEC.md).

## Limitaciones conocidas

- **`links.json` sin locking**: en el modo local/tests (sin `DATABASE_URL`), el archivo se lee y escribe entero por request sin locking — dos escrituras concurrentes pueden pisarse entre sí. En producción esto no aplica porque se usa Postgres.
- **Alfabeto de 3 caracteres**: 46.656 combinaciones posibles. Si el volumen de links crece mucho, va a hacer falta ampliar el código.

## Tests

El proyecto sigue TDD: los tests en `tests/` se derivan de `SPEC.md` y se escriben antes de cada corrección. Cubren validación de `url`, el redirect real, la persistencia de clicks, la resolución de colisiones de código, y el endpoint de estadísticas.
