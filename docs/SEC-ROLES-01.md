# SEC-ROLES-01 — Fundación de roles + storage legacy + máquina de estados Tu Historia + SEC-03

**Fecha:** 18-jul-2026 · **Estado global:** migraciones PROPUESTAS (pendientes de ejecución por Sergio en el SQL Editor).

---

## Fase 0 — Diagnóstico completo

### 0.1 Inventario de `pg_policies` (todas las tablas públicas + storage)

Leyenda: 🔴 escritura sin `is_admin()` donde debería · 🟠 anómala/reportable · ✅ correcta.

**storage.objects**

| Policy | Cmd | Rol | Regla | Veredicto |
|---|---|---|---|---|
| `Admin: subir imagenes` | INSERT | public | `auth.role()='authenticated'`, **sin filtro de bucket** | 🔴 cualquier autenticado sube a cualquier bucket, incl. tu-historia privado |
| `Admin: eliminar imagenes` | DELETE | public | `auth.role()='authenticated'`, **sin filtro de bucket** | 🔴 cualquier autenticado borra toda la media library |
| `tu_historia_authenticated_delete` | DELETE | authenticated | `bucket_id='tu-historia'` (sin is_admin) | 🔴 hallazgo extra: cualquier autenticado borra fotos del bucket privado |
| `Permitir ver imagenes 1ktc4f5_0` | SELECT | public | `bucket_id='imagenes'` | ✅ se conserva |
| `tu_historia_admin_read` | SELECT | authenticated | `bucket_id='tu-historia' AND is_admin()` | ✅ se conserva |

**Tablas públicas — escritura abierta a cualquier `authenticated` (qual/with_check `true`), sin `is_admin()`:**

| Tabla | Policies afectadas | En alcance de esta misión |
|---|---|---|
| `quick_hits` | insert/update/delete `_authenticated_*` | ✅ Fase E (migración 04) |
| `tags` | insert/update/delete `_authenticated_*` | ✅ Fase E (migración 04) |
| `autores` | insert/update/delete "Admin: *" | ❌ reportada → SEC-04 |
| `categorias` | insert/update/delete "Admin: *" | ❌ reportada → SEC-04 |
| `streams` | insert/update/delete "Admin: *" | ❌ reportada → SEC-04 |
| `videos` | INSERT y UPDATE "Admin: *" (DELETE ya es is_admin desde SEC-06) | ❌ reportada → SEC-04 / matriz periodista |
| `articulo_tags` | insert/delete `_authenticated_*` | ❌ reportada → SEC-04 |
| `historias_enviadas` | `historias_authenticated_read` (SELECT true), `historias_authenticated_update` (UPDATE true) | ❌ reportada → SEC-04 (la matriz periodista dice "sin Tu Historia" → se cierra en Editor 2.0) |
| `suscriptores` | SELECT/UPDATE/DELETE "Admin: *" true (INSERT público es intencional: formulario de suscripción) | ❌ solo reportar (instrucción de misión) |
| `contacto_mensajes` | SELECT/DELETE "Admin: *" true (INSERT público intencional: formulario de contacto) | ❌ solo reportar (instrucción de misión) |
| `imagenes_metadata` | insert/update/delete rol public con `auth.role()='authenticated'` | ❌ reportada → SEC-04 |
| `wbc_galeria`, `wbc_posiciones`, `wbc_resultados`, `wbc_videos` | insert/update(/delete) rol public con `auth.role()='authenticated'` | ❌ reportada → SEC-04 (sección WBC congelada) |
| `articulos` | `authenticated_insert` (`auth.uid() IS NOT NULL`) — deliberada de SEC-06 ("editor crea borradores") | ❌ decisión pertenece a la matriz periodista / Editor 2.0 |

**🚨 Hallazgo crítico nuevo — `eventos` escribible por ANÓNIMOS:**
`Admin: insertar/actualizar/eliminar eventos` son rol `{public}` con qual/with_check `true` → **cualquier visitante con el anon key (público por diseño) puede insertar, alterar o vaciar la tabla `eventos`**. La mitigación "signup OFF" no aplica: no requiere cuenta. Es categóricamente peor que los 5 hallazgos conocidos, por eso entra al fix set de esta misión como migración 03 (hotfix), pese a no estar en el alcance original.

