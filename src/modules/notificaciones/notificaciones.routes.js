const express = require('express');
const router = express.Router();
const { notificacionesController } = require('./notificaciones.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');

router.use(authenticateJWT);

router.get('/', notificacionesController.listar);
router.patch('/:id/leida', notificacionesController.marcarLeida);
router.post('/marcar-todas-leidas', notificacionesController.marcarTodasLeidas);

module.exports = router;
