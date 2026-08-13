# Entrega: Corta, del caos a producción

- **URL pública:** https://corta-production-2bad.up.railway.app
- **Repositorio:** https://github.com/KLeichen/Corta_Test

## Cómo probarlo

1. Entrar a la URL pública y acortar un link (queda guardado en el historial de tu navegador).
2. Visitar el link corto: redirige de verdad (302) al destino.
3. Volver y consultar sus estadísticas — clicks, URL original y fecha de creación.
4. Los links y sus clicks sobreviven a un redeploy: los datos viven en Postgres, no en el filesystem del contenedor (verificado deployando dos veces seguidas y confirmando que el mismo link seguía resolviendo con los clicks acumulados).

## Qué se hizo

- **Historia completa en git**: el primer commit muestra la carpeta `corta/` tal cual se recibió (desordenada, con archivos muertos y una credencial en texto plano); todo lo demás es un diff trazable desde ahí.
- **`SPEC.md` + TDD**: comportamiento esperado documentado antes de corregir, con una batería de 18 tests (`node --test`) derivada del spec.
- **Bugs corregidos**: redirect real (302) en vez de responder texto plano, clicks persistidos correctamente, validación de URL, colisión de códigos resuelta (`generarCodigoUnico`).
- **Estadísticas conectadas de verdad**: `GET /api/links/:codigo/stats` + `stats.html` mostrando datos reales.
- **Repo ordenado**: `.gitignore`, sin archivos muertos ni dependencias sin usar, `README.md` con capturas y demo animado.
- **Producción en Railway**: servicio + Postgres provisionados por MCP, deploy y autodeploy funcionando, dominio público generado.
- **Extra de esta entrega** (fuera del alcance mínimo): historial de links por navegador (`localStorage`) y rediseño del frontend (layout responsive, mobile probado).

Detalle completo de arquitectura, endpoints y limitaciones conocidas en [`README.md`](./README.md); comportamiento esperado caso por caso en [`SPEC.md`](./SPEC.md).
