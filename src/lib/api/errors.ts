export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string) {
    return new ApiError('BAD_REQUEST', message, 400);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static notFound(message: string = 'Not found') {
    return new ApiError('NOT_FOUND', message, 404);
  }

  static conflict(message: string) {
    return new ApiError('CONFLICT', message, 409);
  }

  static unprocessableEntity(message: string) {
    return new ApiError('UNPROCESSABLE_ENTITY', message, 422);
  }

  static internalServerError(message: string = 'Internal server error') {
    return new ApiError('INTERNAL_SERVER_ERROR', message, 500);
  }
}