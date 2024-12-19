// Error logging
export function logError(error) {
  console.error('Error:', error);
  
  // TODO: Send error to server for logging
}

// Security event logging  
export function logSecurityEvent(event, details = {}) {
  console.log(`Security Event: ${event}`, details);
  
  // TODO: Send security event to server for logging and monitoring
}

// Audit trail
const auditTrail = [];

export function logAuditEvent(event, details = {}) {
  const auditEvent = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };
  
  auditTrail.push(auditEvent);
  
  console.log('Audit Event:', auditEvent);
  
  // TODO: Send audit event to server for persistent storage
}

// Get the audit trail
export function getAuditTrail() {
  return auditTrail;
}

// Clear the audit trail
export function clearAuditTrail() {
  auditTrail.length = 0;
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }  
}

export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
} 