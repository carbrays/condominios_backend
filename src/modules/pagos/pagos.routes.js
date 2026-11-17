const express = require('express');
const router = express.Router();
const pagosController = require('./pagos.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { upload, handleUploadError } = require('../../middlewares/upload.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/cuentas', pagosController.getCuentasBancarias);
router.post('/cuentas', requirePermission('PAGO_VALIDAR'), upload.single('qr_imagen'), handleUploadError, pagosController.createCuentaBancaria);

router.get('/', requirePermission('PAGO_VER'), pagosController.listar);
router.get('/:id', requirePermission('PAGO_VER'), pagosController.findById);

// Residentes suben pago
router.post('/subir', requirePermission('PAGO_CREAR'), upload.single('comprobante'), handleUploadError, pagosController.registrarPago);

// Admin valida pago
router.post('/:id/validar', requirePermission('PAGO_VALIDAR'), pagosController.validarPago);

module.exports = router;
