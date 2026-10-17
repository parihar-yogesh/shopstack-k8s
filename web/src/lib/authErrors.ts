import { ApiError } from './api';

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}