RLS está **habilitado** en las 23 tablas de `public` (verificado `relrowsecurity=true`) — las policies son la única puerta; ninguna tabla está "abierta por RLS deshabilitado".

Correctas (patrón SEC-06, sin cambios): `anuncios`, `equipos`, `ligas`, `posiciones`, `ad_eventos`, `articulos` (SELECT/UPDATE/DELETE), `videos` (DELETE).

### 0.2 Cómo escribe el panel a storage

El panel de Medios sube **y borra con el cliente authenticated** — `SupabaseStorage.subirImagen()` (`.upload()`) y `eliminarImagen()` (`.remove()`) en `public/js/supabase.js:618-706`. **No** pasa por endpoint con service role. Conclusión: tras el fix se necesitan **ambas** policies (INSERT y DELETE) admin-only scoped a `imagenes` — la opción "eliminar la policy DELETE" queda descartada. En `tu-historia` el único borrado por código es el rollback del endpoint `enviar-historia` (service role, no pasa por RLS) → `tu_historia_authenticated_delete` se DROPea sin reemplazo.

### 0.3 Referencias de `admin@beisjoven.com`

UUID: `183feb9f-1148-4207-8d5c-8165a4399409` (creada 08-feb, último login 08-feb, **sin rol** en app_metadata desde SEC-06).

| Referencia | Filas |
|---|---|
| `articulos.user_id` | **0** |
| `storage.objects.owner` / `owner_id` | **0** |
| `storage.buckets.owner` | **0** |
| `historias_enviadas` | sin columna de user-reference (0 filas además) |

**El retiro es limpio — no requiere reasignación.** (Contexto: los 115 artículos con `user_id` son de Sergio; 538 tienen `user_id NULL`, previos al tracking de autor — sin relación con la cuenta muerta.)

### 0.4 Anatomía Tu Historia ↔ artículo

- `historias_enviadas.estado` (text, default `'nueva'`); estados usados por el panel: `nueva → en_revision → verificada → publicada`, más `descartada`. `articulo_id` integer nullable.
- FK actual: `FOREIGN KEY (articulo_id) REFERENCES articulos(id)` **sin ON DELETE** → borrar artículo vinculado truena (el caso que el CEO resolvió a mano).
- Flujo de publicación: historia `verificada` → botón "Crear artículo" abre `/admin/nuevo?historia=<id>` → al **Publicar** (única acción permitida en sesiones sembradas, guard HISTORIA-PIPELINE-02 en `admin.js:1851`) el panel setea `estado='publicada'` + `articulo_id` (`admin.js:2069-2076`).
- **Nada revierte** al despublicar/borrar el artículo: la máquina vive solo en el cliente y solo en dirección de ida. `_historiaAllowedTransitions` marca `publicada` como terminal en la UI. De ahí la desincronización del 16-jul (historia `publicada` → artículo 675 en Borrador).
- La tabla tiene hoy **0 filas** (la fila corrupta `60cb947d…` fue borrada a mano) → no hay data-fix retroactivo.
- Huérfano confirmado en el bucket privado: `tu-historia/60cb947d-8fc1-4ee9-b4b9-2affdad5049a/1.jpg` (test Williamsport, 16-jul) — cleanup en Fase D (ver §Fase D).

### 0.5 RLS de quick_hits / tags / suscriptores / contacto_mensajes

Detallado en la tabla de 0.1: escritura de `quick_hits` y `tags` abierta a cualquier authenticated (se cierra en migración 04); `suscriptores` y `contacto_mensajes` con INSERT público intencional (formularios) y gestión admin abierta a cualquier authenticated — solo reportadas, propuestas para SEC-04.

---

## Migraciones propuestas — orden de ejecución

