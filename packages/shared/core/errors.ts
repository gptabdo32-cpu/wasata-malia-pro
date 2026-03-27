type ErrorWithCaptureStackTrace = ErrorConstructor & {
  captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
};

export abstract class SharedAppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    const ErrorCtor = Error as ErrorWithCaptureStackTrace;
    ErrorCtor.captureStackTrace?.(this, new.target);
  }
}

export class UnauthorizedError extends SharedAppError {
  constructor(message = "Unauthorized access") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends SharedAppError {
  constructor(message = "Access forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends SharedAppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ValidationError extends SharedAppError {
  constructor(message = "Validation failed") {
    super(message, "VALIDATION_ERROR", 400);
  }
}
