const express = require('express');
const router = express.Router();
const conserjeriaController = require('./conserjeria.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { upload, handleUploadError } = require('../../middlewares/upload.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

// Visitas
router.get('/visitas', requirePermission('CONSERJERIA_VER'), conserjeriaController.listarVisitas);
router.post('/visitas', requirePermission('CONSERJERIA_GESTIONAR'), conserjeriaController.registrarVisita);
router.patch('/visitas/:id/salida', requirePermission('CONSERJERIA_GESTIONAR'), conserjeriaController.registrarSalidaVisita);

// Paquetería
router.get('/paqueteria', requirePermission('CONSERJERIA_VER'), conserjeriaController.listarPaqueteria);
router.post('/paqueteria', requirePermission('CONSERJERIA_GESTIONAR'), upload.single('fotografia'), handleUploadError, conserjeriaController.registrarPaquete);
router.patch('/paqueteria/:id/entregar', requirePermission('CONSERJERIA_GESTIONAR'), conserjeriaController.entregarPaquete);

// Bitácora
router.get('/bitacora', requirePermission('CONSERJERIA_VER'), conserjeriaController.listarBitacora);
router.post('/bitacora', requirePermission('CONSERJERIA_GESTIONAR'), upload.single('adjunto'), handleUploadError, conserjeriaController.registrarBitacora);

// Pases QR
router.post('/qr/generar', conserjeriaController.generarPaseQR);
router.post('/qr/validar', requirePermission('CONSERJERIA_GESTIONAR'), conserjeriaController.validarPaseQR);

// Sincronización Offline
router.post('/offline/sync', requirePermission('CONSERJERIA_GESTIONAR'), conserjeriaController.sincronizarOffline);

module.exports = router;
