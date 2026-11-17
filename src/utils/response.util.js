/**
 * Utilidad para respuestas estándar de la API
 */
const successResponse = (res, data = {}, message = 'Operación realizada correctamente', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message = 'Ocurrió un error en el servidor', code = 'INTERNAL_ERROR', statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    data
  });
};

const paginateResponse = (res, items = [], total = 0, page = 1, limit = 20, message = 'Consulta exitosa') => {
  const pages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        pages
      }
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginateResponse
};
