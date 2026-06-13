-- ============================================================
-- STANDINGS-SEED — datos placeholder LMB + MLB (temporada 2026)
-- Tablas afectadas: equipos, posiciones
-- DATOS DE RELLENO — serán sobreescritos por el sync automático
-- en cuanto se active la integración con la API de estadísticas.
-- Idempotente (ON CONFLICT DO UPDATE). No hardcodea IDs.
-- ============================================================


-- ============================================================
-- EQUIPOS — LMB (Zona Norte)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Sultanes de Monterrey',         'Sultanes',    'MTY',  'Monterrey',             'Norte', NULL, NULL, '#1B2A4A', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Acereros de Monclova',          'Acereros',    'MON',  'Monclova',              'Norte', NULL, NULL, '#C0C0C0', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Toros de Tijuana',              'Toros',       'TIJ',  'Tijuana',               'Norte', NULL, NULL, '#C8102E', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Saraperos de Saltillo',         'Saraperos',   'SLT',  'Saltillo',              'Norte', NULL, NULL, '#003087', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Dorados de Chihuahua',          'Dorados',     'CHI',  'Chihuahua',             'Norte', NULL, NULL, '#D4A843', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Tecolotes de los Dos Laredos',  'Tecolotes',   'LAR',  'Nuevo Laredo/Laredo',   'Norte', NULL, NULL, '#2E5827', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Algodoneros Unión Laguna',      'Algodoneros', 'UNL',  'Torreón',               'Norte', NULL, NULL, '#00529B', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Mariachis de Guadalajara',      'Mariachis',   'GDL',  'Guadalajara',           'Norte', NULL, NULL, '#D4A843', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Charros de Jalisco',            'Charros',     'JAL',  'Guadalajara',           'Norte', NULL, NULL, '#8B1A1A', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Conspiradores de Querétaro',    'Conspiradores','QRO', 'Querétaro',             'Norte', NULL, NULL, '#702082', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — LMB (Zona Sur)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Diablos Rojos del México',      'Diablos',     'MEX',  'Ciudad de México',      'Sur',   NULL, NULL, '#C8102E', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Pericos de Puebla',             'Pericos',     'PUE',  'Puebla',                'Sur',   NULL, NULL, '#006400', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Leones de Yucatán',             'Leones',      'YUC',  'Mérida',                'Sur',   NULL, NULL, '#FFA500', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'El Águila de Veracruz',         'Águila',      'VER',  'Veracruz',              'Sur',   NULL, NULL, '#C8102E', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Olmecas de Tabasco',            'Olmecas',     'TAB',  'Villahermosa',          'Sur',   NULL, NULL, '#006400', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Piratas de Campeche',           'Piratas',     'CAM',  'Campeche',              'Sur',   NULL, NULL, '#000000', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Guerreros de Oaxaca',           'Guerreros',   'OAX',  'Oaxaca',                'Sur',   NULL, NULL, '#006400', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Bravos de León',                'Bravos',      'LEO',  'León',                  'Sur',   NULL, NULL, '#C8102E', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Tigres de Quintana Roo',        'Tigres',      'QRR',  'Cancún',                'Sur',   NULL, NULL, '#FF6B00', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'lmb'), 'Rieleros de Aguascalientes',    'Rieleros',    'AGS',  'Aguascalientes',        'Sur',   NULL, NULL, '#003087', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — MLB (Liga Americana — Este)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Yankees de Nueva York',   'Yankees',   'NYY', 'Nueva York',  'Este', 'Americana', NULL, '#003087', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Orioles de Baltimore',    'Orioles',   'BAL', 'Baltimore',   'Este', 'Americana', NULL, '#DF4601', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Red Sox de Boston',       'Red Sox',   'BOS', 'Boston',      'Este', 'Americana', NULL, '#BD3039', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Blue Jays de Toronto',    'Blue Jays', 'TOR', 'Toronto',     'Este', 'Americana', NULL, '#134A8E', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Rays de Tampa Bay',       'Rays',      'TB',  'Tampa Bay',   'Este', 'Americana', NULL, '#092C5C', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — MLB (Liga Americana — Centro)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Guardians de Cleveland',  'Guardians', 'CLE', 'Cleveland',   'Centro', 'Americana', NULL, '#00385D', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Royals de Kansas City',   'Royals',    'KC',  'Kansas City', 'Centro', 'Americana', NULL, '#004687', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Tigers de Detroit',       'Tigers',    'DET', 'Detroit',     'Centro', 'Americana', NULL, '#0C2340', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Twins de Minnesota',      'Twins',     'MIN', 'Minnesota',   'Centro', 'Americana', NULL, '#002B5C', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'White Sox de Chicago',    'White Sox', 'CWS', 'Chicago',     'Centro', 'Americana', NULL, '#27251F', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — MLB (Liga Americana — Oeste)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Astros de Houston',       'Astros',    'HOU', 'Houston',         'Oeste', 'Americana', NULL, '#EB6E1F', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Marineros de Seattle',    'Marineros', 'SEA', 'Seattle',         'Oeste', 'Americana', NULL, '#0C2C56', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Rangers de Texas',        'Rangers',   'TEX', 'Arlington',       'Oeste', 'Americana', NULL, '#003278', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Angels de Los Ángeles',   'Angels',    'LAA', 'Anaheim',         'Oeste', 'Americana', NULL, '#BA0021', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Athletics de Sacramento', 'Athletics', 'ATH', 'Sacramento',      'Oeste', 'Americana', NULL, '#003831', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — MLB (Liga Nacional — Este)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Phillies de Filadelfia',  'Phillies',  'PHI', 'Filadelfia',      'Este', 'Nacional', NULL, '#E81828', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Braves de Atlanta',       'Braves',    'ATL', 'Atlanta',         'Este', 'Nacional', NULL, '#CE1141', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Mets de Nueva York',      'Mets',      'NYM', 'Nueva York',      'Este', 'Nacional', NULL, '#002D72', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Marlins de Miami',        'Marlins',   'MIA', 'Miami',           'Este', 'Nacional', NULL, '#00A3E0', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Nationals de Washington', 'Nationals', 'WSH', 'Washington D.C.', 'Este', 'Nacional', NULL, '#AB0003', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — MLB (Liga Nacional — Centro)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Brewers de Milwaukee',    'Brewers',   'MIL', 'Milwaukee',       'Centro', 'Nacional', NULL, '#FFC52F', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Cubs de Chicago',         'Cubs',      'CHC', 'Chicago',         'Centro', 'Nacional', NULL, '#0E3386', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Cardinals de San Luis',   'Cardinals', 'STL', 'San Luis',        'Centro', 'Nacional', NULL, '#C41E3A', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Reds de Cincinnati',      'Reds',      'CIN', 'Cincinnati',      'Centro', 'Nacional', NULL, '#C6011F', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Pirates de Pittsburgh',   'Pirates',   'PIT', 'Pittsburgh',      'Centro', 'Nacional', NULL, '#FDB827', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;

