-- ADS-C6-FRAME-01 — Swap de creativos CEDISMAN en home-top al formato nuevo
-- (970×250 desktop / 320×100 móvil, assets @2×: 1940×500 y 640×200 PNG).
--
-- EJECUCIÓN: manual por el CEO en el SQL Editor (Nivel 3 de la doctrina SQL).
-- NO ejecutar vía MCP. "Success. No rows returned" = éxito normal.
--
-- PRERREQUISITO — antes de ejecutar:
--   1. Subir los DOS archivos originales del anunciante vía el uploader del
--      admin (Media Library). El uploader renombra a [timestamp]-[random].ext.
--   2. Capturar las URLs públicas resultantes de cada uno.
--   3. Reemplazar los CUATRO placeholders de abajo:
--        <URL_DESKTOP_970x250>  → URL pública completa del asset 1940×500
--        <URL_MOVIL_320x100>    → URL pública completa del asset 640×200
--        <FILENAME_DESKTOP>     → solo el filename del asset desktop
--                                 (p. ej. 1786100000000-abc123def.png)
--        <FILENAME_MOVIL>       → solo el filename del asset móvil
--   4. Ejecutar el bloque completo (BEGIN…COMMIT) en el SQL Editor.
--
-- Nota de coordinación: el frame nuevo (commit de este ticket) debe estar
-- desplegado en producción ANTES o A LA VEZ que este swap; el frame nuevo
-- muestra el arte viejo letterboxeado (sin recorte) durante la ventana, así
-- que el orden frame→swap es seguro. Ventana ISR ~60 s tras el swap antes de
-- cualquier verificación visual.

BEGIN;

-- (a) Apuntar la fila de CEDISMAN en home-top a los creativos nuevos.
--     Fila única verificada por SELECT el 2026-08-07:
--     id = aa05388e-cfae-4fd0-940c-7f69a6153ef4 (slot home-top, tipo aliado,
--     marca CEDISMAN, activo). El WHERE combina id + claves de negocio para
--     no tocar la fila equivocada si el inventario cambió entre tanto.
UPDATE anuncios
SET imagen_url        = '<URL_DESKTOP_970x250>',
    imagen_url_mobile = '<URL_MOVIL_320x100>',
    updated_at        = now()
WHERE id = 'aa05388e-cfae-4fd0-940c-7f69a6153ef4'
  AND slot_id = 'home-top'
  AND marca = 'CEDISMAN';

-- (b) Los creativos publicitarios no contaminan la galería de la Media
--     Library: borrar las filas de metadata que el uploader acaba de crear
--     para los dos assets nuevos. (Los creativos viejos de CEDISMAN ya no
--     tienen filas en imagenes_metadata — verificado por SELECT 2026-08-07.)
DELETE FROM imagenes_metadata
WHERE nombre IN ('<FILENAME_DESKTOP>', '<FILENAME_MOVIL>');

COMMIT;

-- ============================================================
-- Verificación (correr después del COMMIT):
--
-- SELECT id, imagen_url, imagen_url_mobile, updated_at
-- FROM anuncios
-- WHERE slot_id = 'home-top' AND marca = 'CEDISMAN';
--   → debe mostrar las dos URLs nuevas.
--
-- SELECT nombre FROM imagenes_metadata
-- WHERE nombre IN ('<FILENAME_DESKTOP>', '<FILENAME_MOVIL>');
--   → debe devolver 0 filas.
-- ============================================================
