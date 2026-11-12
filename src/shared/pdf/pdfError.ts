import { ClientResponseError } from 'pocketbase';

export class PdfGenerationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function describePdfError(
  cause: unknown,
  fallbackReadMessage = 'No se pudo consultar el documento.',
  fallbackPrepareMessage = 'No se pudo preparar el documento.',
): string {
  if (cause instanceof ClientResponseError) {
    return String(cause.response?.message || fallbackReadMessage);
  }
  if (cause instanceof Error) {
    return cause.message;
  }
  return fallbackPrepareMessage;
}
