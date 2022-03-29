export default class HttpError extends Error {
  public code: number;

  public errorMessage: string |null;

  public statusText: string;

  public type: string;

  constructor(code:number, message:string|null, type: string, statusText:string) {
    super(message || '');
    this.errorMessage = message;
    this.type = type;
    this.statusText = statusText;
    this.code = code;
  }
}
