export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err.status || 500;
  const payload = {
    error: {
      message: status >= 500 ? 'Internal server error' : err.message,
      details: err.details
    }
  };

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
}
