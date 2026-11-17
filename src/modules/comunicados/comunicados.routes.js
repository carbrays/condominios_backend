const express = require('express');
const router = express.Router();
const { comunicadosController } = require('./comunicados.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { upload, handleUploadError } = require('../../middlewares/upload.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('COMUNICADO_VER'), comunicadosController.listar);
router.post('/', requirePermission('COMUNICADO_CREAR'), upload.single('adjunto'), handleUploadError, comunicadosController.publicar);

module.exports = router;
