import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  text,
  integer,
  boolean,
  date,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "project_manager",
  "supervisor",
  "project_admin",
  "labourer"
]);

// User storage table (required for Replit Auth, extended for our needs)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("labourer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  managedProjects: many(projectManagers),
  supervisedProjects: many(projectSupervisors),
  labourerProfiles: many(labourers),
  correctionRequests: many(correctionRequests),
}));

export type User = typeof users.$inferSelect;
export type UserRole = User["role"];

// Employee types table
export const employeeTypes = pgTable("employee_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeTypesRelations = relations(employeeTypes, ({ many }) => ({
  labourers: many(labourers),
  payRates: many(payRates),
}));

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
  "on_hold"
]);

// Payment period enum
export const paymentPeriodEnum = pgEnum("payment_period", [
  "monthly",
  "fortnightly"
]);

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  status: projectStatusEnum("status").notNull().default("active"),
  paymentPeriod: paymentPeriodEnum("payment_period").notNull().default("fortnightly"),
  defaultOpenRate: decimal("default_open_rate", { precision: 10, scale: 2 }),
  defaultCloseRate: decimal("default_close_rate", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  managers: many(projectManagers),
  supervisors: many(projectSupervisors),
  labourers: many(labourers),
  payRates: many(payRates),
  paymentPeriods: many(paymentPeriods),
  workLogs: many(workLogs),
}));

// Project managers junction table
export const projectManagers = pgTable("project_managers", {
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] }),
}));

export const projectManagersRelations = relations(projectManagers, ({ one }) => ({
  project: one(projects, {
    fields: [projectManagers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectManagers.userId],
    references: [users.id],
  }),
}));

// Project supervisors junction table
export const projectSupervisors = pgTable("project_supervisors", {
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] }),
}));

export const projectSupervisorsRelations = relations(projectSupervisors, ({ one }) => ({
  project: one(projects, {
    fields: [projectSupervisors.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectSupervisors.userId],
    references: [users.id],
  }),
}));

// Pay rate category enum
export const rateCategoryEnum = pgEnum("rate_category", [
  "open_trenching",
  "close_trenching",
  "custom"
]);

// Pay rate unit enum
export const rateUnitEnum = pgEnum("rate_unit", [
  "per_meter",
  "per_day",
  "fixed"
]);

