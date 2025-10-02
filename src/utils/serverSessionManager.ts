import crypto from 'crypto';
import { RedshiftConnection } from '../types';

interface SessionData {
  connectionInfo: {
    host: string;
    port: number;
    database: string;
    username: string;
    ssl?: boolean;
  };
  connectedAt: Date;
  lastActivity: Date;
}

class ServerSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

  /**
   * Generate cryptographically secure session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create new session with connection config
   * NOTE: Password is NOT stored - only used for initial connection
   */
  createSession(connectionConfig: RedshiftConnection): string {
    const sessionId = this.generateSessionId();
    
    // Remove password from stored config (we only need it for initial connection)
    const { password, ...configWithoutPassword } = connectionConfig;
    
    this.sessions.set(sessionId, {
      connectionInfo: configWithoutPassword,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    console.log(`Session created: ${sessionId.substring(0, 8)}... (${this.sessions.size} active sessions)`);
    return sessionId;
  }

  /**
   * Get session data and update last activity
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      console.log(`Session not found: ${sessionId.substring(0, 8)}...`);
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceActivity > this.SESSION_TIMEOUT) {
      console.log(`Session expired: ${sessionId.substring(0, 8)}...`);
      this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return session;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string): void {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`Session destroyed: ${sessionId.substring(0, 8)}... (${this.sessions.size} active sessions)`);
    }
  }

  /**
   * Clean up expired sessions (called periodically)
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired session(s). ${this.sessions.size} active sessions remaining.`);
    }
  }

  /**
   * Get all active sessions count (for monitoring)
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }

  /**
   * Get session timeout in milliseconds
   */
  getSessionTimeout(): number {
    return this.SESSION_TIMEOUT;
  }
}

// Singleton instance
export const serverSessionManager = new ServerSessionManager();

// Cleanup expired sessions every 15 minutes
setInterval(() => {
  serverSessionManager.cleanupExpiredSessions();
}, 15 * 60 * 1000);

console.log(`Server Session Manager initialized. Session timeout: ${serverSessionManager.getSessionTimeout() / 1000 / 60} minutes`);