Todas idempotentes (`DROP POLICY IF EXISTS` + `CREATE`), en `supabase/migrations/`. **Sergio las ejecuta en el SQL Editor, en este orden, de arriba a abajo.** "Success. No rows returned" = éxito normal. **Merged al repo ≠ aplicada en prod** — tabla de estado al final.

| # | Archivo | Fase | Contenido |
|---|---|---|---|
| 01 | `20260718_secroles01_01_roles_foundation.sql` | B | `is_superadmin()` + `is_periodista()`; `is_admin()` → alias de `is_superadmin()`; Sergio `admin`→`superadmin` |
| 02 | `20260718_secroles01_02_storage_policies.sql` | A | DROP 3 legacy de storage; `imagenes_admin_insert` / `imagenes_admin_delete` (is_admin + bucket) |
| 03 | `20260718_secroles01_03_eventos_anon_write_hotfix.sql` | 0-hotfix | eventos: escritura anon → admin-only |
| 04 | `20260718_secroles01_04_sec03_quickhits_tags.sql` | E | quick_hits + tags escritura admin-only; lecturas públicas intactas |
| 05 | `20260718_secroles01_05_tuhistoria_estado.sql` | D | FK `ON DELETE SET NULL` + 2 triggers de sync (despublicar/republicar/borrar) |

⚠️ **Tras ejecutar 01: cerrar sesión del panel y volver a entrar.** El JWT viejo dice `role='admin'` y `is_admin()` pasa a exigir `superadmin` — hasta el re-login el panel no lee fotos de tu-historia ni escribe nada gated por rol. Recomendado: ejecutar 01-05 en una sola sesión de SQL Editor y hacer el re-login una única vez al final.

**Cambios de código del panel: ninguno.** Fase D se implementa con triggers `SECURITY DEFINER` (justificación en el header de la migración 05): cubren todos los caminos de despublicar/borrar (editor, lista, bulk futuro, SQL directo) y no dependen de las policies RLS del usuario que dispara — el gap cliente-side fue exactamente lo que produjo la corrupción del 16-jul.

---

## Fase B — Matriz de permisos `periodista` (PROPUESTA, para aprobación del CEO — NO implementada)

Se implementa en Editor 2.0 con la matriz aprobada. Ninguna cuenta periodista se crea ahora.

| Recurso | superadmin | periodista (propuesto) |
|---|---|---|
| Artículos: crear borrador propio | ✅ | ✅ (`user_id = auth.uid()`) |
| Artículos: editar borrador propio | ✅ | ✅ (solo mientras `publicado=false`) |
| Artículos: publicar / despublicar | ✅ | ❌ (pide revisión; publica superadmin) |
| Artículos: editar publicados / ajenos | ✅ | ❌ |
| Artículos: borrar | ✅ | ❌ |
| Medios: ver biblioteca + subir imagen | ✅ | ✅ (necesario para ilustrar sus borradores) |
| Medios: borrar imagen | ✅ | ❌ |
| Tags: asignar existentes a su artículo | ✅ | ✅ |
| Tags: crear / renombrar / borrar | ✅ | ❌ |
| Quick Hits | ✅ | ❌ |
| Tu Historia (historias_enviadas + fotos) | ✅ | ❌ (datos personales y de menores) |
| Videos, eventos, streams, anuncios, ligas/equipos/posiciones | ✅ | ❌ |
| Suscriptores, mensajes de contacto | ✅ | ❌ |
| Usuarios / roles | ✅ | ❌ |

Nota técnica: "subir imagen sí / borrar no" requiere en Editor 2.0 relajar `imagenes_admin_insert` a `is_admin() OR is_periodista()` — el DELETE queda superadmin-only tal como lo deja esta misión.

---

## Fase C — Retiro de `admin@beisjoven.com`

Fase 0 confirma **cero referencias** → retiro limpio, sin SQL de reasignación.

