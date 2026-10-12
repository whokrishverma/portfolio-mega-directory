/* api/visitor.js
   Vercel serverless function: GET /api/visitor

   Assigns each anonymous visitor a global, lifetime-sequential number,
   at most once per Asia/Kolkata calendar day. Returning visitors on a
   NEW day receive a NEW lifetime number; the global counter never
   resets and never goes backwards.

   Storage: Upstash Redis (serverless, HTTP-based, atomic INCR).
   The check-then-increment is done with a single Lua script so it is
   race-free even under simultaneous requests (Redis runs scripts
   atomically/single-threaded) and idempotent against retries/duplicate
   requests for the same visitor+day.
*/

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// How long a "visitor seen today" record needs to live. A few days of
// slack is kept (rather than exactly 24h) purely so slightly-delayed
// cleanup jobs or clock skew can't cause a same-day duplicate; it has
// no effect on the lifetime counter, which is a separate, permanent key.
const DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 3;

// Atomic "claim a visitor number for this visitor+day, or return the
// one they already have" operation. KEYS[1] = per-day dedupe key,
// KEYS[2] = the permanent lifetime counter key, ARGV[1] = TTL seconds.
const CLAIM_SCRIPT = `
local dedupeKey = KEYS[1]
local counterKey = KEYS[2]
local ttl = tonumber(ARGV[1])

local existing = redis.call('GET', dedupeKey)
if existing then
  return existing
end

local newNumber = redis.call('INCR', counterKey)
redis.call('SET', dedupeKey, newNumber, 'EX', ttl)
return newNumber
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VISITOR_DAY_TIMEZONE = 'Asia/Kolkata';

function currentVisitorDate() {
  // "en-CA" formats as YYYY-MM-DD, giving a clean, sortable date string
  // for whatever the current date is in the visitor-day timezone.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VISITOR_DAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // The client only ever supplies an opaque anonymous identifier.
  // The server alone decides the date and the assigned number.
  const rawId = req.headers['x-visitor-id'];
  if (typeof rawId !== 'string' || !UUID_RE.test(rawId)) {
    res.status(400).json({ error: 'invalid_visitor_id' });
    return;
  }

  try {
    const day = currentVisitorDate();
    const dedupeKey = `visitor:day:${day}:${rawId}`;
    const counterKey = 'visitor:lifetime_counter';

    const visitorNumber = await redis.eval(
      CLAIM_SCRIPT,
      [dedupeKey, counterKey],
      [String(DEDUPE_TTL_SECONDS)]
    );

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ visitorNumber: Number(visitorNumber) });
  } catch (err) {
    console.error('visitor api error:', err);
    res.status(503).json({ error: 'temporarily_unavailable' });
  }
}
