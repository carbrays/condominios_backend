const { admin, isConfigured } = require('../config/firebase');

class FirebaseService {
  /**
   * Envía notificación push a un token de dispositivo
   */
  async sendToDevice(token, { title, body, data = {} }) {
    if (!token) return false;

    if (!isConfigured()) {
      console.log(`[FIREBASE DEV MOCK] Push enviado a token ${token.substring(0, 15)}... | Título: ${title} | Body: ${body}`);
      return true;
    }

    try {
      const message = {
        token,
        notification: {
          title,
          body
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        )
      };

      const response = await admin.messaging().send(message);
      console.log('[FIREBASE] Push enviado exitosamente:', response);
      return true;
    } catch (error) {
      console.error('[FIREBASE ERROR] Error enviando push:', error.message);
      return false;
    }
  }

  /**
   * Envía notificación a múltiples tokens
   */
  async sendToMultiple(tokens, { title, body, data = {} }) {
    if (!tokens || tokens.length === 0) return false;

    if (!isConfigured()) {
      console.log(`[FIREBASE DEV MOCK] Push enviado a ${tokens.length} dispositivos | Título: ${title}`);
      return true;
    }

    try {
      const message = {
        tokens,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        )
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`[FIREBASE] Push multicast exitoso: ${response.successCount} enviados, ${response.failureCount} fallidos`);
      return response;
    } catch (error) {
      console.error('[FIREBASE ERROR] Error enviando multicast:', error.message);
      return false;
    }
  }
}

module.exports = new FirebaseService();
