const express = require('express');
const router = express.Router();
const { incidenciasController } = require('./incidencias.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { upload, handleUploadError } = require('../../middlewares/upload.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('INCIDENCIA_VER'), incidenciasController.listar);
router.get('/:id', requirePermission('INCIDENCIA_VER'), incidenciasController.findById);
router.post('/', requirePermission('INCIDENCIA_CREAR'), upload.single('fotografia'), handleUploadError, incidenciasController.crear);
router.patch('/:id/estado', requirePermission('INCIDENCIA_GESTIONAR'), incidenciasController.actualizarEstado);
router.delete('/:id', requirePermission('INCIDENCIA_GESTIONAR'), incidenciasController.eliminar);
router.post('/:id/comentarios', upload.single('adjunto'), handleUploadError, incidenciasController.agregarComentario);

module.exports = router;
