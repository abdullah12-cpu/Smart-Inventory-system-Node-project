/**
 * Authentication: password hashing and signed session tokens.
 *
 * Replaces two things that were not actually protecting anything:
 *
 *   1. Passwords were stored and compared in PLAIN TEXT. Anyone with read access to the
 *      users table -- a backup, a log, a SQL injection elsewhere -- had every credential.
 *
 *   2. Privileged endpoints trusted a `portal_role` field sent in the REQUEST BODY. Since
 *      the client supplies that field, sending {"portal_role":"ADMIN"} was enough to approve,
 *      reject or ship any order with no credentials whatsoever. Role now comes from a
 *      server-signed token, which a client cannot forge without the secret.
 *
 * Existing plain-text passwords are migrated lazily: the first successful login re-hashes
 * that user's password in place. No password resets, no downtime, no migration script --
 * and every account converts itself the next time its owner signs in.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '12h';

// A fixed fallback would mean tokens signed on one machine are accepted on another, so a
// leaked repo would equal a master key. Generating a random secret at boot when none is
// configured keeps a misconfigured deployment safe-by-default; the cost is that restarting
// invalidates existing sessions, which is the right trade for a missing setting.
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn(
    '[auth] JWT_SECRET is not set — using a random secret generated at startup. ' +
    'Sessions will be invalidated on every restart. Set JWT_SECRET in apps/api/.env for production.'
  );
}

/** bcrypt hashes start with $2a$/$2b$/$2y$; anything else is a legacy plain-text value. */
function isHashed(stored) {
  return typeof stored === 'string' && /^\$2[aby]\$/.test(stored);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verifies a password against whatever is stored, upgrading legacy plain-text values.
 *
 * @returns {Promise<{ok: boolean, upgradedHash: string|null}>} `upgradedHash` is set when the
 *          caller should persist a newly computed hash for this user.
 */
async function verifyPassword(plain, stored) {
  if (!plain || !stored) return { ok: false, upgradedHash: null };

  if (isHashed(stored)) {
    return { ok: await bcrypt.compare(plain, stored), upgradedHash: null };
  }

  // Legacy plain-text row. Compare directly, then hand back a hash to store.
  if (plain === stored) {
    return { ok: true, upgradedHash: await hashPassword(plain) };
  }
  return { ok: false, upgradedHash: null };
}

/** Signs a session token. Only non-secret identity claims go in -- tokens are readable. */
function signToken(user) {
  return jwt.sign(
    { sub: user.email, email: user.email, role: user.role, user_id: user.user_id },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function extractToken(req) {
  const header = req.headers?.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Rejects the request unless it carries a valid token. On success attaches `req.auth`
 * ({ email, role, user_id }) -- handlers must read identity from there, never from the body.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  const claims = token && verifyToken(token);
  if (!claims) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in again.' });
  }
  req.auth = { email: claims.email, role: claims.role, user_id: claims.user_id };
  next();
}

/**
 * Attaches `req.auth` when a valid token is present, but never rejects the request.
 *
 * For endpoints that serve both signed-in and anonymous callers -- the chat routes, where
 * the public landing page runs a guest product assistant. Handlers must still read identity
 * from `req.auth` and treat its absence as "guest", never falling back to an email supplied
 * in the request body: doing so let an anonymous caller read any account's data by naming it.
 */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  const claims = token && verifyToken(token);
  if (claims) req.auth = { email: claims.email, role: claims.role, user_id: claims.user_id };
  next();
}

/** Use after requireAuth. Roles are compared case-insensitively. */
function requireRole(...allowed) {
  const allow = allowed.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const role = String(req.auth?.role || '').toLowerCase();
    if (!allow.includes(role)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  isHashed,
  signToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRole,
};
