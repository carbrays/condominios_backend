const multer = require('multer');
const path = require('path');
const { errorResponse } = require('../utils/response.util');

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf'
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Formatos aceptados: JPG, PNG, WEBP, PDF`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB límite
  },
  fileFilter
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'El archivo excede el tamaño máximo permitido (10MB)', 'FILE_TOO_LARGE', 400);
    }
    return errorResponse(res, `Error en subida de archivo: ${err.message}`, 'UPLOAD_ERROR', 400);
  } else if (err) {
    return errorResponse(res, err.message, 'INVALID_FILE_TYPE', 400);
  }
  next();
};

module.exports = {
  upload,
  handleUploadError
};
