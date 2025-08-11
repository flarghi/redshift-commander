// Session isolation utilities
export const SESSION_KEYS = {
  CONNECTION_CONFIG: 'redshift-connection-config',
  SESSION_ID: 'redshift-session-id'
} as const;

// Generate a unique session ID for this browser tab
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Session management utilities
export const sessionUtils = {
  // Set connection config for current session only
  setConnectionConfig: (config: any) => {
    try {
      sessionStorage.setItem(SESSION_KEYS.CONNECTION_CONFIG, JSON.stringify(config));
      // Also set a session ID to track this specific session
      if (!sessionStorage.getItem(SESSION_KEYS.SESSION_ID)) {
        sessionStorage.setItem(SESSION_KEYS.SESSION_ID, generateSessionId());
      }
    } catch (error) {
      console.warn('Failed to save connection config to session:', error);
    }
  },

  // Get connection config from current session
  getConnectionConfig: () => {
    try {
      const config = sessionStorage.getItem(SESSION_KEYS.CONNECTION_CONFIG);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.warn('Failed to load connection config from session:', error);
      return null;
    }
  },

  // Clear all session data
  clearSession: () => {
    try {
      sessionStorage.removeItem(SESSION_KEYS.CONNECTION_CONFIG);
      sessionStorage.removeItem(SESSION_KEYS.SESSION_ID);
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  },

  // Get current session ID
  getSessionId: () => {
    return sessionStorage.getItem(SESSION_KEYS.SESSION_ID);
  },

  // Check if session is valid (has both config and session ID)
  isValidSession: () => {
    return !!(sessionStorage.getItem(SESSION_KEYS.CONNECTION_CONFIG) && 
              sessionStorage.getItem(SESSION_KEYS.SESSION_ID));
  }
};
