import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/lib/api';

/**
 * The REST client — the ONLY way the browser calls a REST endpoint in the
 * back-office. Requests go to this app's own /api/rest BFF route handler,
 * which injects the Bearer token from the httpOnly bo_session cookie and
 * forwards to the backend. Errors are normalized to the same ApiError
 * (with the backend ErrorCode) the GraphQL path uses, so the UI's
 * MutationError/FormError components keep working unchanged.
 */

interface ApiErrorEnvelope {
  code?: string;
  message?: string;
}

export const restClient: AxiosInstance = axios.create({
  baseURL: '/api/rest',
  timeout: 30_000,
});

restClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorEnvelope>) => {
    const status = error.response?.status;
    const body = error.response?.data;
    if (body?.code && body.message) {
      throw new ApiError(body.message, body.code);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new ApiError('Network error — please check your connection');
    }
    throw new ApiError(`Request failed with HTTP ${status ?? error.code ?? 'unknown error'}`);
  }
);
