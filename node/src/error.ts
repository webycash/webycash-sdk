import { WebycashErrorCode } from "./types.js";

/** Error thrown by all webycash-sdk operations. */
export class WebycashError extends Error {
  readonly code: WebycashErrorCode;
  override readonly name = "WebycashError";

  constructor(code: WebycashErrorCode, message: string) {
    super(message);
    this.code = code;
  }

  get isInsufficientFunds(): boolean {
    return this.code === WebycashErrorCode.InsufficientFunds;
  }
  get isNetworkError(): boolean {
    return this.code === WebycashErrorCode.NetworkError;
  }
  get isServerError(): boolean {
    return this.code === WebycashErrorCode.ServerError;
  }
}
