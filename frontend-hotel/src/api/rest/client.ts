import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * The REST client — the ONLY way the browser calls a REST endpoint.
 *
 * Every request goes to this app's own /api/rest route handler (the BFF),
 * which injects the Bearer token from the httpOnly session cookie server-side
 * and forwards to the backend — the browser never sees the token and never
 * learns the backend URL.
 *
 * Errors are normalized to ApiError carrying the backend's ErrorCode
 * (NOT_FOUND, FORBIDDEN, CONFLICT, VALIDATION, UNAUTHORIZED, ...) so UI code
 * branches on `code` exactly like it does for GraphqlClientError.
 */

export class ApiError extends Error {
  /** Backend ErrorCode (NOT_FOUND, VALIDATION, CONFLICT, ...); undefined for
      transport-level failures (network, non-JSON response). */
  readonly code?: string;
  /** HTTP status when the backend answered; undefined for network failures. */
  readonly status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface ApiErrorEnvelope {
  code?: string;
  message?: string;
}

export const restClient: AxiosInstance = axios.create({
  baseURL: '/api/rest',
  timeout: 30_000,
});

/** Requests that use `responseType: 'arraybuffer'` (PDF downloads) get an
    ArrayBuffer back for error responses too — the backend's JSON error
    envelope needs decoding before the code/message can be read. */
function decodeErrorBody(data: unknown): ApiErrorEnvelope | undefined {
  if (!data) return undefined;
  if (!(data instanceof ArrayBuffer)) return data as ApiErrorEnvelope;
  try {
    return JSON.parse(new TextDecoder().decode(data)) as ApiErrorEnvelope;
  } catch {
    return undefined;
  }
}

restClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorEnvelope>) => {
    const status = error.response?.status;
    const body = decodeErrorBody(error.response?.data);
    if (body?.code && body.message) {
      throw new ApiError(body.message, body.code, status);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new ApiError('Network error — please check your connection', undefined, status);
    }
    throw new ApiError(
      `Request failed with HTTP ${status ?? error.code ?? 'unknown error'}`,
      undefined,
      status
    );
  }
);
