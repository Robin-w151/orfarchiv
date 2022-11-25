export class ContentNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export class OptimizedContentIsEmptyError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
