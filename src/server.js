const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./services/socket.service');
const { pool } = require('./config/db');

const server = http.createServer(app);

// Inicializar Socket.IO
initSocket(server);

// Probar conexión a la base de datos al arrancar
pool.query('SELECT NOW()')
  .then(() => {
    console.log('[POSTGRESQL] Conexión a la base de datos establecida exitosamente.');
  })
  .catch((err) => {
    console.warn('[POSTGRESQL WARNING] No se pudo conectar de inmediato a la base de datos:', err.message);
  });

server.listen(env.PORT, () => {
  console.log(`=======================================================`);
  console.log(`  SISTEMA INTEGRAL DE GESTIÓN DE CONDOMINIOS - BACKEND `);
  console.log(`  Servidor activo en: http://localhost:${env.PORT}        `);
  console.log(`  Entorno: ${env.NODE_ENV}                               `);
  console.log(`  Socket.IO: Activo                                    `);
  console.log(`=======================================================`);
});

module.exports = server;
