-- ============================================================
-- SEC-ROLES-01 · 05 — Tu Historia: FK ON DELETE SET NULL +
-- máquina de estados historia↔artículo server-side
--
-- PROBLEMAS (Fase 0):
--   · FK historias_enviadas_articulo_id_fkey sin acción ON DELETE →
--     borrar un artículo vinculado truena (el CEO tuvo que borrar la
--     fila a mano por SQL).
--   · La máquina de estados vive SOLO en el cliente (admin.js
--     saveArticle marca estado='publicada' + articulo_id al publicar).
--     Nada revierte la historia al despublicar o borrar el artículo →
--     caso real 16-jul: historia 'publicada' con banner "Ver artículo"
--     apuntando al artículo 675 en Borrador (id 60cb947d).
--
-- DECISIÓN — TRIGGERS en DB, no lógica del panel. Justificación:
--   · El artículo se puede despublicar/borrar desde VARIOS caminos
--     (editor, lista de artículos, futuras acciones bulk ADMIN35,
--     SQL directo). Un trigger cubre todos; lógica de panel solo el
--     camino que se acuerde de llamar — exactamente el tipo de gap
--     que produjo la corrupción del 16-jul.
--   · SECURITY DEFINER: el sync no depende de las policies RLS del
--     usuario que dispara la operación (crítico para Editor 2.0,
--     donde un periodista NO tendrá acceso a historias_enviadas).
--   · El panel NO necesita cambios de código: el enlace al publicar
--     (admin.js:2069) sigue siendo del cliente; los triggers cubren
--     despublicar / republicar / borrar.
--
-- MÁQUINA RESULTANTE (estados existentes: nueva, en_revision,
-- verificada, publicada, descartada):
--   · publicar historia → panel crea artículo publicado y setea
--     estado='publicada' + articulo_id  (sin cambios).
--   · artículo despublicado → historia 'publicada' revierte a
--     'verificada' (su estado pre-publicación); conserva articulo_id.
--   · artículo republicado → historia 'verificada' aún vinculada
--     vuelve a 'publicada'.
--   · artículo borrado → articulo_id = NULL + revert a 'verificada'
--     (trigger); la FK ON DELETE SET NULL queda de respaldo por si
--     el trigger se deshabilitara.
--   → 'publicada' solo puede ser cierto mientras el artículo existe
--     Y está publicado. El caso Williamsport es irreproducible.
--
-- Ejecutar en el SQL Editor, de arriba a abajo, en una sola corrida.
-- Idempotente. "Success. No rows returned" = éxito normal.
-- ============================================================


-- ------------------------------------------------------------
-- 1) FK → ON DELETE SET NULL
-- ------------------------------------------------------------
ALTER TABLE public.historias_enviadas
  DROP CONSTRAINT IF EXISTS historias_enviadas_articulo_id_fkey;

ALTER TABLE public.historias_enviadas
  ADD CONSTRAINT historias_enviadas_articulo_id_fkey
  FOREIGN KEY (articulo_id) REFERENCES public.articulos(id)
  ON DELETE SET NULL;


-- ------------------------------------------------------------
-- 2) Sync al despublicar / republicar un artículo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_historia_estado_articulo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.publicado = true AND NEW.publicado = false THEN
    UPDATE public.historias_enviadas
       SET estado = 'verificada'
     WHERE articulo_id = NEW.id
       AND estado = 'publicada';
  ELSIF OLD.publicado = false AND NEW.publicado = true THEN
    UPDATE public.historias_enviadas
       SET estado = 'publicada'
     WHERE articulo_id = NEW.id
       AND estado = 'verificada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articulos_sync_historia_estado ON public.articulos;
CREATE TRIGGER articulos_sync_historia_estado
AFTER UPDATE OF publicado ON public.articulos
FOR EACH ROW
WHEN (OLD.publicado IS DISTINCT FROM NEW.publicado)
EXECUTE FUNCTION public.sync_historia_estado_articulo();


-- ------------------------------------------------------------
-- 3) Desvincular + revertir al borrar un artículo.
--    BEFORE DELETE: corre antes que la acción de la FK, así el
--    revert de estado y el articulo_id=NULL van juntos.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desvincular_historia_articulo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.historias_enviadas
     SET articulo_id = NULL,
         estado = CASE WHEN estado = 'publicada' THEN 'verificada' ELSE estado END
   WHERE articulo_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS articulos_desvincular_historia ON public.articulos;
CREATE TRIGGER articulos_desvincular_historia
BEFORE DELETE ON public.articulos
FOR EACH ROW
EXECUTE FUNCTION public.desvincular_historia_articulo();


-- ============================================================
-- VERIFICACIÓN (ejecutar después)
-- ============================================================
-- a) FK con SET NULL → 1 fila con "ON DELETE SET NULL" en la def:
--    SELECT conname, pg_get_constraintdef(oid)
--    FROM pg_constraint
--    WHERE conname = 'historias_enviadas_articulo_id_fkey';
--
-- b) Triggers instalados → 2 filas:
--    SELECT tgname FROM pg_trigger
--    WHERE tgrelid = 'public.articulos'::regclass AND NOT tgisinternal;
--
-- c) Prueba funcional end-to-end (con datos de prueba, desde el
--    panel, tras re-login) — pasos exactos en docs/SEC-ROLES-01.md
--    Fase F: publicar historia de prueba → despublicar el artículo
--    (historia revierte a verificada) → republicar (vuelve a
--    publicada) → borrar el artículo (historia sobrevive,
--    articulo_id NULL, estado verificada, sin error de FK).
--
-- NOTA: no hay data-fix retroactivo — historias_enviadas tiene hoy
-- 0 filas (la fila corrupta del 16-jul ya fue borrada a mano).
-- ============================================================
