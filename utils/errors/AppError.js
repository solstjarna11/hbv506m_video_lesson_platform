/**
 * This class is meant as a consistent object for “expected” failures like forbidden/not-found/invalid input.
 * 
 */

class AppError extends Error {
  constructor({
    message,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    publicMessage = 'Something went wrong.',
    eventType = 'server_error',
    severity = 'error',
    isOperational = true,
    metadata = {},
  }) {
    super(message || publicMessage);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.publicMessage = publicMessage;
    this.eventType = eventType;
    this.severity = severity;
    this.isOperational = isOperational;
    this.metadata = metadata;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;