-- ============================================================
-- EQUIPOS — MLB (Liga Nacional — Oeste)
-- ============================================================
INSERT INTO public.equipos
  (liga_id, nombre, nombre_corto, abreviatura, ciudad, division, conferencia, logo_url, color_primario, external_id)
VALUES
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Dodgers de Los Ángeles',     'Dodgers',      'LAD', 'Los Ángeles',     'Oeste', 'Nacional', NULL, '#005A9C', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Padres de San Diego',        'Padres',       'SD',  'San Diego',       'Oeste', 'Nacional', NULL, '#2F241D', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Diamondbacks de Arizona',    'Diamondbacks', 'ARI', 'Phoenix',         'Oeste', 'Nacional', NULL, '#A71930', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Giants de San Francisco',    'Giants',       'SF',  'San Francisco',   'Oeste', 'Nacional', NULL, '#FD5A1E', NULL),
  ((SELECT id FROM public.ligas WHERE slug = 'mlb'), 'Rockies de Colorado',        'Rockies',      'COL', 'Denver',          'Oeste', 'Nacional', NULL, '#33006F', NULL)
ON CONFLICT (liga_id, nombre) DO UPDATE
  SET nombre_corto  = EXCLUDED.nombre_corto,
      abreviatura   = EXCLUDED.abreviatura,
      ciudad        = EXCLUDED.ciudad,
      division      = EXCLUDED.division,
      conferencia   = EXCLUDED.conferencia,
      color_primario = EXCLUDED.color_primario;


