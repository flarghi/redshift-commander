// Session isolation utilities - SECURE VERSION (no credentials stored)
export const SESSION_KEYS = {
  SESSION_ID: 'redshift-session-id'
} as const;

// Session management utilities
export const sessionUtils = {
  // Store only session ID (NO credentials)
  setSessionId: (sessionId: string) => {
    try {
      sessionStorage.setItem(SESSION_KEYS.SESSION_ID, sessionId);
      console.log('Session ID stored successfully');
    } catch (error) {
      console.warn('Failed to save session ID:', error);
    }
  },

  // Get current session ID
  getSessionId: (): string | null => {
    try {
      return sessionStorage.getItem(SESSION_KEYS.SESSION_ID);
    } catch (error) {
      console.warn('Failed to load session ID:', error);
      return null;
    }
  },

  // Clear all session data
  clearSession: () => {
    try {
      sessionStorage.removeItem(SESSION_KEYS.SESSION_ID);
      console.log('Session cleared');
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  },

  // Check if session exists
  hasSession: (): boolean => {
    return !!sessionStorage.getItem(SESSION_KEYS.SESSION_ID);
  }
};
