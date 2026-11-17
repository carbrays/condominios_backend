const fs = require('fs');
const path = require('path');
const env = require('../config/env');

class StorageService {
  constructor() {
    this.driver = env.STORAGE.driver;
    this.localPath = env.STORAGE.localPath;
    this.baseUrl = env.STORAGE.baseUrl;

    if (this.driver === 'local') {
      if (!fs.existsSync(this.localPath)) {
        fs.mkdirSync(this.localPath, { recursive: true });
      }
      // Subdirectorios para comprobantes, recibos, etc.
      ['comprobantes', 'recibos', 'documentos', 'fotografias', 'qrs'].forEach(sub => {
        const subPath = path.join(this.localPath, sub);
        if (!fs.existsSync(subPath)) {
          fs.mkdirSync(subPath, { recursive: true });
        }
      });
    }
  }

  /**
   * Guarda un archivo y retorna su URL relativa o accesible
   */
  async saveFile(file, subfolder = 'documentos') {
    if (!file) return null;

    if (this.driver === 'local') {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
      const targetDir = path.join(this.localPath, subfolder);
      const targetPath = path.join(targetDir, filename);

      if (file.buffer) {
        fs.writeFileSync(targetPath, file.buffer);
      } else if (file.path) {
        fs.copyFileSync(file.path, targetPath);
        fs.unlinkSync(file.path);
      }

      return `/uploads/${subfolder}/${filename}`;
    }

    // Driver extensible para R2 / S3
    throw new Error(`Driver de almacenamiento no implementado: ${this.driver}`);
  }

  /**
   * Obtiene la ruta física local si existe
   */
  getLocalFilePath(relativePath) {
    if (!relativePath) return null;
    const cleanPath = relativePath.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.localPath, cleanPath);
    return fs.existsSync(fullPath) ? fullPath : null;
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(relativePath) {
    if (!relativePath) return;
    if (this.driver === 'local') {
      const fullPath = this.getLocalFilePath(relativePath);
      if (fullPath && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}

module.exports = new StorageService();
