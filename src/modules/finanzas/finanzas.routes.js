const express = require('express');
const router = express.Router();
const finanzasController = require('./finanzas.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/conceptos', finanzasController.getConceptosGasto);
router.post('/conceptos', requirePermission('EXPENSA_CREAR'), finanzasController.createConceptoGasto);

router.get('/expensas', requirePermission('EXPENSA_VER'), finanzasController.listarExpensas);
router.get('/expensas/:id', requirePermission('EXPENSA_VER'), finanzasController.getExpensaById);
router.post('/expensas/generar', requirePermission('EXPENSA_CREAR'), finanzasController.generarExpensasMensuales);

router.get('/estado-cuenta/:unidad_id', requirePermission('EXPENSA_VER'), finanzasController.getEstadoDeCuenta);

module.exports = router;
