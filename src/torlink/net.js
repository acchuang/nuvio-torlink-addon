const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

class HttpError extends Error {
  constructor(status, message) {
    super(message || `HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

const RETRY_STATUS = [408, 425, 429, 500, 502, 503, 504];
const FETCH_TIMEOUT_MS = 15000;

// ponytail: no AbortController in Hermes-safe path; the race just stops waiting
function withTimeout(promise, ms, url) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new HttpError(0, `Timeout after ${ms}ms: ${url}`)), ms),
    ),
  ]);
}

async function fetchResilient(url, init = {}) {
  const { retries = 1, ...rest } = init;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(fetch(url, rest), FETCH_TIMEOUT_MS, url);
      if (!RETRY_STATUS.includes(res.status)) return res;
      lastError = new HttpError(res.status, `${url} returned ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

function qs(params) {
  return Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
}

module.exports = { USER_AGENT, HttpError, fetchResilient, qs };
