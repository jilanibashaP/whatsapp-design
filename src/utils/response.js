function response(data, meta = {}) {
  return { data, meta };
}

/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {object} data - Data to send in response
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {object} errors - Additional error details
 */
function errorResponse(res, message = 'An error occurred', statusCode = 500, errors = null) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    message,
    ...(errors && { errors })
  });
}

module.exports = { response, successResponse, errorResponse };
