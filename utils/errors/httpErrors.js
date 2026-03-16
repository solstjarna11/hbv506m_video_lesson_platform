// helper constructors for common errors

const AppError = require('./AppError');

function forbiddenError(publicMessage = 'You are not allowed to access this resource.', metadata = {}) {
  return new AppError({
    message: 'Forbidden',
    statusCode: 403,
    code: 'FORBIDDEN',
    publicMessage,
    eventType: 'access_denied',
    severity: 'warn',
    isOperational: true,
    metadata,
  });
}

function notFoundError(publicMessage = 'The requested resource was not found.', metadata = {}) {
  return new AppError({
    message: 'Not found',
    statusCode: 404,
    code: 'NOT_FOUND',
    publicMessage,
    eventType: 'resource_not_found',
    severity: 'info',
    isOperational: true,
    metadata,
  });
}

function badRequestError(publicMessage = 'The request was invalid.', metadata = {}) {
  return new AppError({
    message: 'Bad request',
    statusCode: 400,
    code: 'BAD_REQUEST',
    publicMessage,
    eventType: 'bad_request',
    severity: 'warn',
    isOperational: true,
    metadata,
  });
}

function csrfError(metadata = {}) {
  return new AppError({
    message: 'Invalid CSRF token',
    statusCode: 403,
    code: 'CSRF_INVALID',
    publicMessage: 'Your session form token was invalid. Please try again.',
    eventType: 'csrf_violation',
    severity: 'warn',
    isOperational: true,
    metadata,
  });
}

module.exports = {
  forbiddenError,
  notFoundError,
  badRequestError,
  csrfError,
};