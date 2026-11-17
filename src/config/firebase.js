const admin = require('firebase-admin');
const fs = require('fs');
const env = require('./env');

let firebaseApp = null;
let isConfigured = false;

try {
  if (env.FIREBASE.serviceAccountPath && fs.existsSync(env.FIREBASE.serviceAccountPath)) {
    const serviceAccount = require(env.FIREBASE.serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isConfigured = true;
    console.log('[FIREBASE] Inicializado con archivo serviceAccountKey.');
  } else if (env.FIREBASE.projectId && env.FIREBASE.clientEmail && env.FIREBASE.privateKey) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE.projectId,
        clientEmail: env.FIREBASE.clientEmail,
        privateKey: env.FIREBASE.privateKey
      })
    });
    isConfigured = true;
    console.log('[FIREBASE] Inicializado con variables de entorno.');
  } else {
    console.log('[FIREBASE] Modo de desarrollo local activo (credenciales de FCM no provistas).');
  }
} catch (err) {
  console.warn('[FIREBASE WARNING] Error inicializando Firebase Admin SDK:', err.message);
}

module.exports = {
  admin,
  firebaseApp,
  isConfigured: () => isConfigured
};
