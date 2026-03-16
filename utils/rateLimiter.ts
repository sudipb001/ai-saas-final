type RateLimitRecord = {
  count: number;
  lastReset: number;
};

const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000;

const requests: Map<string, RateLimitRecord> = new Map();

export function checkRateLimit(userId: string) {
  const now = Date.now();

  const record = requests.get(userId);

  if (!record) {
    requests.set(userId, {
      count: 1,
      lastReset: now,
    });

    return true;
  }

  if (now - record.lastReset > WINDOW_MS) {
    requests.set(userId, {
      count: 1,
      lastReset: now,
    });

    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;

  requests.set(userId, record);

  return true;
}