-- ============================================================
-- POSICIONES — LMB Zona Norte (temporada 2026)
-- Líder: Sultanes de Monterrey (jj=54, jg=38, jp=16, pct=0.704)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Sultanes de Monterrey',               '2026',    54, 38, 16, 0.704, '-',    'G4',  1),
  ('Acereros de Monclova',                '2026',    54, 35, 19, 0.648, '3.0',  'G2',  2),
  ('Saraperos de Saltillo',               '2026',    54, 33, 21, 0.611, '5.0',  'G1',  3),
  ('Tecolotes de los Dos Laredos',        '2026',    54, 30, 24, 0.556, '8.0',  'P1',  4),
  ('Toros de Tijuana',                    '2026',    54, 29, 25, 0.537, '9.0',  'G2',  5),
  ('Algodoneros Unión Laguna',            '2026',    54, 27, 27, 0.500, '11.0', 'P3',  6),
  ('Mariachis de Guadalajara',            '2026',    54, 25, 29, 0.463, '13.0', 'P2',  7),
  ('Charros de Jalisco',                  '2026',    54, 23, 31, 0.426, '15.0', 'G1',  8),
  ('Dorados de Chihuahua',                '2026',    54, 20, 34, 0.370, '18.0', 'P4',  9),
  ('Conspiradores de Querétaro',          '2026',    54, 17, 37, 0.315, '21.0', 'P6',  10)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — LMB Zona Sur (temporada 2026)
-- Líder: Diablos Rojos del México (jj=54, jg=36, jp=18, pct=0.667)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Diablos Rojos del México',            '2026',    54, 36, 18, 0.667, '-',    'G3',  1),
  ('Pericos de Puebla',                   '2026',    54, 35, 19, 0.648, '1.0',  'G1',  2),
  ('El Águila de Veracruz',               '2026',    54, 34, 20, 0.630, '2.0',  'P1',  3),
  ('Guerreros de Oaxaca',                 '2026',    54, 30, 24, 0.556, '6.0',  'G2',  4),
  ('Leones de Yucatán',                   '2026',    54, 29, 25, 0.537, '7.0',  'P2',  5),
  ('Olmecas de Tabasco',                  '2026',    54, 26, 28, 0.481, '10.0', 'G1',  6),
  ('Piratas de Campeche',                 '2026',    54, 25, 29, 0.463, '11.0', 'P3',  7),
  ('Rieleros de Aguascalientes',          '2026',    54, 22, 32, 0.407, '14.0', 'P1',  8),
  ('Tigres de Quintana Roo',              '2026',    54, 19, 35, 0.352, '17.0', 'P5',  9),
  ('Bravos de León',                      '2026',    54, 16, 38, 0.296, '20.0', 'P7',  10)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — MLB Liga Americana — Este (temporada 2026)
-- Líder: Yankees de Nueva York (jj=70, jg=48, jp=22, pct=0.686)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Yankees de Nueva York',               '2026',    70, 48, 22, 0.686, '-',    'G5',  1),
  ('Red Sox de Boston',                   '2026',    70, 44, 26, 0.629, '4.0',  'P1',  2),
  ('Blue Jays de Toronto',                '2026',    70, 42, 28, 0.600, '6.0',  'G2',  3),
  ('Rays de Tampa Bay',                   '2026',    70, 37, 33, 0.529, '11.0', 'P3',  4),
  ('Orioles de Baltimore',                '2026',    70, 30, 40, 0.429, '18.0', 'P8',  5)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — MLB Liga Americana — Centro (temporada 2026)
-- Líder: Guardians de Cleveland (jj=70, jg=45, jp=25, pct=0.643)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Guardians de Cleveland',              '2026',    70, 45, 25, 0.643, '-',    'G3',  1),
  ('Twins de Minnesota',                  '2026',    70, 44, 26, 0.629, '1.0',  'P1',  2),
  ('White Sox de Chicago',                '2026',    70, 40, 30, 0.571, '5.0',  'G4',  3),
  ('Royals de Kansas City',               '2026',    70, 36, 34, 0.514, '9.0',  'P2',  4),
  ('Tigers de Detroit',                   '2026',    70, 33, 37, 0.471, '12.0', 'P5',  5)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — MLB Liga Americana — Oeste (temporada 2026)
