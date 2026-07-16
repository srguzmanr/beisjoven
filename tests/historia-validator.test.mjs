// SEC-02 P2 — unit tests for the /api/enviar-historia field validator.
// Run: npm test  (node --test, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHistoria } from '../src/lib/historia-validator.js';

const DESCRIPCION = 'Una historia sobre béisbol juvenil en Sonora que supera con holgura los cincuenta caracteres.';

function base(overrides = {}) {
  return {
    nombre: 'María López',
    email: 'Maria@Example.com',
    telefono: '',
    relacion: 'entrenador',
    categoria_sugerida: 'juvenil',
    titulo: 'El torneo que nos cambió',
    descripcion: DESCRIPCION,
    liga_organizacion: '',
    ciudad_estado: 'Hermosillo, Sonora',
    autorizacion_general: 'true',
    fotos_incluyen_menores: '',
    autorizacion_menores: '',
    permitir_credito: 'true',
    ...overrides,
  };
}

test('accepts a full valid payload and normalizes it', () => {
  const out = validateHistoria(base(), 0);
  assert.ok('data' in out);
  assert.deepEqual(out.data, {
    nombre: 'María López',
    email: 'maria@example.com',
    telefono: null,
    relacion: 'entrenador',
    categoria_sugerida: 'juvenil',
    titulo: 'El torneo que nos cambió',
    descripcion: DESCRIPCION,
    liga_organizacion: null,
    ciudad_estado: 'Hermosillo, Sonora',
    autorizacion_general: true,
    fotos_incluyen_menores: null,
    autorizacion_menores: null,
    permitir_credito: true,
  });
});

test('trims whitespace and keeps optional fields when present', () => {
  const out = validateHistoria(base({
    nombre: '  Juan Pérez  ',
    telefono: ' 6621234567 ',
    liga_organizacion: ' Liga Norte ',
  }), 0);
  assert.equal(out.data.nombre, 'Juan Pérez');
  assert.equal(out.data.telefono, '6621234567');
  assert.equal(out.data.liga_organizacion, 'Liga Norte');
});

test('rejects a non-object payload', () => {
  assert.equal(validateHistoria(null, 0).error.field, 'body');
  assert.equal(validateHistoria('x', 0).error.field, 'body');
});

test('nombre: required, min 3, max 120', () => {
  assert.equal(validateHistoria(base({ nombre: '' }), 0).error.field, 'nombre');
  assert.equal(validateHistoria(base({ nombre: 'Jo' }), 0).error.field, 'nombre');
  assert.equal(validateHistoria(base({ nombre: '  a  ' }), 0).error.field, 'nombre');
  assert.equal(validateHistoria(base({ nombre: 'x'.repeat(121) }), 0).error.field, 'nombre');
  assert.ok('data' in validateHistoria(base({ nombre: 'x'.repeat(120) }), 0));
});

test('email: format required, lowercased, max 200', () => {
  assert.equal(validateHistoria(base({ email: 'no-arroba' }), 0).error.field, 'email');
  assert.equal(validateHistoria(base({ email: 'a@b' }), 0).error.field, 'email');
  assert.equal(validateHistoria(base({ email: 'con espacios@x.com' }), 0).error.field, 'email');
  assert.equal(validateHistoria(base({ email: `${'a'.repeat(195)}@ej.com` }), 0).error.field, 'email');
  assert.equal(validateHistoria(base({ email: undefined }), 0).error.field, 'email');
});

test('relacion and categoria_sugerida must be in their enums', () => {
  assert.equal(validateHistoria(base({ relacion: 'astronauta' }), 0).error.field, 'relacion');
  assert.equal(validateHistoria(base({ relacion: '' }), 0).error.field, 'relacion');
  assert.equal(validateHistoria(base({ categoria_sugerida: 'nba' }), 0).error.field, 'categoria_sugerida');
  assert.ok('data' in validateHistoria(base({ relacion: 'otro', categoria_sugerida: 'liga-mexicana' }), 0));
});

