-- ============================================================
-- SEC-02-FIX-02 — Tu Historia: declaración explícita de menores
--
-- El flujo anterior conflacionaba en un solo checkbox "las fotos
-- incluyen menores" + "tengo autorización". El nuevo flujo separa
-- la declaración (Sí/No, obligatoria cuando hay fotos) de la
-- autorización (obligatoria solo si se declararon menores).
--
-- Semántica de columnas:
--   fotos_incluyen_menores: NULL sin fotos; true/false = declaración
--                           del remitente cuando hay fotos.
--   autorizacion_menores:   true solo cuando se declararon menores y
--                           se confirmó la autorización; NULL en el
--                           resto de los casos (el validador rechaza
--                           menores declarados sin autorización).
-- ============================================================

ALTER TABLE historias_enviadas
  ADD COLUMN IF NOT EXISTS fotos_incluyen_menores BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN historias_enviadas.fotos_incluyen_menores IS
  'Declaración del remitente: NULL = sin fotos; true/false = si las fotos incluyen menores de edad (SEC-02-FIX-02).';
