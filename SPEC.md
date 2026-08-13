# SPEC: Corta

Especificación del comportamiento esperado del acortador de URLs interno. Se escribe temprano, a partir de lo relevado del proyecto heredado, y se actualiza a medida que cambia el entendimiento (nuevos bugs encontrados, decisiones tomadas, milestones completados).

Última actualización: Milestone 1 completado (repo trackeado). Este documento se escribe **antes** de Milestone 2 y 3, así que describe el comportamiento *esperado/correcto*, no necesariamente el actual — donde difieren, se marca explícitamente como bug conocido a corregir.

## Resumen

Corta es un acortador de URLs interno. Un usuario pega una URL larga, recibe un código corto de 3 caracteres, y visitar `/:codigo` lo lleva al destino original. Se registra cuántas veces se usó cada link.

## Modelo de datos

Persistencia: `links.json` en la raíz del repo, un array de objetos:

```json
{
  "codigo": "a3k",      // string, 3 caracteres [a-z0-9]
  "url": "https://...", // string, URL de destino
  "clicks": 0,           // number, entero >= 0
  "creado": "2026-03-02T14:11:09.000Z" // string, ISO 8601, UTC
}
```

`codigo` es único dentro del archivo (ver "Generación de códigos y colisiones" más abajo — hoy esto **no** se garantiza, es un bug conocido).

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

Al crear el link se persiste en `links.json` con `clicks: 0` y `creado` seteado al momento de creación (UTC, ISO 8601).

**Estado actual:** no valida el formato de la URL, solo que sea *truthy* — acepta strings como `"hola"` como URL válida. Esto es un bug a corregir en Milestone 3 (la validación de "URL inválida" es comportamiento esperado, no implementado todavía).

### `GET /:codigo`

Redirige al destino del link corto.

**Casos:**

| Caso | Status | Respuesta |
|---|---|---|
| `codigo` existe | **302**, header `Location: <url>` | redirect real del navegador |
| `codigo` no existe | 404 | `No existe ese link` (texto plano) |

Cada visita exitosa (código encontrado) incrementa `clicks` en 1 y persiste el cambio antes de responder.

**Estado actual (bug conocido, Milestone 3):** el servidor no emite un redirect HTTP — responde `200` con la URL de destino como texto plano en el body (`res.send(link.url)`). El navegador se queda en `/:codigo` mostrando texto, no navega. Esto rompe el criterio "el link corto te lleva a destino". El comportamiento esperado es un `302` real (`res.redirect(link.url)`).

### `GET /api/links/:codigo/stats` (pendiente — Milestone 4)

Devuelve las estadísticas de un link, sin modificarlo.

**Casos:**

| Caso | Status | Respuesta |
|---|---|---|
| `codigo` existe | 200 | `{ "codigo", "url", "clicks", "creado" }` |
| `codigo` no existe | 404 | `{ "error": "No existe ese link" }` |

**Importante:** consultar las estadísticas **no** incrementa `clicks`. Solo `GET /:codigo` (la redirección real) cuenta como una visita. Esto es lo que hace que "las estadísticas digan la verdad" (ver sección dedicada).

`public/stats.html` ya tiene la maqueta (con datos hardcodeados de mentira) pero no llama a este endpoint todavía — falta conectarlo.

## Generación de códigos y colisiones

`utils.js` genera códigos de 3 caracteres tomados al azar de `[a-z0-9]` (36 caracteres → 46,656 combinaciones posibles). Con `links.json` creciendo, la probabilidad de colisión no es despreciable (cumpleaños: con unos cientos de links ya es significativa).

**Comportamiento esperado:** al generar un código nuevo, verificar contra los códigos existentes en `links.json` y regenerar si ya está en uso, hasta encontrar uno libre. Nunca debe pisarse un link existente ni crearse un duplicado.

**Estado actual (bug conocido, Milestone 3):** `generarCodigo()` no chequea contra `links.json`. Si genera un código que ya existe, `POST /api/links` agrega una segunda entrada con el mismo `codigo`. Como `GET /:codigo` usa `.find()` (devuelve el primer match), el segundo link queda inaccesible por su código corto — silenciosamente. Respuesta esperada: *"nada malo, lo arreglamos"* (criterio de Milestone 3) — regenerar hasta obtener un código libre, no fallar ni corromper el link anterior.

## Qué significa "las estadísticas dicen la verdad"

- `clicks` de un link refleja exactamente la cantidad de veces que se resolvió `GET /:codigo` para ese código — ni más, ni menos.
- Consultar estadísticas (`GET /api/links/:codigo/stats`) es una operación de solo lectura: no incrementa `clicks`.
- Cada visita a un `codigo` válido cuenta exactamente una vez. Escrituras concurrentes (dos requests casi simultáneos al mismo código) no deben pisarse ni perder un click — hoy `leerLinks`/`guardarLinks` hacen `fs.readFileSync`/`writeFileSync` sin ningún lock, así que dos requests concurrentes pueden leer el mismo estado viejo y el segundo `writeFileSync` pisa el incremento del primero (click perdido). Esto queda anotado como limitación conocida del storage basado en archivo; se revisita si se migra a una base de datos real en Milestone 5.
- Un `codigo` inexistente nunca debe aparecer en las estadísticas como si tuviera actividad (404, no un objeto con `clicks: 0` inventado).

## Fuera de alcance de este spec

`index_v2_FINAL.js`, `server_OLD.js`, `links_backup_marzo.json`, `notas.txt`, `test.js` y `public/estilos_viejos.css` eran archivos muertos/duplicados del proyecto heredado (versiones viejas del server, un backup suelto, una credencial en texto plano, un smoke-test manual redundante con la batería TDD, y CSS sin referenciar). Milestone 2 los sacó del repo — no forman parte del comportamiento especificado.

## Decisiones abiertas / a confirmar

- **Formato exacto de validación de URL** en `POST /api/links`: por ahora, "parseable con `new URL()` y protocolo `http:`/`https:`". A confirmar si se necesita algo más laxo o más estricto.
- **Longitud/alfabeto del código corto**: se mantiene en 3 caracteres `[a-z0-9]` (comportamiento heredado). Si el volumen de links crece, revisar si alcanza.
- **Manejo de la concurrencia en el archivo JSON**: hoy no hay lock. Se documenta como limitación conocida; no se resuelve en Milestone 3 salvo que un test lo exija explícitamente.
