import { v4 as uuidv4 } from 'uuid';
import { logSecurityEvent } from '../../errors.js';

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Create a new session
export function createSession(sessionData) {
  const sessionId = uuidv4();
  const expiresAt = Date.now() + SESSION_DURATION;
  
  const session = {
    ...sessionData,
    sessionId,
    expiresAt
  };
  
  localStorage.setItem('memepire_wallet_session', JSON.stringify(session));
  
  logSecurityEvent('Session created', { sessionId });
  
  return sessionId;
}

// Get the current session
export function getSession() {
  const session = localStorage.getItem('memepire_wallet_session');
  if (!session) {
    return null;
  }
  
  const sessionData = JSON.parse(session);
  
  // Check if session has expired
  if (sessionData.expiresAt < Date.now()) {
    logSecurityEvent('Session expired', { sessionId: sessionData.sessionId });
    terminateSession();
    return null;
  }
  
  return sessionData;
}

// Update the current session
export function updateSession(updates) {
  const session = getSession();
  if (!session) {
    throw new Error('No active session');
  }
  
  const updatedSession = {
    ...session,
    ...updates
  };
  
  localStorage.setItem('memepire_wallet_session', JSON.stringify(updatedSession));
  
  logSecurityEvent('Session updated', { sessionId: session.sessionId });
}

// Terminate the current session
export function terminateSession() {
  const session = getSession();
  if (!session) {
    return;
  }
  
  localStorage.removeItem('memepire_wallet_session');
  
  logSecurityEvent('Session terminated', { sessionId: session.sessionId });
} 