1. Dashboard → **Authentication → Users** → `admin@beisjoven.com` → ⋮ → **Delete user**.
2. Verificación (SQL Editor, debe devolver 0 filas):
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'admin@beisjoven.com';
   ```
3. Nada puede quedar huérfano (0 referencias previas); las verificaciones de huérfanos quedan cubiertas por las queries de 0.3 si se quiere re-confirmar.

## Fase D — Cleanup de la foto huérfana (Williamsport)

`storage.objects` **no acepta DELETE por SQL** (trigger `protect_delete()`), así que va por Dashboard:

1. Dashboard → **Storage → tu-historia** → carpeta `60cb947d-8fc1-4ee9-b4b9-2affdad5049a` → seleccionar `1.jpg` → **Delete** (borrar también la carpeta si queda vacía).
2. Verificación (0 filas):
   ```sql
   SELECT name FROM storage.objects WHERE bucket_id = 'tu-historia';
   ```

---

## Fase F — Verificación integral (tras ejecutar 01-05 + re-login)

### F.1 pg_policies final — cero escrituras sin is_admin en lo tocado (0 filas)

```sql
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE cmd IN ('INSERT','UPDATE','DELETE')
  AND ((schemaname = 'storage' AND tablename = 'objects')
    OR (schemaname = 'public' AND tablename IN ('quick_hits','tags','eventos')))
  AND coalesce(qual,'') || coalesce(with_check,'') NOT ILIKE '%is_admin%';
```

### F.2 Negativas con anon key (todas deben RECHAZAR: 400/401/403, mensaje RLS)

```bash
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGtianBvdGZtd3FrenpmZWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTk3NTYsImV4cCI6MjA4NTI3NTc1Nn0.PK8mq4CeQkTdurdJ1EV_GOkrY2X4SCsst8O1NnoBWAU"
BASE="https://yulkbjpotfmwqkzzfegg.supabase.co"

# INSERT a storage imagenes → esperado 403
curl -s -o /dev/null -w "storage imagenes INSERT: %{http_code}\n" -X POST \
  "$BASE/storage/v1/object/imagenes/sec-test-$(date +%s).txt" \
  -H "Authorization: Bearer $ANON" -H "apikey: $ANON" \
  -H "Content-Type: text/plain" -d "sec-test"

# INSERT quick_hits → esperado 401/403
curl -s -o /dev/null -w "quick_hits INSERT: %{http_code}\n" -X POST \
  "$BASE/rest/v1/quick_hits" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -d '{"texto":"sec-test"}'

# UPDATE quick_hits → esperado 401/403 o 0 filas afectadas
curl -s -w "\nquick_hits UPDATE: %{http_code}\n" -X PATCH \
  "$BASE/rest/v1/quick_hits?id=eq.1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"texto":"hacked"}'
# (con return=representation, éxito-sin-permiso se ve como lista vacía [])

# INSERT tags → esperado 401/403
curl -s -o /dev/null -w "tags INSERT: %{http_code}\n" -X POST \
  "$BASE/rest/v1/tags" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -d '{"nombre":"sec-test","slug":"sec-test"}'

# INSERT eventos (hotfix 03) → esperado 401/403 (HOY devuelve 201 = vulnerable)
curl -s -o /dev/null -w "eventos INSERT: %{http_code}\n" -X POST \
  "$BASE/rest/v1/eventos" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -d '{"nombre":"sec-test","slug":"sec-test"}'
