import {
  users,
  employeeTypes,
  projects,
  labourers,
  payRates,
  workLogs,
  paymentPeriods,
  paymentPeriodEntries,
  correctionRequests,
  auditLogs,
  projectManagers,
  projectSupervisors,
  type User,
  type UpsertUser,
  type EmployeeType,
  type InsertEmployeeType,
  type Project,
  type InsertProject,
  type Labourer,
  type InsertLabourer,
  type PayRate,
  type InsertPayRate,
  type WorkLog,
  type InsertWorkLog,
  type PaymentPeriod,
  type InsertPaymentPeriod,
  type PaymentPeriodEntry,
  type InsertPaymentPeriodEntry,
  type CorrectionRequest,
  type InsertCorrectionRequest,
  type AuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { logCreate, logUpdate, logDelete, logAction } from "./auditService";

// Storage interface
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUser(id: string, data: Partial<{ firstName: string; lastName: string; email: string; role: string }>): Promise<User>;
  
  // Employee Type operations
  getEmployeeTypes(): Promise<EmployeeType[]>;
  getEmployeeType(id: string): Promise<EmployeeType | undefined>;
  createEmployeeType(data: InsertEmployeeType): Promise<EmployeeType>;
  updateEmployeeType(id: string, data: Partial<InsertEmployeeType>): Promise<EmployeeType>;
  
  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByManager(userId: string): Promise<Project[]>;
  getProjectsBySupervisor(userId: string): Promise<Project[]>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project>;
  assignProjectManager(projectId: string, userId: string): Promise<{ success: boolean; alreadyAssigned: boolean }>;
  assignProjectSupervisor(projectId: string, userId: string): Promise<{ success: boolean; alreadyAssigned: boolean }>;
  getProjectManagers(projectId: string): Promise<User[]>;
  getProjectSupervisors(projectId: string): Promise<User[]>;
  
  // Labourer operations
  getLabourers(projectId: string): Promise<Labourer[]>;
  getAvailableLabourers(): Promise<Labourer[]>;
  getLabourer(id: string): Promise<Labourer | undefined>;
  getLabourerByUserId(userId: string): Promise<Labourer | undefined>;
  getLabourerByPhoneOrEmail(identifier: string): Promise<Labourer | undefined>;
  createLabourer(data: InsertLabourer): Promise<Labourer>;
  bulkCreateLabourers(data: InsertLabourer[]): Promise<Labourer[]>;
  updateLabourer(id: string, data: Partial<InsertLabourer>): Promise<Labourer>;
  assignLabourersToProject(labourerIds: string[], projectId: string): Promise<void>;
  
  // Pay Rate operations
  getPayRates(projectId: string): Promise<PayRate[]>;
  getPayRateForEmployeeType(projectId: string, employeeTypeId: string, category: string, effectiveDate: Date): Promise<PayRate | undefined>;
  createPayRate(data: InsertPayRate): Promise<PayRate>;
  
  // Work Log operations
  getWorkLogs(projectId: string, startDate?: Date, endDate?: Date): Promise<WorkLog[]>;
  getWorkLogsByDateRange(projectId: string, startDate: string, endDate: string): Promise<WorkLog[]>;
  getWorkLogsByLabourer(labourerId: string): Promise<WorkLog[]>;
  getWorkLog(id: string): Promise<WorkLog | undefined>;
  createWorkLog(data: InsertWorkLog): Promise<WorkLog>;
  updateWorkLog(id: string, data: Partial<InsertWorkLog>): Promise<WorkLog>;
  
  // Payment Period operations
  getPaymentPeriods(projectId: string): Promise<PaymentPeriod[]>;
  getPaymentPeriod(id: string): Promise<PaymentPeriod | undefined>;
  createPaymentPeriod(data: InsertPaymentPeriod): Promise<PaymentPeriod>;
  updatePaymentPeriod(id: string, data: Partial<InsertPaymentPeriod>): Promise<PaymentPeriod>;
  getPaymentPeriodEntries(periodId: string): Promise<PaymentPeriodEntry[]>;
  createPaymentPeriodEntry(data: InsertPaymentPeriodEntry): Promise<PaymentPeriodEntry>;
  
  // Correction Request operations
  getCorrectionRequests(status?: string): Promise<CorrectionRequest[]>;
  getCorrectionRequest(id: string): Promise<CorrectionRequest | undefined>;
  createCorrectionRequest(data: InsertCorrectionRequest): Promise<CorrectionRequest>;
  updateCorrectionRequest(id: string, data: Partial<InsertCorrectionRequest>): Promise<CorrectionRequest>;
  
  // Audit Log operations
  getAuditLogs(filters?: { entityType?: string; entityId?: string; userId?: string; action?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;
  getAuditLog(id: string): Promise<AuditLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First, check if a user with this ID or email already exists
    // Note: email is required in our auth flow, but the schema allows null
    if (!userData.email) {
      throw new Error("Email is required for user upsert");
    }

    // Check if user exists by ID or email in a single query
    const existingUsers = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.id, userData.id as string),
          eq(users.email, userData.email as string)
        )
      );

    // If user exists (by either ID or email), update it
    if (existingUsers.length > 0) {
      // Use the existing user's ID to ensure we update the right record
      const existingUser = existingUsers[0];
      
      // Extract id from userData and only update the other fields
      const { id, ...updateData } = userData;
      const [updated] = await db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updated;
    } else {
      // Insert new user
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      return newUser;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async getAllUsers(): Promise<User[]> {
    // Exclude labourers - they are data entities, not system users
    return db.select().from(users).where(sql`role != 'labourer'`).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUser(id: string, data: Partial<{ firstName: string; lastName: string; email: string; role: string }>): Promise<User> {
    const updateData: any = { updatedAt: new Date() };
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Employee Type operations
  async getEmployeeTypes(): Promise<EmployeeType[]> {
    return db.select().from(employeeTypes).where(eq(employeeTypes.isActive, true));
  }

  async getEmployeeType(id: string): Promise<EmployeeType | undefined> {
    const [type] = await db.select().from(employeeTypes).where(eq(employeeTypes.id, id));
    return type || undefined;
  }

  async createEmployeeType(data: InsertEmployeeType): Promise<EmployeeType> {
    const [type] = await db.insert(employeeTypes).values(data).returning();
    return type;
  }

  async updateEmployeeType(id: string, data: Partial<InsertEmployeeType>): Promise<EmployeeType> {
    const [type] = await db
      .update(employeeTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeTypes.id, id))
      .returning();
    return type;
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByManager(userId: string): Promise<Project[]> {
    const results = await db
      .select({ project: projects })
      .from(projects)
      .innerJoin(projectManagers, eq(projects.id, projectManagers.projectId))
      .where(eq(projectManagers.userId, userId));
    return results.map(r => r.project);
  }

  async getProjectsBySupervisor(userId: string): Promise<Project[]> {
    const results = await db
      .select({ project: projects })
      .from(projects)
      .innerJoin(projectSupervisors, eq(projects.id, projectSupervisors.projectId))
      .where(eq(projectSupervisors.userId, userId));
    return results.map(r => r.project);
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    await logCreate("project", project.id, data.createdBy, project as any).catch(console.error);
    return project;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project> {
    // Fetch old project data for audit trail
    const oldProject = await this.getProject(id);
    
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    
    // Log update with user ID
    const userId = (data as any).updatedBy || (oldProject?.createdBy);
    if (userId && oldProject) {
      await logUpdate("project", id, userId, oldProject as any, project as any).catch(console.error);
    }
    
    return project;
  }

  async assignProjectManager(projectId: string, userId: string): Promise<{ success: boolean; alreadyAssigned: boolean }> {
    // Check if already assigned
    const [existing] = await db
      .select()
      .from(projectManagers)
      .where(and(eq(projectManagers.projectId, projectId), eq(projectManagers.userId, userId)));
    
    if (existing) {
      return { success: true, alreadyAssigned: true };
    }

    try {
      await db.insert(projectManagers).values({ projectId, userId });
      return { success: true, alreadyAssigned: false };
    } catch (error: any) {
      // Handle race condition: if unique constraint is violated, treat as already assigned
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return { success: true, alreadyAssigned: true };
      }
      // Re-throw unexpected errors
      console.error("Error assigning project manager:", error);
      throw new Error("Failed to assign project manager");
    }
  }

  async assignProjectSupervisor(projectId: string, userId: string): Promise<{ success: boolean; alreadyAssigned: boolean }> {
    // Check if already assigned
    const [existing] = await db
      .select()
      .from(projectSupervisors)
      .where(and(eq(projectSupervisors.projectId, projectId), eq(projectSupervisors.userId, userId)));
    
    if (existing) {
      return { success: true, alreadyAssigned: true };
    }

    try {
      await db.insert(projectSupervisors).values({ projectId, userId });
      return { success: true, alreadyAssigned: false };
    } catch (error: any) {
      // Handle race condition: if unique constraint is violated, treat as already assigned
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return { success: true, alreadyAssigned: true };
      }
      // Re-throw unexpected errors
      console.error("Error assigning project supervisor:", error);
      throw new Error("Failed to assign project supervisor");
    }
  }

  async getProjectManagers(projectId: string): Promise<User[]> {
    const assignments = await db
      .select()
      .from(projectManagers)
      .where(eq(projectManagers.projectId, projectId));
    
    if (assignments.length === 0) {
      return [];
    }
    
    const userIds = assignments.map(a => a.userId);
    return db.select().from(users).where(inArray(users.id, userIds));
  }

  async getProjectSupervisors(projectId: string): Promise<User[]> {
    const assignments = await db
      .select()
      .from(projectSupervisors)
      .where(eq(projectSupervisors.projectId, projectId));
    
    if (assignments.length === 0) {
      return [];
    }
    
    const userIds = assignments.map(a => a.userId);
    return db.select().from(users).where(inArray(users.id, userIds));
  }

  // Labourer operations
  async getLabourers(projectId: string): Promise<Labourer[]> {
    return db.select().from(labourers).where(eq(labourers.projectId, projectId));
  }

  async getLabourer(id: string): Promise<Labourer | undefined> {
    const [labourer] = await db.select().from(labourers).where(eq(labourers.id, id));
    return labourer || undefined;
  }

  async getLabourerByUserId(userId: string): Promise<Labourer | undefined> {
    const [labourer] = await db.select().from(labourers).where(eq(labourers.userId, userId));
    return labourer || undefined;
  }

  async getLabourerByPhoneOrEmail(identifier: string): Promise<Labourer | undefined> {
    const [labourer] = await db
      .select()
      .from(labourers)
      .where(
        or(
          eq(labourers.contactNumber, identifier),
          eq(labourers.email, identifier)
        )
      );
    return labourer || undefined;
  }

  async createLabourer(data: InsertLabourer): Promise<Labourer> {
    const [labourer] = await db.insert(labourers).values(data).returning();
    await logCreate("labourer", labourer.id.toString(), data.createdBy, labourer as any).catch(console.error);
    return labourer;
  }

  async bulkCreateLabourers(data: InsertLabourer[]): Promise<Labourer[]> {
    if (data.length === 0) return [];
    const created = await db.insert(labourers).values(data).returning();
    return created;
  }

  async updateLabourer(id: string, data: Partial<InsertLabourer>): Promise<Labourer> {
    // Fetch old labourer data for audit trail
    const oldLabourer = await this.getLabourer(id);
    
    const [labourer] = await db
      .update(labourers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(labourers.id, id))
      .returning();
    
    // Log update with user ID
    const userId = (data as any).updatedBy || (oldLabourer?.createdBy);
    if (userId && oldLabourer) {
      await logUpdate("labourer", id, userId, oldLabourer as any, labourer as any).catch(console.error);
    }
    
    return labourer;
  }

  async getAvailableLabourers(): Promise<Labourer[]> {
    // Get labourers who are either:
    // 1. Not assigned to any project (projectId references a non-existent or inactive project)
    // 2. Assigned to a project that is not active
    const result = await db
      .select({
        labourer: labourers,
        project: projects,
      })
      .from(labourers)
      .leftJoin(projects, eq(labourers.projectId, projects.id))
      .where(
        sql`${projects.status} IS NULL OR ${projects.status} != 'active'`
      );
    
    return result.map(r => r.labourer);
  }

  async assignLabourersToProject(labourerIds: string[], projectId: string): Promise<void> {
    if (labourerIds.length === 0) return;
    
    await db
      .update(labourers)
      .set({ 
        projectId, 
        updatedAt: new Date() 
      })
      .where(inArray(labourers.id, labourerIds));
  }

  // Pay Rate operations
  async getPayRates(projectId: string): Promise<PayRate[]> {
    return db.select().from(payRates).where(eq(payRates.projectId, projectId));
  }

  async getPayRateForEmployeeType(
    projectId: string,
    employeeTypeId: string,
    category: string,
    effectiveDate: Date
  ): Promise<PayRate | undefined> {
    const [rate] = await db
      .select()
      .from(payRates)
      .where(
        and(
          eq(payRates.projectId, projectId),
          eq(payRates.employeeTypeId, employeeTypeId),
          eq(payRates.category, category as any),
          lte(payRates.effectiveDate, effectiveDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(payRates.effectiveDate))
      .limit(1);
    return rate || undefined;
  }

  async createPayRate(data: InsertPayRate): Promise<PayRate> {
    const [rate] = await db.insert(payRates).values(data).returning();
    return rate;
  }

  // Work Log operations
  async getWorkLogs(projectId: string, startDate?: Date, endDate?: Date): Promise<WorkLog[]> {
    if (startDate && endDate) {
      return db
        .select()
        .from(workLogs)
        .where(
          and(
            eq(workLogs.projectId, projectId),
            gte(workLogs.workDate, startDate.toISOString().split('T')[0]),
            lte(workLogs.workDate, endDate.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(workLogs.workDate));
    }
    
    return db
      .select()
      .from(workLogs)
      .where(eq(workLogs.projectId, projectId))
      .orderBy(desc(workLogs.workDate));
  }

  async getWorkLogsByDateRange(projectId: string, startDate: string, endDate: string): Promise<WorkLog[]> {
    return db
      .select()
      .from(workLogs)
      .where(
        and(
          eq(workLogs.projectId, projectId),
          gte(workLogs.workDate, startDate),
          lte(workLogs.workDate, endDate)
        )
      )
      .orderBy(desc(workLogs.workDate));
  }

  async getWorkLogsByLabourer(labourerId: string): Promise<WorkLog[]> {
    return db.select().from(workLogs).where(eq(workLogs.labourerId, labourerId)).orderBy(desc(workLogs.workDate));
  }

  async getWorkLog(id: string): Promise<WorkLog | undefined> {
    const [log] = await db.select().from(workLogs).where(eq(workLogs.id, id));
    return log || undefined;
  }

  async createWorkLog(data: InsertWorkLog): Promise<WorkLog> {
    const [log] = await db.insert(workLogs).values(data).returning();
    await logCreate("work_log", log.id, data.recordedBy, log as any).catch(console.error);
    return log;
  }

  async updateWorkLog(id: string, data: Partial<InsertWorkLog>): Promise<WorkLog> {
    // Fetch old work log data for audit trail
    const oldLog = await this.getWorkLog(id);
    
    const [log] = await db
      .update(workLogs)
      .set(data)
      .where(eq(workLogs.id, id))
      .returning();
    
    // Log update with user ID
    const userId = (data as any).updatedBy || (oldLog?.recordedBy);
    if (userId && oldLog) {
      await logUpdate("work_log", id, userId, oldLog as any, log as any).catch(console.error);
    }
    
    return log;
  }

  // Payment Period operations
  async getPaymentPeriods(projectId: string): Promise<PaymentPeriod[]> {
    return db.select().from(paymentPeriods).where(eq(paymentPeriods.projectId, projectId)).orderBy(desc(paymentPeriods.startDate));
  }

  async getPaymentPeriod(id: string): Promise<PaymentPeriod | undefined> {
    const [period] = await db.select().from(paymentPeriods).where(eq(paymentPeriods.id, id));
    return period || undefined;
  }

  async createPaymentPeriod(data: InsertPaymentPeriod): Promise<PaymentPeriod> {
    const [period] = await db.insert(paymentPeriods).values(data).returning();
    return period;
  }

  async updatePaymentPeriod(id: string, data: Partial<InsertPaymentPeriod>): Promise<PaymentPeriod> {
    const [period] = await db
      .update(paymentPeriods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentPeriods.id, id))
      .returning();
    return period;
  }

  async getPaymentPeriodEntries(periodId: string): Promise<PaymentPeriodEntry[]> {
    return db.select().from(paymentPeriodEntries).where(eq(paymentPeriodEntries.periodId, periodId));
  }

  async createPaymentPeriodEntry(data: InsertPaymentPeriodEntry): Promise<PaymentPeriodEntry> {
    const [entry] = await db.insert(paymentPeriodEntries).values(data).returning();
    return entry;
  }

  // Correction Request operations
  async getCorrectionRequests(status?: string): Promise<CorrectionRequest[]> {
    if (status) {
      return db.select().from(correctionRequests).where(eq(correctionRequests.status, status as any)).orderBy(desc(correctionRequests.requestedAt));
    }
    return db.select().from(correctionRequests).orderBy(desc(correctionRequests.requestedAt));
  }

  async getCorrectionRequest(id: string): Promise<CorrectionRequest | undefined> {
    const [request] = await db.select().from(correctionRequests).where(eq(correctionRequests.id, id));
    return request || undefined;
  }

  async createCorrectionRequest(data: InsertCorrectionRequest): Promise<CorrectionRequest> {
    const [request] = await db.insert(correctionRequests).values(data).returning();
    return request;
  }

  async updateCorrectionRequest(id: string, data: Partial<InsertCorrectionRequest>): Promise<CorrectionRequest> {
    const [request] = await db
      .update(correctionRequests)
      .set(data)
      .where(eq(correctionRequests.id, id))
      .returning();
    return request;
  }

  // Audit Log operations
  async getAuditLogs(filters?: { 
    entityType?: string; 
    entityId?: string; 
    userId?: string; 
    action?: string; 
    startDate?: Date; 
    endDate?: Date 
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    const conditions: any[] = [];
    
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt));
    }
    
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLog(id: string): Promise<AuditLog | undefined> {
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return log || undefined;
  }
}

export const storage = new DatabaseStorage();