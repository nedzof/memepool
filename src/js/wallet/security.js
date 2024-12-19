import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes 
const RATE_LIMIT_MAX = 100; // 100 requests per window

// Rate limiter middleware
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.whatsonchain.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  dnsPrefetchControl: {
    allow: false
  },
  frameguard: {
    action: 'deny'
  },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  xssFilter: true
});

// HTTPS-only cookies middleware
export const httpsOnlyCookies = (req, res, next) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isSecure) {
    res.setHeader('Set-Cookie', `${res.getHeader('Set-Cookie')}; Secure`);
  }
  next();
};

// Brute force protection
const loginAttempts = new Map();

export function recordLoginAttempt(identifier) {
  const attempts = loginAttempts.get(identifier) || 0;
  loginAttempts.set(identifier, attempts + 1);
}

export function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier);  
}

export function isLoginBlocked(identifier) {
  const MAX_ATTEMPTS = 5;
  const attempts = loginAttempts.get(identifier);
  return attempts && attempts >= MAX_ATTEMPTS;
}

// Suspicious activity monitoring
export function monitorSuspiciousActivity(req) {
  // TODO: Implement logic to detect and log suspicious requests
  // For example:
  // - Repeated failed login attempts from the same IP
  // - Requests with invalid or missing CSRF tokens
  // - Abnormal request patterns (e.g. high volume, odd user agents)
  
  // Log suspicious activity
  console.warn('Suspicious activity detected:', req);
} 