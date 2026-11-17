const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('Cifrado y verificación de contraseñas con bcrypt', async () => {
  const plain = 'password123';
  const hash = await bcrypt.hash(plain, 10);

  assert.notEqual(plain, hash);
  const match = await bcrypt.compare(plain, hash);
  assert.equal(match, true);

  const wrong = await bcrypt.compare('wrongPassword', hash);
  assert.equal(wrong, false);
});

test('Generación y verificación de JWT con contexto de usuario y condominio', () => {
  const secret = 'test_secret_for_unit_tests_32_characters!';
  const payload = {
    usuarioId: 1,
    personaId: 1,
    ci: '1000001',
    condominioId: 10,
    rolId: 'ADMINISTRADOR'
  };

  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);

  assert.equal(decoded.usuarioId, 1);
  assert.equal(decoded.ci, '1000001');
  assert.equal(decoded.condominioId, 10);
  assert.equal(decoded.rolId, 'ADMINISTRADOR');
});

test('Evaluación de permisos granulares por rol', () => {
  const permisosAdministrador = new Set(['CONDOMINIO_VER', 'EXPENSA_CREAR', 'PAGO_VALIDAR']);
  const permisosInquilino = new Set(['CONDOMINIO_VER', 'RESERVA_CREAR']);

  // Admin puede validar pagos
  assert.equal(permisosAdministrador.has('PAGO_VALIDAR'), true);
  // Inquilino no puede validar pagos
  assert.equal(permisosInquilino.has('PAGO_VALIDAR'), false);
  // Ambos pueden ver condominio
  assert.equal(permisosAdministrador.has('CONDOMINIO_VER'), true);
  assert.equal(permisosInquilino.has('CONDOMINIO_VER'), true);
});
