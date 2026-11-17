const express = require('express');
const router = express.Router();
const { serviciosController } = require('./servicios.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { upload, handleUploadError } = require('../../middlewares/upload.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('SERVICIO_VER'), serviciosController.listar);
router.post('/', requirePermission('SERVICIO_CREAR'), upload.single('imagen'), handleUploadError, serviciosController.registrar);

module.exports = router;
