// Helper untuk format response yang konsisten di seluruh API.
// Tim mobile bisa selalu expect struktur yang sama.

const success = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

const error = (res, message, statusCode = 400, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  })
}

module.exports = { success, error }
