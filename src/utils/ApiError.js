class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", errors = [], stack = '') {
      super(message); // pass message to built-in Error class (this.message=message)
  
      // custom properties you are adding:
      this.statusCode = statusCode; // example: 404, 500
      this.data = null;             // optional: you can use this to pass extra info
      this.message = message;       // not strictly needed because super(message) already does this
      this.success = false;         // for the frontend to know this is a failure
      this.erros = errors;          // ❌ Typo: should be `errors`
  
      // stack = where the error happened in the code (used for debugging)
      if (stack) {
        this.stack = stack; // if a custom stack trace is passed, use it
      } else {
        Error.captureStackTrace(this, this.constructor); // otherwise generate automatically
      }
    }
  }
  
  export { ApiError };
  