```

### F.3 Positivas (Sergio, en el panel, tras re-login)

1. **Medios:** subir una imagen → aparece; borrarla → desaparece.
2. **Quick Hits:** crear, editar y borrar uno de prueba.
3. **Tu Historia end-to-end:** enviar una historia de prueba por el formulario público → en el panel: nueva → en revisión → checklist → verificada → Crear artículo → Publicar. Verificar historia `publicada` con "Ver artículo". Luego: **despublicar** el artículo → la historia revierte a `verificada` (refrescar /admin/historias); **republicar** → vuelve a `publicada`; **borrar** el artículo → sin error de FK, historia sobrevive con `articulo_id NULL` y estado `verificada`. Descartar la historia de prueba al final (y borrar su foto de prueba del bucket vía Dashboard).
4. **JWT:** en DevTools → `(await supabaseClient.auth.getSession()).data.session.access_token` decodificado debe traer `app_metadata.role = 'superadmin'`.

### F.4 Sitio público intacto

- Homepage renderiza (quick_hits leen público).
- Imágenes de artículos visibles (SELECT público de `imagenes` intacto).
- Páginas de tag y de eventos renderizan.

---

## Estado por migración

| Archivo | Propuesta | Ejecutada por Sergio | Verificada |
|---|---|---|---|
| 01 roles_foundation | ✅ 18-jul | ✅ 18-jul | ✅ helpers + rol superadmin confirmados en DB |
| 02 storage_policies | ✅ 18-jul | ✅ 18-jul | ✅ pg_policies final = 4 policies esperadas; negativas RLS OK |
| 03 eventos_anon_write_hotfix | ✅ 18-jul | ✅ 18-jul | ✅ INSERT anon rechazado (42501) |
| 04 sec03_quickhits_tags | ✅ 18-jul | ✅ 18-jul | ✅ negativas anon/auth-sin-rol rechazadas; superadmin permitido |
| 05 tuhistoria_estado | ✅ 18-jul | ✅ 18-jul | ✅ ciclo despublicar/republicar/borrar verificado (Nivel 2, rollback) |
| Fase C retiro admin@ (Dashboard, sin SQL) | ✅ instrucción | ✅ 18-jul | ✅ 0 filas en auth.users; única cuenta = Sergio |
| Fase D cleanup foto Williamsport (Dashboard) | ✅ instrucción | ✅ 18-jul | ✅ bucket tu-historia con 0 objetos |

### Nota sobre la verificación ejecutada (18-jul, post-migraciones)

- La política de red del entorno de Code bloquea HTTPS saliente a `*.supabase.co` (CONNECT 403 del proxy) → los curls de F.2 no pudieron ejecutarse desde la sesión. Se reemplazaron por la vía equivalente a nivel RLS: **simulación de roles dentro de transacciones con rollback total (Nivel 2, declarada antes de ejecutar)** — `SET LOCAL ROLE anon/authenticated` + `request.jwt.claims` sintético, intentando los mismos INSERTs que los curls. Resultados (9/9 esperados, cero escrituras persistidas):
  - anon → `quick_hits`, `tags`, `eventos`, `storage imagenes`, `storage tu-historia`: **RECHAZADO (42501)**.
  - authenticated sin rol (el atacante del hallazgo original) → `storage imagenes`, `quick_hits`: **RECHAZADO (42501)**.
  - authenticated con `app_metadata.role='superadmin'` (JWT de Sergio post-re-login) → `quick_hits` y `storage imagenes`: **PERMITIDO**.
- Máquina de estados (Nivel 2, rollback): artículo+historia de prueba en transacción → despublicar→`verificada`, republicar→`publicada`, borrar→ sin error FK, `articulo_id=NULL`, estado `verificada`. El caso Williamsport es irreproducible.
- Post-check de limpieza: 0 filas `sec-test` en todas las tablas y en storage; `historias_enviadas` 0 filas; bucket `tu-historia` 0 objetos; `auth.users` = 1 (Sergio, `superadmin`).
- Los curls de F.2 quedan disponibles para correrlos desde cualquier máquina fuera del entorno si se quiere el double-check por REST; F.3 (positivas en el panel con re-login) y F.4 (ojo al sitio público) siguen siendo verificación manual de Sergio.

## Pendientes propuestos fuera de esta misión

- **SEC-04 (nuevo ticket sugerido):** cerrar a `is_admin()` la escritura de `autores`, `categorias`, `streams`, `videos` (INSERT/UPDATE), `articulo_tags`, `imagenes_metadata`, `wbc_*`, y la gestión admin de `suscriptores` / `contacto_mensajes`; tightening de `historias_enviadas` (read/update → is_admin). Riesgo hoy contenido (signup OFF + única cuenta autenticable con rol = Sergio), pero es deuda del mismo tipo que esta misión acaba de pagar en storage.
- **Editor 2.0:** policies de periodista según matriz aprobada; UI de gestión de usuarios; decisión sobre `articulos.authenticated_insert`.
