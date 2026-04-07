// Cloudflare Turnstile verification middleware.
// Applied as a second layer (after `rejectBot` honeypot) to public form
// submission endpoints.
//
// Expects req.body.cf_turnstile_token from the client widget.
// If TURNSTILE_SECRET_KEY is unset (e.g. local dev without keys), verification
// is skipped with a warning.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not set — skipping token verification');
    return next();
  }

  const token = req.body && req.body.cf_turnstile_token;
  if (!token) {
    return res.status(400).json({ error: 'Captcha verification required. Please try again.' });
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (req.ip) params.append('remoteip', req.ip);

    const response = await fetch(VERIFY_URL, { method: 'POST', body: params });
    const result = await response.json();

    if (!result.success) {
      console.log('[Turnstile] Verification failed:', result['error-codes']);
      return res.status(403).json({ error: 'Captcha verification failed. Please refresh and try again.' });
    }

    next();
  } catch (err) {
    console.error('[Turnstile] Verification request error:', err);
    return res.status(500).json({ error: 'Captcha verification unavailable. Please try again later.' });
  }
}
