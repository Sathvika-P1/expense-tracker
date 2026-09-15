export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to edit this expense.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
