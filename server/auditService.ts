import { db } from "./db";
import { auditLogs, users } from "@shared/schema";
import type { InsertAuditLog } from "@shared/schema";
import { eq } from "drizzle-orm";

interface AuditLogData {
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "SUBMIT" | "APPROVE" | "REJECT";
  entityType: string;
  entityId: string;
  userId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Get user information for denormalization in audit logs
 */
async function getUserInfo(userId: string) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user ? {
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      userEmail: user.email || '',
    } : {
      userName: 'Unknown',
      userEmail: '',
    };
  } catch (error) {
    console.error('Error fetching user info for audit log:', error);
    return {
      userName: 'Unknown',
      userEmail: '',
    };
  }
}

/**
 * Core function to log audit events
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    const userInfo = await getUserInfo(data.userId);
    
    const auditLogData: InsertAuditLog = {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      userName: userInfo.userName,
      userEmail: userInfo.userEmail,
      changes: data.changes as any || null,
      metadata: data.metadata as any || null,
    };

    await db.insert(auditLogs).values(auditLogData);
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Error logging audit event:', error);
  }
}

/**
 * Log CREATE action
 */
export async function logCreate(
  entityType: string,
  entityId: string,
  userId: string,
  newData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  return logAuditEvent({
    action: 'CREATE',
    entityType,
    entityId,
    userId,
    changes: { new: newData },
    metadata,
  });
}

/**
 * Log UPDATE action with old and new values
 */
export async function logUpdate(
  entityType: string,
  entityId: string,
  userId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  // Calculate changes - only include fields that actually changed
  const changes: Record<string, { old: any; new: any }> = {};
  
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      };
    }
  }

  return logAuditEvent({
    action: 'UPDATE',
    entityType,
    entityId,
    userId,
    changes,
    metadata,
  });
}

/**
 * Log DELETE action
 */
export async function logDelete(
  entityType: string,
  entityId: string,
  userId: string,
  deletedData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  return logAuditEvent({
    action: 'DELETE',
    entityType,
    entityId,
    userId,
    changes: { deleted: deletedData },
    metadata,
  });
}

/**
 * Log generic action (ASSIGN, SUBMIT, APPROVE, REJECT)
 */
export async function logAction(
  action: "ASSIGN" | "SUBMIT" | "APPROVE" | "REJECT",
  entityType: string,
  entityId: string,
  userId: string,
  metadata?: Record<string, any>
): Promise<void> {
  return logAuditEvent({
    action,
    entityType,
    entityId,
    userId,
    metadata,
  });
}
