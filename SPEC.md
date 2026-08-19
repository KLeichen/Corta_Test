# SPEC: Corta

Especificación del comportamiento esperado del acortador de URLs interno. Se escribe temprano, a partir de lo relevado del proyecto heredado, y se actualiza a medida que cambia el entendimiento (nuevos bugs encontrados, decisiones tomadas, milestones completados).

Última actualización: Milestone 5 completado (producción en Railway). El comportamiento descripto abajo es el actual — los bugs que originalmente motivaron este spec (Milestone 3 y 4) ya están corregidos e implementados; se dejan documentados como "bug corregido" para que quede registro de qué cambió.

## Resumen

Corta es un acortador de URLs interno. Un usuario pega una URL larga, recibe un código corto de 3 caracteres, y visitar `/:codigo` lo lleva al destino original. Se registra cuántas veces se usó cada link.

## Modelo de datos

Persistencia vía `storage.js`, que abstrae dos backends según `DATABASE_URL`:

- **Sin `DATABASE_URL`** (local/tests): `links.json` en la raíz del repo, un array de objetos, leído/escrito sync con `fs.readFileSync`/`writeFileSync`.
- **Con `DATABASE_URL`** (producción, Railway): tabla `links` en Postgres, mismas columnas. Es lo que permite que los links y sus clicks sobrevivan a un redeploy (el filesystem del contenedor no persiste, la base sí).

Forma del registro (misma en ambos backends):

```json
{
  "codigo": "a3k",      // string, 3 caracteres [a-z0-9]
  "url": "https://...", // string, URL de destino
  "clicks": 0,           // number, entero >= 0
  "creado": "2026-03-02T14:11:09.000Z" // string, ISO 8601, UTC
}
```

`codigo` es único (ver "Generación de códigos y colisiones" más abajo).

## Endpoints

### `POST /api/links`

Crea un link corto.

**Request body:** `{ "url": "<string>" }`

**Casos:**

| Caso | Status | Respuesta |
|---|---|---|
| `url` ausente, vacío, o no-string | 400 | `{ "error": "Falta la url" }` |
| `url` presente pero no es una URL válida (no parseable, sin protocolo `http`/`https`) | 400 | `{ "error": "URL inválida" }` |
| `url` válida | 200 | `{ "codigo": "<3 chars>", "corta": "/<codigo>" }` |

Al crear el link se persiste con `clicks: 0` y `creado` seteado al momento de creación (UTC, ISO 8601).

La validación de URL (`esUrlValida` en `server.js`) exige que sea parseable con `new URL()` y que el protocolo sea `http:` o `https:`. Un string como `"hola"` ya devuelve 400.

### `GET /:codigo`

Redirige al destino del link corto.

**Casos:**

| Caso | Status | Respuesta |
|---|---|---|
| `codigo` existe | **302**, header `Location: <url>` | redirect real del navegador |
| `codigo` no existe | 404 | `No existe ese link` (texto plano) |

Cada visita exitosa (código encontrado) incrementa `clicks` en 1 y persiste el cambio antes de responder con el redirect.

**Bug corregido (Milestone 3):** antes el servidor respondía `200` con la URL de destino como texto plano (`res.send(link.url)`) en vez de redirigir — el navegador se quedaba en `/:codigo` mostrando texto. Ahora usa `res.redirect(link.url)`, que emite el `302` real.

### `GET /api/links/:codigo/stats`

Devuelve las estadísticas de un link, sin modificarlo.

**Casos:**

| Caso | Status | Respuesta |
|---|---|---|
| `codigo` existe | 200 | `{ "codigo", "url", "clicks", "creado" }` |
| `codigo` no existe | 404 | `{ "error": "No existe ese link" }` |

**Importante:** consultar las estadísticas **no** incrementa `clicks`. Solo `GET /:codigo` (la redirección real) cuenta como una visita. Esto es lo que hace que "las estadísticas digan la verdad" (ver sección dedicada).

`public/stats.html` (Milestone 4) llama a este endpoint y muestra clicks, URL original y fecha de creación reales — ya no hay datos hardcodeados.

## Generación de códigos y colisiones

`utils.js` genera códigos de 3 caracteres tomados al azar de `[a-z0-9]` (36 caracteres → 46,656 combinaciones posibles). Con `links.json` creciendo, la probabilidad de colisión no es despreciable (cumpleaños: con unos cientos de links ya es significativa).

Al generar un código nuevo, `generarCodigoUnico()` (`utils.js`) verifica contra los códigos existentes y regenera si ya está en uso, hasta encontrar uno libre. Nunca se pisa un link existente ni se crea un duplicado.

**Bug corregido (Milestone 3):** antes `generarCodigo()` no chequeaba contra los links existentes; si generaba un código repetido, `POST /api/links` agregaba una segunda entrada con el mismo `codigo`, y como `GET /:codigo` usaba `.find()` (primer match), el segundo link quedaba inaccesible silenciosamente. Ahora `generarCodigoUnico()` recibe la lista de códigos ya usados y regenera hasta obtener uno libre — "nada malo, lo arreglamos".

## Qué significa "las estadísticas dicen la verdad"

- `clicks` de un link refleja exactamente la cantidad de veces que se resolvió `GET /:codigo` para ese código — ni más, ni menos.
- Consultar estadísticas (`GET /api/links/:codigo/stats`) es una operación de solo lectura: no incrementa `clicks`.
- Cada visita a un `codigo` válido cuenta exactamente una vez. Escrituras concurrentes (dos requests casi simultáneos al mismo código) no deben pisarse ni perder un click.
  - **En Postgres** (producción): `incrementarClicks` hace `UPDATE links SET clicks = clicks + 1 WHERE codigo = $1`, que es atómico a nivel fila — dos requests concurrentes no se pisan.
  - **En `links.json`** (local/tests): sigue sin lock (`fs.readFileSync`/`writeFileSync` completos por request), así que dos requests concurrentes pueden leer el mismo estado viejo y el segundo `writeFileSync` pisa el incremento del primero (click perdido). Limitación conocida y aceptada del modo archivo — no afecta producción, que usa Postgres.
- Un `codigo` inexistente nunca debe aparecer en las estadísticas como si tuviera actividad (404, no un objeto con `clicks: 0` inventado).

## Fuera de alcance de este spec

`index_v2_FINAL.js`, `server_OLD.js`, `links_backup_marzo.json`, `notas.txt`, `test.js` y `public/estilos_viejos.css` eran archivos muertos/duplicados del proyecto heredado (versiones viejas del server, un backup suelto, una credencial en texto plano, un smoke-test manual redundante con la batería TDD, y CSS sin referenciar). Milestone 2 los sacó del repo — no forman parte del comportamiento especificado.

## Decisiones abiertas / a confirmar

- **Formato exacto de validación de URL** en `POST /api/links`: por ahora, "parseable con `new URL()` y protocolo `http:`/`https:`". A confirmar si se necesita algo más laxo o más estricto.
- **Longitud/alfabeto del código corto**: se mantiene en 3 caracteres `[a-z0-9]` (comportamiento heredado). Si el volumen de links crece, revisar si alcanza.
- **Manejo de la concurrencia en el archivo JSON**: sin lock, limitación aceptada del modo local/tests (ver arriba). Producción usa Postgres y no tiene este problema.
