const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Rutas protegidas
router.get('/me', authenticateJWT, authController.me);
router.get('/condominios', authenticateJWT, authController.getCondominios);
router.post('/condominio/seleccionar', authenticateJWT, authController.seleccionarCondominio);
router.post('/dispositivo', authenticateJWT, authController.registrarDispositivo);

module.exports = router;
