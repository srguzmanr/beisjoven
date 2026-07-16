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

test('autorizacion_menores: null without photos, boolean with photos', () => {
  assert.equal(validateHistoria(base({ autorizacion_menores: 'true' }), 0).data.autorizacion_menores, null);
  assert.equal(validateHistoria(base({ autorizacion_menores: 'true' }), 2).data.autorizacion_menores, true);
  assert.equal(validateHistoria(base({ autorizacion_menores: '' }), 2).data.autorizacion_menores, false);
  assert.equal(validateHistoria(base({ autorizacion_menores: 'false' }), 2).data.autorizacion_menores, false);
});

test('permitir_credito defaults to true and only false disables it', () => {
  assert.equal(validateHistoria(base({ permitir_credito: '' }), 0).data.permitir_credito, true);
  assert.equal(validateHistoria(base({ permitir_credito: 'false' }), 0).data.permitir_credito, false);
});
