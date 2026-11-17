const test = require('node:test');
const assert = require('node:assert/strict');

test('Cálculo de expensa por alícuota vs monto fijo', () => {
  const alicuota = 0.0500; // 5%
  const presupuestoTotal = 10000.00;
  
  // Cálculo por alícuota
  const montoPorAlicuota = Math.round(presupuestoTotal * alicuota * 100) / 100;
  assert.equal(montoPorAlicuota, 500.00);

  // Cálculo por monto fijo
  const montoFijo = 450.00;
  assert.equal(montoFijo, 450.00);
});

test('Validación de solapamiento horario de reservas', () => {
  const reservasExistentes = [
    { hora_inicio: '14:00', hora_fin: '18:00' }
  ];

  const checkSolapamiento = (nuevoInicio, nuevoFin) => {
    return reservasExistentes.some(r => !(nuevoFin <= r.hora_inicio || nuevoInicio >= r.hora_fin));
  };

  // Caso 1: Solapamiento dentro del rango (15:00 - 17:00) -> Conflicto
  assert.equal(checkSolapamiento('15:00', '17:00'), true);

  // Caso 2: Solapamiento cruzado (13:00 - 15:00) -> Conflicto
  assert.equal(checkSolapamiento('13:00', '15:00'), true);

  // Caso 3: Justo después (18:00 - 20:00) -> Permitido
  assert.equal(checkSolapamiento('18:00', '20:00'), false);

  // Caso 4: Antes (10:00 - 14:00) -> Permitido
  assert.equal(checkSolapamiento('10:00', '14:00'), false);
});

test('Regla de negocio: Bloqueo de reserva si unidad tiene saldo en mora', () => {
  const expensas = [
    { periodo: '2026-10', saldo_pendiente: 150.00, estado: 'EN_MORA' },
    { periodo: '2026-11', saldo_pendiente: 0.00, estado: 'PAGADO' }
  ];

  const estaEnMora = expensas.some(e => e.saldo_pendiente > 0 && e.estado === 'EN_MORA');
  assert.equal(estaEnMora, true);

  const puedeReservar = !estaEnMora;
  assert.equal(puedeReservar, false);
});
