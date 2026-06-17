import { serverEnv } from '@/lib/env';

const DEFAULT_SLOW_THRESHOLD_MS = 50;
const IS_PRODUCTION = serverEnv.NODE_ENV === 'production';
const FORCE_ENABLE_RUNTIME_LOGS = serverEnv.ENABLE_RUNTIME_LOGS === 'true';
const RUNTIME_LOGS_ENABLED = !IS_PRODUCTION || FORCE_ENABLE_RUNTIME_LOGS;

type LatencyMetadataValue = string | number | boolean | null | undefined;

type LatencyLogParams = {
  scope: string;
  label: string;
  startTime: number;
  slowThresholdMs?: number;
  metadata?: Record<string, LatencyMetadataValue>;
};

type ErrorLogParams = {
  scope: string;
  label: string;
  error: unknown;
  metadata?: Record<string, LatencyMetadataValue>;
};

function nowMs() {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }

  return Date.now();
}

function formatMetadata(metadata?: Record<string, LatencyMetadataValue>) {
  if (!metadata) {
    return '';
  }

  const pairs = Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);

  if (pairs.length === 0) {
    return '';
  }

  return ` | ${pairs.join(' ')}`;
}

export function startLatencyTimer() {
  return nowMs();
}

export function isRuntimeLoggingEnabled() {
  return RUNTIME_LOGS_ENABLED;
}

export function logLatency({
  scope,
  label,
  startTime,
  slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
  metadata,
}: LatencyLogParams) {
  const duration = Math.round(nowMs() - startTime);

  if (!RUNTIME_LOGS_ENABLED) {
    return duration;
  }

  const metadataLabel = formatMetadata(metadata);
  const message = `[${scope}] ${label} took ${duration}ms${metadataLabel}`;

  if (duration > slowThresholdMs) {
    console.warn(`[${scope} SLOW] ${label} took ${duration}ms${metadataLabel}`);
  } else {
    console.info(message);
  }

  return duration;
}

export function logError({ scope, label, error, metadata }: ErrorLogParams) {
  if (!RUNTIME_LOGS_ENABLED) {
    return;
  }

  const metadataLabel = formatMetadata(metadata);
  console.error(`[${scope} ERROR] ${label}${metadataLabel}`, error);
}
