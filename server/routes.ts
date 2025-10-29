import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import {
  insertEmployeeTypeSchema,
  insertProjectSchema,
  insertLabourerSchema,
  insertPayRateSchema,
  insertWorkLogSchema,
  insertPaymentPeriodSchema,
  insertCorrectionRequestSchema,
  updateUserRoleSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ============= Authentication Routes =============
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      // Look up by email (not sub) to handle OIDC sub rotation
      const userEmail = req.user.claims.email;
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Look up by email (not sub) to handle OIDC sub rotation
      const userEmail = req.user.claims.email;
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============= User Management Routes =============
  app.get('/api/users', isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      const { role } = updateUserRoleSchema.parse(req.body);
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(400).json({ message: error.message || "Failed to update user role" });
    }
  });

  // ============= Object Storage Routes =============
  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects with ACL check
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(403);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Update object ACL after upload
  app.put("/api/objects/acl", isAuthenticated, async (req: any, res) => {
    if (!req.body.objectURL) {
      return res.status(400).json({ error: "objectURL is required" });
    }

    // Validate visibility - default to private for security
    const visibility = req.body.visibility || "private";
    if (visibility !== "public" && visibility !== "private") {
      return res.status(400).json({ error: "visibility must be 'public' or 'private'" });
    }

    // Only admins, project managers, and super admins can set visibility to public
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);
    
    if (visibility === "public") {
      const allowedRoles = ["super_admin", "admin", "project_manager"];
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Insufficient permissions to set public visibility" });
      }
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.objectURL,
        {
          owner: userId,
          visibility: visibility,
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting object ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============= Employee Type Routes =============
  app.get("/api/employee-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getEmployeeTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching employee types:", error);
      res.status(500).json({ message: "Failed to fetch employee types" });
    }
  });

  app.post("/api/employee-types", isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      const data = insertEmployeeTypeSchema.parse(req.body);
      const type = await storage.createEmployeeType(data);
      res.status(201).json(type);
    } catch (error: any) {
      console.error("Error creating employee type:", error);
      res.status(400).json({ message: error.message || "Failed to create employee type" });
    }
  });

  app.put("/api/employee-types/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      const data = insertEmployeeTypeSchema.partial().parse(req.body);
      const type = await storage.updateEmployeeType(req.params.id, data);
      res.json(type);
    } catch (error: any) {
      console.error("Error updating employee type:", error);
      res.status(400).json({ message: error.message || "Failed to update employee type" });
    }
  });

  app.delete("/api/employee-types/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      const existingType = await storage.getEmployeeType(req.params.id);
      if (!existingType) {
        return res.status(404).json({ message: "Employee type not found" });
      }
      if (!existingType.isActive) {
        // Already inactive - idempotent response
        return res.json({ message: "Employee type already deactivated" });
      }
      await storage.updateEmployeeType(req.params.id, { isActive: false });
      res.json({ message: "Employee type deactivated successfully" });
    } catch (error: any) {
      console.error("Error deactivating employee type:", error);
      res.status(500).json({ message: error.message || "Failed to deactivate employee type" });
    }
  });

  // ============= Project Routes =============
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      // Look up by email (not sub) to handle OIDC sub rotation
      const userEmail = req.user.claims.email;
      const user = await storage.getUserByEmail(userEmail);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let projects: any[] = [];
      if (user.role === "super_admin" || user.role === "admin") {
        projects = await storage.getProjects();
      } else if (user.role === "project_manager") {
        projects = await storage.getProjectsByManager(user.id);
      } else if (user.role === "supervisor") {
        projects = await storage.getProjectsBySupervisor(user.id);
      } else {
        // Labourers can only see their assigned project
        const labourer = await storage.getLabourerByUserId(user.id);
        if (labourer) {
          const project = await storage.getProject(labourer.projectId);
          projects = project ? [project] : [];
        }
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/projects/:id/managers", isAuthenticated, async (req, res) => {
    try {
      const managers = await storage.getProjectManagers(req.params.id);
      res.json(managers);
    } catch (error) {
      console.error("Error fetching project managers:", error);
      res.status(500).json({ message: "Failed to fetch project managers" });
    }
  });

  app.get("/api/projects/:id/supervisors", isAuthenticated, async (req, res) => {
    try {
      const supervisors = await storage.getProjectSupervisors(req.params.id);
      res.json(supervisors);
    } catch (error) {
      console.error("Error fetching project supervisors:", error);
      res.status(500).json({ message: "Failed to fetch project supervisors" });
    }
  });

  app.post("/api/projects", isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      // Use dbUser.id (attached by requireRole middleware)
      const userId = req.dbUser.id;
      const data = insertProjectSchema.parse({ ...req.body, createdBy: userId });
      const project = await storage.createProject(data);
      
      // If default rates are provided, create pay rates for all employee types
      if (data.defaultOpenRate || data.defaultCloseRate) {
        const employeeTypes = await storage.getEmployeeTypes();
        
        for (const employeeType of employeeTypes) {
          // Create opening rate if provided
          if (data.defaultOpenRate) {
            await storage.createPayRate({
              projectId: project.id,
              employeeTypeId: employeeType.id,
              category: "open_trenching",
              amount: data.defaultOpenRate,
              unit: "per_meter",
              effectiveDate: new Date().toISOString().split('T')[0],
              createdBy: userId,
            });
          }
          
          // Create closing rate if provided
          if (data.defaultCloseRate) {
            await storage.createPayRate({
              projectId: project.id,
              employeeTypeId: employeeType.id,
              category: "close_trenching",
              amount: data.defaultCloseRate,
              unit: "per_meter",
              effectiveDate: new Date().toISOString().split('T')[0],
              createdBy: userId,
            });
          }
        }
      }
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req, res) => {
    try {
      const data = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, data);
      res.json(project);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(400).json({ message: error.message || "Failed to update project" });
    }
  });

  // Assign project manager
  app.post("/api/projects/:id/managers", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      if (!req.body.userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const result = await storage.assignProjectManager(req.params.id, req.body.userId);
      
      if (result.alreadyAssigned) {
        return res.status(200).json({ message: "Manager already assigned", alreadyAssigned: true });
      }
      
      res.status(201).json({ message: "Manager assigned successfully", alreadyAssigned: false });
    } catch (error) {
      console.error("Error assigning manager:", error);
      res.status(500).json({ message: "Failed to assign manager" });
    }
  });

  // Assign project supervisor
  app.post("/api/projects/:id/supervisors", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req, res) => {
    try {
      if (!req.body.userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const result = await storage.assignProjectSupervisor(req.params.id, req.body.userId);
      
      if (result.alreadyAssigned) {
        return res.status(200).json({ message: "Supervisor already assigned", alreadyAssigned: true });
      }
      
      res.status(201).json({ message: "Supervisor assigned successfully", alreadyAssigned: false });
    } catch (error) {
      console.error("Error assigning supervisor:", error);
      res.status(500).json({ message: "Failed to assign supervisor" });
    }
  });

  // ============= Labourer Routes =============
  app.get("/api/projects/:projectId/labourers", isAuthenticated, async (req, res) => {
    try {
      const labourers = await storage.getLabourers(req.params.projectId);
      res.json(labourers);
    } catch (error) {
      console.error("Error fetching labourers:", error);
      res.status(500).json({ message: "Failed to fetch labourers" });
    }
  });

  app.get("/api/labourers/available", isAuthenticated, async (req, res) => {
    try {
      const labourers = await storage.getAvailableLabourers();
      res.json(labourers);
    } catch (error) {
      console.error("Error fetching available labourers:", error);
      res.status(500).json({ message: "Failed to fetch available labourers" });
    }
  });

  app.get("/api/labourers/:id", isAuthenticated, async (req, res) => {
    try {
      const labourer = await storage.getLabourer(req.params.id);
      if (!labourer) {
        return res.status(404).json({ message: "Labourer not found" });
      }
      res.json(labourer);
    } catch (error) {
      console.error("Error fetching labourer:", error);
      res.status(500).json({ message: "Failed to fetch labourer" });
    }
  });

  app.post("/api/labourers", isAuthenticated, requireRole("super_admin", "admin", "project_manager", "supervisor", "project_admin"), async (req: any, res) => {
    try {
      // Use dbUser.id (attached by requireRole middleware)
      const userId = req.dbUser.id;
      const data = insertLabourerSchema.parse({ ...req.body, createdBy: userId });
      const labourer = await storage.createLabourer(data);
      res.status(201).json(labourer);
    } catch (error: any) {
      console.error("Error creating labourer:", error);
      res.status(400).json({ message: error.message || "Failed to create labourer" });
    }
  });

  app.post("/api/labourers/bulk", isAuthenticated, requireRole("super_admin", "admin", "project_manager", "supervisor", "project_admin"), async (req: any, res) => {
    try {
      // Use dbUser.id (attached by requireRole middleware)
      const userId = req.dbUser.id;
      const { labourers: labourersData } = req.body;
      
      if (!labourersData || !Array.isArray(labourersData) || labourersData.length === 0) {
        return res.status(400).json({ message: "labourers array is required and must not be empty" });
      }

      // Validate and add createdBy to each labourer
      const validatedData = labourersData.map(labourer => 
        insertLabourerSchema.parse({ ...labourer, createdBy: userId })
      );
      
      const created = await storage.bulkCreateLabourers(validatedData);
      res.status(201).json({ 
        message: `Successfully created ${created.length} labourers`,
        labourers: created 
      });
    } catch (error: any) {
      console.error("Error bulk creating labourers:", error);
      res.status(400).json({ message: error.message || "Failed to bulk create labourers" });
    }
  });

  app.put("/api/labourers/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager", "supervisor", "project_admin"), async (req, res) => {
    try {
      const data = insertLabourerSchema.partial().parse(req.body);
      const labourer = await storage.updateLabourer(req.params.id, data);
      res.json(labourer);
    } catch (error: any) {
      console.error("Error updating labourer:", error);
      res.status(400).json({ message: error.message || "Failed to update labourer" });
    }
  });

  app.post("/api/projects/:projectId/labourers", isAuthenticated, requireRole("super_admin", "admin", "project_manager", "supervisor", "project_admin"), async (req, res) => {
    try {
      const { labourerIds } = req.body;
      
      if (!labourerIds || !Array.isArray(labourerIds) || labourerIds.length === 0) {
        return res.status(400).json({ message: "labourerIds array is required" });
      }
      
      await storage.assignLabourersToProject(labourerIds, req.params.projectId);
      res.status(200).json({ message: "Labourers assigned successfully" });
    } catch (error: any) {
      console.error("Error assigning labourers:", error);
      res.status(400).json({ message: error.message || "Failed to assign labourers" });
    }
  });

  // ============= Reports Routes =============
  app.get("/api/reports/payroll", isAuthenticated, async (req, res) => {
    try {
      const { projectId, startDate, endDate } = req.query;

      if (!projectId || !startDate || !endDate) {
        return res.status(400).json({ message: "projectId, startDate, and endDate are required" });
      }

      const project = await storage.getProject(projectId as string);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all work logs for the project within the date range
      const workLogs = await storage.getWorkLogsByDateRange(
        projectId as string,
        startDate as string,
        endDate as string
      );

      // Get all labourers in the project
      const labourers = await storage.getLabourers(projectId as string);

      // Get pay rates for the project
      const payRates = await storage.getPayRates(projectId as string);

      // Aggregate work logs by labourer
      const labourerTotals = new Map<string, {
        labourerId: string;
        labourerName: string;
        idNumber: string;
        totalOpenMeters: number;
        totalCloseMeters: number;
        totalEarnings: number;
      }>();

      workLogs.forEach((log: any) => {
        const existing = labourerTotals.get(log.labourerId) || {
          labourerId: log.labourerId,
          labourerName: "",
          idNumber: "",
          totalOpenMeters: 0,
          totalCloseMeters: 0,
          totalEarnings: 0,
        };

        existing.totalOpenMeters += parseFloat(log.openTrenchingMeters || "0");
        existing.totalCloseMeters += parseFloat(log.closeTrenchingMeters || "0");
        existing.totalEarnings += parseFloat(log.totalEarnings || "0");

        labourerTotals.set(log.labourerId, existing);
      });

      // Enrich with labourer details
      const entries = Array.from(labourerTotals.values()).map(entry => {
        const labourer = labourers.find((l: any) => l.id === entry.labourerId);
        return {
          ...entry,
          labourerName: labourer ? `${labourer.firstName} ${labourer.surname}` : "Unknown",
          idNumber: labourer?.idNumber || "",
        };
      });

      // Calculate grand total
      const grandTotal = entries.reduce((sum, entry) => sum + entry.totalEarnings, 0);

      // Get average rates (simplified - using first rate found for each category)
      const openRate = payRates.find((r: any) => r.category === "open_trenching");
      const closeRate = payRates.find((r: any) => r.category === "close_trenching");

      const report = {
        projectId: project.id,
        projectName: project.name,
        startDate,
        endDate,
        paymentPeriod: project.paymentPeriod,
        openRate: openRate ? parseFloat(openRate.amount) : 0,
        closeRate: closeRate ? parseFloat(closeRate.amount) : 0,
        entries,
        grandTotal,
      };

      res.json(report);
    } catch (error: any) {
      console.error("Error generating payroll report:", error);
      res.status(500).json({ message: error.message || "Failed to generate report" });
    }
  });

  // ============= Pay Rate Routes =============
  app.get("/api/projects/:projectId/pay-rates", isAuthenticated, async (req, res) => {
    try {
      const rates = await storage.getPayRates(req.params.projectId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching pay rates:", error);
      res.status(500).json({ message: "Failed to fetch pay rates" });
    }
  });

  app.post("/api/pay-rates", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req: any, res) => {
    try {
      // Use dbUser.id (attached by requireRole middleware)
      const userId = req.dbUser.id;
      const data = insertPayRateSchema.parse({ ...req.body, createdBy: userId });
      const rate = await storage.createPayRate(data);
      res.status(201).json(rate);
    } catch (error: any) {
      console.error("Error creating pay rate:", error);
      res.status(400).json({ message: error.message || "Failed to create pay rate" });
    }
  });

  // ============= Work Log Routes =============
  app.get("/api/projects/:projectId/work-logs", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const logs = await storage.getWorkLogs(
        req.params.projectId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching work logs:", error);
      res.status(500).json({ message: "Failed to fetch work logs" });
    }
  });

  app.get("/api/labourers/:labourerId/work-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getWorkLogsByLabourer(req.params.labourerId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching work logs:", error);
      res.status(500).json({ message: "Failed to fetch work logs" });
    }
  });

  app.post("/api/work-logs", isAuthenticated, requireRole("super_admin", "admin", "project_manager", "supervisor", "project_admin"), async (req: any, res) => {
    try {
      // Use dbUser.id (attached by requireRole middleware)
      const userId = req.dbUser.id;
      const data = insertWorkLogSchema.parse({ ...req.body, recordedBy: userId });
      const log = await storage.createWorkLog(data);
      res.status(201).json(log);
    } catch (error: any) {
      console.error("Error creating work log:", error);
      res.status(400).json({ message: error.message || "Failed to create work log" });
    }
  });

  app.put("/api/work-logs/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req, res) => {
    try {
      const data = insertWorkLogSchema.partial().parse(req.body);
      const log = await storage.updateWorkLog(req.params.id, data);
      res.json(log);
    } catch (error: any) {
      console.error("Error updating work log:", error);
      res.status(400).json({ message: error.message || "Failed to update work log" });
    }
  });

  // ============= Payment Period Routes =============
  app.get("/api/projects/:projectId/payment-periods", isAuthenticated, async (req, res) => {
    try {
      const periods = await storage.getPaymentPeriods(req.params.projectId);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching payment periods:", error);
      res.status(500).json({ message: "Failed to fetch payment periods" });
    }
  });

  app.get("/api/payment-periods/:id", isAuthenticated, async (req, res) => {
    try {
      const period = await storage.getPaymentPeriod(req.params.id);
      if (!period) {
        return res.status(404).json({ message: "Payment period not found" });
      }
      res.json(period);
    } catch (error) {
      console.error("Error fetching payment period:", error);
      res.status(500).json({ message: "Failed to fetch payment period" });
    }
  });

  app.get("/api/payment-periods/:id/entries", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getPaymentPeriodEntries(req.params.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching payment entries:", error);
      res.status(500).json({ message: "Failed to fetch payment entries" });
    }
  });

  app.post("/api/payment-periods", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req, res) => {
    try {
      const data = insertPaymentPeriodSchema.parse(req.body);
      const period = await storage.createPaymentPeriod(data);
      res.status(201).json(period);
    } catch (error: any) {
      console.error("Error creating payment period:", error);
      res.status(400).json({ message: error.message || "Failed to create payment period" });
    }
  });

  app.put("/api/payment-periods/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req, res) => {
    try {
      const data = insertPaymentPeriodSchema.partial().parse(req.body);
      
      // If status is being changed to "submitted", generate payment entries from work logs
      if (data.status === "submitted") {
        const period = await storage.getPaymentPeriod(req.params.id);
        if (period) {
          // Convert dates to strings (they might already be Date objects or strings from DB)
          const startDateStr = period.startDate instanceof Date 
            ? period.startDate.toISOString().split('T')[0]
            : period.startDate.toString().split('T')[0];
          const endDateStr = period.endDate instanceof Date
            ? period.endDate.toISOString().split('T')[0]
            : period.endDate.toString().split('T')[0];
          
          // Fetch all work logs for this project in the date range
          const workLogs = await storage.getWorkLogsByDateRange(
            period.projectId,
            startDateStr,
            endDateStr
          );
          
          // Aggregate work logs by labourer
          const labourerEarnings = new Map<string, number>();
          for (const log of workLogs) {
            const current = labourerEarnings.get(log.labourerId) || 0;
            labourerEarnings.set(log.labourerId, current + Number(log.totalEarnings));
          }
          
          // Create payment period entries for each labourer
          let totalAmount = 0;
          for (const [labourerId, totalEarnings] of labourerEarnings.entries()) {
            // Check if entry already exists to avoid duplicates
            const existingEntries = await storage.getPaymentPeriodEntries(req.params.id);
            const alreadyExists = existingEntries.some(e => e.labourerId === labourerId);
            
            if (!alreadyExists) {
              await storage.createPaymentPeriodEntry({
                periodId: req.params.id,
                labourerId,
                daysWorked: 0, // Can be calculated later if needed
                totalMeters: "0", // Can be calculated later if needed
                totalEarnings: totalEarnings.toString(),
              });
              totalAmount += totalEarnings;
            }
          }
          
          // Update the payment period's totalAmount field
          if (totalAmount > 0) {
            data.totalAmount = totalAmount.toString();
          }
        }
      }
      
      const period = await storage.updatePaymentPeriod(req.params.id, data);
      res.json(period);
    } catch (error: any) {
      console.error("Error updating payment period:", error);
      res.status(400).json({ message: error.message || "Failed to update payment period" });
    }
  });

  // ============= Correction Request Routes =============
  app.get("/api/correction-requests", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getCorrectionRequests(status as string | undefined);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching correction requests:", error);
      res.status(500).json({ message: "Failed to fetch correction requests" });
    }
  });

  app.get("/api/correction-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getCorrectionRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Correction request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching correction request:", error);
      res.status(500).json({ message: "Failed to fetch correction request" });
    }
  });

  app.post("/api/correction-requests", isAuthenticated, async (req: any, res) => {
    try {
      // Look up by email (not sub) to handle OIDC sub rotation
      const userEmail = req.user.claims.email;
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const data = insertCorrectionRequestSchema.parse({ ...req.body, requestedBy: user.id });
      const request = await storage.createCorrectionRequest(data);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating correction request:", error);
      res.status(400).json({ message: error.message || "Failed to create correction request" });
    }
  });

  app.put("/api/correction-requests/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req: any, res) => {
    try {
      // Use dbUser.id (attached by requireRole middleware)
      const userId = req.dbUser.id;
      const data = insertCorrectionRequestSchema.partial().parse({ 
        ...req.body, 
        reviewedBy: userId,
        reviewedAt: new Date()
      });
      const request = await storage.updateCorrectionRequest(req.params.id, data);
      res.json(request);
    } catch (error: any) {
      console.error("Error updating correction request:", error);
      res.status(400).json({ message: error.message || "Failed to update correction request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}