test('titulo: required, max 200', () => {
  assert.equal(validateHistoria(base({ titulo: '' }), 0).error.field, 'titulo');
  assert.equal(validateHistoria(base({ titulo: 'x'.repeat(201) }), 0).error.field, 'titulo');
  assert.ok('data' in validateHistoria(base({ titulo: 'x'.repeat(200) }), 0));
});

test('descripcion: min 50, max 3000', () => {
  assert.equal(validateHistoria(base({ descripcion: 'corta' }), 0).error.field, 'descripcion');
  assert.equal(validateHistoria(base({ descripcion: 'x'.repeat(49) }), 0).error.field, 'descripcion');
  assert.equal(validateHistoria(base({ descripcion: 'x'.repeat(3001) }), 0).error.field, 'descripcion');
  assert.ok('data' in validateHistoria(base({ descripcion: 'x'.repeat(3000) }), 0));
});

test('ciudad_estado: required, max 120', () => {
  assert.equal(validateHistoria(base({ ciudad_estado: '  ' }), 0).error.field, 'ciudad_estado');
  assert.equal(validateHistoria(base({ ciudad_estado: 'x'.repeat(121) }), 0).error.field, 'ciudad_estado');
});

test('autorizacion_general must be the literal string true', () => {
  assert.equal(validateHistoria(base({ autorizacion_general: 'false' }), 0).error.field, 'autorizacion_general');
  assert.equal(validateHistoria(base({ autorizacion_general: '' }), 0).error.field, 'autorizacion_general');
  assert.equal(validateHistoria(base({ autorizacion_general: 'on' }), 0).error.field, 'autorizacion_general');
});

// ==================== Minors flow (SEC-02-FIX-02) ====================

test('sin fotos: la pregunta de menores no aplica y ambos campos quedan null', () => {
  const out = validateHistoria(base({ fotos_incluyen_menores: 'true', autorizacion_menores: 'true' }), 0);
  assert.ok('data' in out);
  assert.equal(out.data.fotos_incluyen_menores, null);
  assert.equal(out.data.autorizacion_menores, null);
});

test('con fotos: la declaración de menores es obligatoria (true/false explícito)', () => {
  assert.equal(validateHistoria(base(), 1).error.field, 'fotos_incluyen_menores');
  assert.equal(validateHistoria(base({ fotos_incluyen_menores: 'si' }), 1).error.field, 'fotos_incluyen_menores');
  assert.equal(validateHistoria(base({ fotos_incluyen_menores: 'on' }), 2).error.field, 'fotos_incluyen_menores');
});

test('fotos SIN menores: se acepta sin autorización de menores', () => {
  const out = validateHistoria(base({ fotos_incluyen_menores: 'false' }), 2);
  assert.ok('data' in out);
  assert.equal(out.data.fotos_incluyen_menores, false);
  assert.equal(out.data.autorizacion_menores, null);
});

test('fotos CON menores: exige la autorización; sin ella rechaza', () => {
  assert.equal(
    validateHistoria(base({ fotos_incluyen_menores: 'true' }), 1).error.field,
    'autorizacion_menores'
  );
  assert.equal(
    validateHistoria(base({ fotos_incluyen_menores: 'true', autorizacion_menores: 'false' }), 1).error.field,
    'autorizacion_menores'
  );
  const out = validateHistoria(base({ fotos_incluyen_menores: 'true', autorizacion_menores: 'true' }), 1);
  assert.ok('data' in out);
  assert.equal(out.data.fotos_incluyen_menores, true);
  assert.equal(out.data.autorizacion_menores, true);
});

test('permitir_credito defaults to true and only false disables it', () => {
  assert.equal(validateHistoria(base({ permitir_credito: '' }), 0).data.permitir_credito, true);
  assert.equal(validateHistoria(base({ permitir_credito: 'false' }), 0).data.permitir_credito, false);
});
