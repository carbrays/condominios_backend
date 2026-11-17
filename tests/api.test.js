const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('GET /health devuelve estado ONLINE', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'ONLINE');
  assert.ok(res.body.timestamp);
});

test('POST /api/v1/auth/login sin credenciales devuelve 400', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'CREDENTIALS_REQUIRED');
});

test('Ruta inexistente devuelve 404 estructurado', async () => {
  const res = await request(app).get('/api/v1/ruta_inexistente');
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'NOT_FOUND');
});

test('GET /api/v1/unidades sin autenticación devuelve 401', async () => {
  const res = await request(app).get('/api/v1/unidades');
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'UNAUTHORIZED');
});