// Pay rates table
export const payRates = pgTable("pay_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  employeeTypeId: varchar("employee_type_id").notNull().references(() => employeeTypes.id),
  category: rateCategoryEnum("category").notNull(),
  categoryName: varchar("category_name", { length: 255 }), // For custom categories
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  unit: rateUnitEnum("unit").notNull().default("per_meter"),
  effectiveDate: date("effective_date").notNull().defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payRatesRelations = relations(payRates, ({ one }) => ({
  project: one(projects, {
    fields: [payRates.projectId],
    references: [projects.id],
  }),
  employeeType: one(employeeTypes, {
    fields: [payRates.employeeTypeId],
    references: [employeeTypes.id],
  }),
  creator: one(users, {
    fields: [payRates.createdBy],
    references: [users.id],
  }),
}));

// Account type enum
export const accountTypeEnum = pgEnum("account_type", ["cheque", "savings"]);

// Labourers table
export const labourers = pgTable("labourers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Optional: for labourers who have app access
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }), // Optional: labourers can be unassigned
  employeeTypeId: varchar("employee_type_id").notNull().references(() => employeeTypes.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  surname: varchar("surname", { length: 100 }).notNull(),
  idNumber: varchar("id_number", { length: 50 }).notNull(), // SA ID or Passport
  dateOfBirth: date("date_of_birth").notNull(),
  gender: varchar("gender", { length: 20 }),
  contactNumber: varchar("contact_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  physicalAddress: text("physical_address"),
  profilePhotoPath: varchar("profile_photo_path"),
  idDocumentPath: varchar("id_document_path"),
  // Banking details
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  accountType: accountTypeEnum("account_type").notNull(),
  branchCode: varchar("branch_code", { length: 20 }).notNull(),
  bankingProofPath: varchar("banking_proof_path"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const labourersRelations = relations(labourers, ({ one, many }) => ({
  user: one(users, {
    fields: [labourers.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [labourers.projectId],
    references: [projects.id],
  }),
  employeeType: one(employeeTypes, {
    fields: [labourers.employeeTypeId],
    references: [employeeTypes.id],
  }),
  creator: one(users, {
    fields: [labourers.createdBy],
    references: [users.id],
  }),
  workLogs: many(workLogs),
  paymentEntries: many(paymentPeriodEntries),
}));

// Work logs table
export const workLogs = pgTable("work_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  labourerId: varchar("labourer_id").notNull().references(() => labourers.id, { onDelete: 'cascade' }),
  workDate: date("work_date").notNull(),
  openTrenchingMeters: decimal("open_trenching_meters", { precision: 10, scale: 2 }).notNull().default("0"),
  closeTrenchingMeters: decimal("close_trenching_meters", { precision: 10, scale: 2 }).notNull().default("0"),
  additionalItems: jsonb("additional_items"), // For custom rate items
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull(),
  recordedBy: varchar("recorded_by").notNull().references(() => users.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
}, (table) => [
  index("idx_work_logs_date").on(table.workDate),
  index("idx_work_logs_labourer").on(table.labourerId),
]);

export const workLogsRelations = relations(workLogs, ({ one }) => ({
  project: one(projects, {
    fields: [workLogs.projectId],
    references: [projects.id],
  }),
  labourer: one(labourers, {
    fields: [workLogs.labourerId],
    references: [labourers.id],
  }),
  recorder: one(users, {
    fields: [workLogs.recordedBy],
    references: [users.id],
  }),
}));

// Payment period status enum
export const paymentPeriodStatusEnum = pgEnum("payment_period_status", [
  "open",
  "submitted",
  "approved",
  "rejected",
  "paid"
]);

// Payment periods table
export const paymentPeriods = pgTable("payment_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: paymentPeriodStatusEnum("status").notNull().default("open"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  submittedBy: varchar("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payment_periods_dates").on(table.startDate, table.endDate),
]);

export const paymentPeriodsRelations = relations(paymentPeriods, ({ one, many }) => ({
  project: one(projects, {
    fields: [paymentPeriods.projectId],
    references: [projects.id],
  }),
  submitter: one(users, {
    fields: [paymentPeriods.submittedBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [paymentPeriods.approvedBy],
    references: [users.id],
  }),
  entries: many(paymentPeriodEntries),
}));

// Payment period entries table
export const paymentPeriodEntries = pgTable("payment_period_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  periodId: varchar("period_id").notNull().references(() => paymentPeriods.id, { onDelete: 'cascade' }),
  labourerId: varchar("labourer_id").notNull().references(() => labourers.id, { onDelete: 'cascade' }),
  daysWorked: integer("days_worked").notNull().default(0),
  openMeters: decimal("open_meters", { precision: 10, scale: 2 }).notNull().default("0"),
  closeMeters: decimal("close_meters", { precision: 10, scale: 2 }).notNull().default("0"),
  totalMeters: decimal("total_meters", { precision: 10, scale: 2 }).notNull().default("0"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentPeriodEntriesRelations = relations(paymentPeriodEntries, ({ one }) => ({
  period: one(paymentPeriods, {
    fields: [paymentPeriodEntries.periodId],
    references: [paymentPeriods.id],
  }),
  labourer: one(labourers, {
    fields: [paymentPeriodEntries.labourerId],
    references: [labourers.id],
  }),
}));

// Correction request status enum
export const correctionStatusEnum = pgEnum("correction_status", [
  "pending",
  "approved",
  "rejected"
]);

// Correction requests table (audit trail)
export const correctionRequests = pgTable("correction_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // e.g., "work_log", "labourer"
  entityId: varchar("entity_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  reason: text("reason").notNull(),
  status: correctionStatusEnum("status").notNull().default("pending"),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
}, (table) => [
  index("idx_correction_requests_status").on(table.status),
  index("idx_correction_requests_entity").on(table.entityType, table.entityId),
]);

export const correctionRequestsRelations = relations(correctionRequests, ({ one }) => ({
  requester: one(users, {
    fields: [correctionRequests.requestedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [correctionRequests.reviewedBy],
    references: [users.id],
  }),
}));

// Type exports
export type UpsertUser = typeof users.$inferInsert;

export type InsertEmployeeType = typeof employeeTypes.$inferInsert;
export type EmployeeType = typeof employeeTypes.$inferSelect;

export type InsertProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;

export type InsertPayRate = typeof payRates.$inferInsert;
export type PayRate = typeof payRates.$inferSelect;

export type InsertLabourer = typeof labourers.$inferInsert;
export type Labourer = typeof labourers.$inferSelect;

export type InsertWorkLog = typeof workLogs.$inferInsert;
export type WorkLog = typeof workLogs.$inferSelect;

export type InsertPaymentPeriod = typeof paymentPeriods.$inferInsert;
export type PaymentPeriod = typeof paymentPeriods.$inferSelect;

export type InsertPaymentPeriodEntry = typeof paymentPeriodEntries.$inferInsert;
export type PaymentPeriodEntry = typeof paymentPeriodEntries.$inferSelect;

export type InsertCorrectionRequest = typeof correctionRequests.$inferInsert;
export type CorrectionRequest = typeof correctionRequests.$inferSelect;

// Zod schemas for validation
export const insertEmployeeTypeSchema = createInsertSchema(employeeTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startDate: true,
  defaultOpenRate: true,
  defaultCloseRate: true,
});

export const insertPayRateSchema = createInsertSchema(payRates).omit({
  id: true,
  createdAt: true,
});

export const insertLabourerSchema = createInsertSchema(labourers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // South African ID validation: 13 digits
  idNumber: z.string().regex(/^[0-9]{13}$|^[A-Z0-9]{6-9}$/, "Must be valid SA ID (13 digits) or Passport (6-9 characters)"),
  // South African phone number validation
  contactNumber: z.string().regex(/^(\+27|0)[0-9]{9}$/, "Must be valid SA phone number"),
  email: z.string().email().optional().or(z.literal("")),
  // Transform empty string to null for optional project assignment
  projectId: z.preprocess(
    val => val === "" || val === undefined || val === null ? null : val,
    z.string().nullable()
  ),
});

export const insertWorkLogSchema = createInsertSchema(workLogs).omit({
  id: true,
  recordedAt: true,
});

export const insertPaymentPeriodSchema = createInsertSchema(paymentPeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  approvedAt: true,
});

export const insertCorrectionRequestSchema = createInsertSchema(correctionRequests).omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["super_admin", "admin", "project_manager", "supervisor", "project_admin", "labourer"]),
});