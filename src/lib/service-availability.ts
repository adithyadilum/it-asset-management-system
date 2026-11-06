export const SERVICE_UNAVAILABLE_MESSAGE =
  'The service is temporarily unavailable. Please try again in a moment.';

/** Infrastructure failure, distinct from missing or revoked credentials. */
export class ServiceUnavailableError extends Error {
  readonly code = 'SERVICE_UNAVAILABLE';
  constructor() {
    super(SERVICE_UNAVAILABLE_MESSAGE);
    this.name = 'ServiceUnavailableError';
  }
}
