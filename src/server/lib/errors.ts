/** Domain-level errors thrown by services, mapped to HTTP by the route layer. */
export class NotFoundError extends Error {
  constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

/** Creating something that already exists, e.g. signing up with a taken user id. */
export class ConflictError extends Error {
  constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super(`${resource} already exists: ${id}`);
    this.name = 'ConflictError';
  }
}

/** The operation needs a signed-in user and the request has none. */
export class UnauthorizedError extends Error {
  constructor() {
    super('authentication required');
    this.name = 'UnauthorizedError';
  }
}