-- Líder: Astros de Houston (jj=70, jg=47, jp=23, pct=0.671)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Astros de Houston',                   '2026',    70, 47, 23, 0.671, '-',    'G2',  1),
  ('Marineros de Seattle',                '2026',    70, 43, 27, 0.614, '4.0',  'G1',  2),
  ('Angels de Los Ángeles',               '2026',    70, 38, 32, 0.543, '9.0',  'P2',  3),
  ('Rangers de Texas',                    '2026',    70, 35, 35, 0.500, '12.0', 'G3',  4),
  ('Athletics de Sacramento',             '2026',    70, 28, 42, 0.400, '19.0', 'P9',  5)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — MLB Liga Nacional — Este (temporada 2026)
-- Líder: Braves de Atlanta (jj=70, jg=46, jp=24, pct=0.657)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Braves de Atlanta',                   '2026',    70, 46, 24, 0.657, '-',    'G6',  1),
  ('Mets de Nueva York',                  '2026',    70, 44, 26, 0.629, '2.0',  'G2',  2),
  ('Phillies de Filadelfia',              '2026',    70, 43, 27, 0.614, '3.0',  'P1',  3),
  ('Marlins de Miami',                    '2026',    70, 32, 38, 0.457, '14.0', 'P4',  4),
  ('Nationals de Washington',             '2026',    70, 27, 43, 0.386, '19.0', 'P10', 5)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — MLB Liga Nacional — Centro (temporada 2026)
-- Líder: Cubs de Chicago (jj=70, jg=46, jp=24, pct=0.657)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Cubs de Chicago',                     '2026',    70, 46, 24, 0.657, '-',    'P1',  1),
  ('Brewers de Milwaukee',                '2026',    70, 45, 25, 0.643, '1.0',  'G4',  2),
  ('Cardinals de San Luis',               '2026',    70, 41, 29, 0.586, '5.0',  'G1',  3),
  ('Reds de Cincinnati',                  '2026',    70, 36, 34, 0.514, '10.0', 'P3',  4),
  ('Pirates de Pittsburgh',               '2026',    70, 28, 42, 0.400, '18.0', 'P7',  5)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;

-- ============================================================
-- POSICIONES — MLB Liga Nacional — Oeste (temporada 2026)
-- Líder: Dodgers de Los Ángeles (jj=70, jg=52, jp=18, pct=0.743)
-- GB fórmula: ((ldr.jg - eq.jg) + (eq.jp - ldr.jp)) / 2
-- Verificación: jg+jp=jj para todos los equipos ✓
-- ============================================================
INSERT INTO public.posiciones (equipo_id, temporada, jj, jg, jp, pct, gb, racha, orden)
SELECT e.id, v.temporada, v.jj, v.jg, v.jp, v.pct, v.gb, v.racha, v.orden
FROM (VALUES
  -- nombre,                              temporada, jj, jg, jp,   pct,    gb,     racha, orden
  ('Dodgers de Los Ángeles',              '2026',    70, 52, 18, 0.743, '-',    'G7',  1),
  ('Padres de San Diego',                 '2026',    70, 44, 26, 0.629, '8.0',  'G3',  2),
  ('Giants de San Francisco',             '2026',    70, 38, 32, 0.543, '14.0', 'P2',  3),
  ('Diamondbacks de Arizona',             '2026',    70, 35, 35, 0.500, '17.0', 'P1',  4),
  ('Rockies de Colorado',                 '2026',    70, 29, 41, 0.414, '23.0', 'P11', 5)
) AS v(nombre, temporada, jj, jg, jp, pct, gb, racha, orden)
JOIN public.equipos e ON e.nombre = v.nombre
ON CONFLICT (equipo_id, temporada) DO UPDATE
  SET jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
      pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha, orden = EXCLUDED.orden;
