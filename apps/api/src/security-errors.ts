export class SecurityError extends Error {
  constructor(public status: number, message: string, public code = "ACCESS_DENIED") { super(message); }
}
