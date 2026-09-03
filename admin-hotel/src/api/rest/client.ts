import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/lib/api';

/**
 * The REST client — the ONLY way the browser calls a REST endpoint. Requests
 * go to this app's own /api/rest BFF route handler, which injects the
 * Bearer token from the httpOnly admin_session cookie. Errors are
 * normalized to ApiError (backend ErrorCode) so form/toast error handling
 * stays uniform across GraphQL and REST.
 */
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
      throw new ApiError(body.message, body.code);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new ApiError('Network error — please check your connection.');
    }
    throw new ApiError(`Request failed with HTTP ${status ?? error.code ?? 'unknown error'}`);
  },
);
