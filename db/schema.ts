import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

// User table definition with added privacy fields and trial period tracking
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  role: text("role", { enum: ['user', 'sub_admin', 'super_admin', 'pro_user'] }).default("user").notNull(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // New trial period fields
  trialStartedAt: timestamp("trial_started_at"),
  trialEndedAt: timestamp("trial_ended_at"),
  // New privacy-related fields
  dataProcessingRestricted: boolean("data_processing_restricted").default(false),
  privacySettingsUpdatedAt: timestamp("privacy_settings_updated_at"),
  dataDeletionRequestedAt: timestamp("data_deletion_requested_at"),
  dataDeletionStatus: text("data_deletion_status", { enum: ['none', 'pending', 'processing', 'completed'] }).default('none'),
});

// Update subscription table with proper end date tracking and Pro status
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripeCustomerId: text("stripe_customer_id").unique().notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique().notNull(),
  stripeItemId: text("stripe_item_id"),
  status: text("status").notNull(),
  isPro: boolean("is_pro").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const cvs = pgTable("cvs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  originalFilename: text("original_filename").notNull(),
  fileContent: text("file_content").notNull(),
  transformedContent: text("transformed_content").notNull(),
  targetRole: text("target_role").notNull(),
  jobDescription: text("job_description").notNull(),
  score: integer("score").notNull().default(0),
  feedback: jsonb("feedback").$type<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    organizationalInsights: string[][];
  }>(),
  isFullyRegenerated: boolean("is_fully_regenerated").default(false),
  needsApproval: boolean("needs_approval").default(false),
  approvalStatus: text("approval_status", { enum: ['pending', 'approved', 'rejected'] }).default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvalComment: text("approval_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for system metrics and analytics
export const siteAnalytics = pgTable("site_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  locationCountry: text("location_country"),
  locationCity: text("location_city"),
  userAgent: text("user_agent"),
  pageVisited: text("page_visited").notNull(),
  visitTimestamp: timestamp("visit_timestamp").defaultNow().notNull(),
  sessionDuration: integer("session_duration"),
  isSuspicious: boolean("is_suspicious").default(false),
  suspiciousReason: text("suspicious_reason"),
});

export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  cpuUsage: doublePrecision("cpu_usage").notNull(),
  memoryUsage: doublePrecision("memory_usage").notNull(),
  storageUsage: doublePrecision("storage_usage").notNull(),
  activeConnections: integer("active_connections").notNull(),
  responseTime: integer("response_time").notNull(),
  errorCount: integer("error_count").default(0),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ['new', 'read', 'responded'] }).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Data deletion requests table
export const dataDeletionRequests = pgTable("data_deletion_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: text("status", { enum: ['pending', 'processing', 'completed', 'cancelled'] }).default("pending").notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

// Add new tables for Pro features after the existing tables
export const interviewerInsights = pgTable("interviewer_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  interviewerName: text("interviewer_name").notNull(),
  interviewerRole: text("interviewer_role").notNull(),
  organizationName: text("organization_name").notNull(),
  organizationWebsite: text("organization_website").notNull(),
  linkedinProfile: text("linkedin_profile"),
  insights: jsonb("insights").$type<{
    background: string[];
    expertise: string[];
    recentActivity: string[];
    commonInterests: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizationAnalysis = pgTable("organization_analysis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationName: text("organization_name").notNull(),
  website: text("website").notNull(),
  analysis: jsonb("analysis").$type<{
    industryPosition: string;
    competitors: string[];
    recentDevelopments: string[];
    culture: string[];
    techStack: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  cvs: many(cvs),
  activityLogs: many(activityLogs),
  deletionRequests: many(dataDeletionRequests),
}));

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const cvRelations = relations(cvs, ({ one }) => ({
  user: one(users, {
    fields: [cvs.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [cvs.approvedBy],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const dataDeletionRequestsRelations = relations(dataDeletionRequests, ({ one }) => ({
  user: one(users, {
    fields: [dataDeletionRequests.userId],
    references: [users.id],
  }),
}));

// Add relations for new tables
export const interviewerInsightsRelations = relations(interviewerInsights, ({ one }) => ({
  user: one(users, {
    fields: [interviewerInsights.userId],
    references: [users.id],
  }),
}));

export const organizationAnalysisRelations = relations(organizationAnalysis, ({ one }) => ({
  user: one(users, {
    fields: [organizationAnalysis.userId],
    references: [users.id],
  }),
}));

// Create Zod schemas
export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});
export const selectUserSchema = createSelectSchema(users);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertCvSchema = createInsertSchema(cvs);
export const selectCvSchema = createSelectSchema(cvs);
export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const selectActivityLogSchema = createSelectSchema(activityLogs);
export const insertContactSchema = createInsertSchema(contacts);
export const selectContactSchema = createSelectSchema(contacts);

// Create Zod schemas for new tables
export const insertSiteAnalyticsSchema = createInsertSchema(siteAnalytics);
export const selectSiteAnalyticsSchema = createSelectSchema(siteAnalytics);
export const insertSystemMetricsSchema = createInsertSchema(systemMetrics);
export const selectSystemMetricsSchema = createSelectSchema(systemMetrics);
export const insertDataDeletionRequestSchema = createInsertSchema(dataDeletionRequests);
export const selectDataDeletionRequestSchema = createSelectSchema(dataDeletionRequests);

// Add Zod schemas for new tables
export const insertInterviewerInsightSchema = createInsertSchema(interviewerInsights);
export const selectInterviewerInsightSchema = createSelectSchema(interviewerInsights);
export const insertOrganizationAnalysisSchema = createInsertSchema(organizationAnalysis);
export const selectOrganizationAnalysisSchema = createSelectSchema(organizationAnalysis);


// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type CV = typeof cvs.$inferSelect;
export type InsertCV = typeof cvs.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// Export types for new tables
export type SiteAnalytics = typeof siteAnalytics.$inferSelect;
export type InsertSiteAnalytics = typeof siteAnalytics.$inferInsert;
export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type InsertSystemMetrics = typeof systemMetrics.$inferInsert;
export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;
export type InsertDataDeletionRequest = typeof dataDeletionRequests.$inferInsert;

// Export types for new tables
export type InterviewerInsight = typeof interviewerInsights.$inferSelect;
export type InsertInterviewerInsight = typeof interviewerInsights.$inferInsert;
export type OrganizationAnalysis = typeof organizationAnalysis.$inferSelect;
export type InsertOrganizationAnalysis = typeof organizationAnalysis.$inferInsert;

// Authentication schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Admin management schemas
export const addUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "sub_admin"]),
});

export const updateUserRoleSchema = z.object({
  userId: z.number(),
  role: z.enum(["user", "sub_admin"]),
});

export const cvApprovalSchema = z.object({
  cvId: z.number(),
  status: z.enum(["approved", "rejected"]),
  comment: z.string().optional(),
});