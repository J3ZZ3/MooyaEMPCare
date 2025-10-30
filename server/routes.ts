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
        if (labourer && labourer.projectId) {
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
      const { supervisorId, ...projectData } = req.body;
      const data = insertProjectSchema.parse({ ...projectData, createdBy: userId });
      const project = await storage.createProject(data);
      
      // If supervisorId is provided, assign them to the project
      if (supervisorId) {
        await storage.assignProjectSupervisor(project.id, supervisorId);
      }
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req: any, res) => {
    try {
      const data = insertProjectSchema.partial().parse(req.body);
      
      // Project managers can only update status, not other fields
      if (req.dbUser.role === "project_manager") {
        const allowedFields = ["status"];
        const submittedFields = Object.keys(data);
        const unauthorizedFields = submittedFields.filter(field => !allowedFields.includes(field));
        
        if (unauthorizedFields.length > 0) {
          return res.status(403).json({ 
            message: `Project managers can only update status. Unauthorized fields: ${unauthorizedFields.join(", ")}` 
          });
        }
      }
      
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

  // Worker Activity Report - detailed daily breakdown
  app.get("/api/reports/worker-activity", isAuthenticated, async (req, res) => {
    try {
      const { projectId, labourerId, startDate, endDate, groupBy = 'daily' } = req.query;

      if (!projectId || !startDate || !endDate) {
        return res.status(400).json({ message: "projectId, startDate, and endDate are required" });
      }

      const project = await storage.getProject(projectId as string);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get work logs for the date range
      let workLogs = await storage.getWorkLogsByDateRange(
        projectId as string,
        startDate as string,
        endDate as string
      );

      // Filter by labourer if specified
      if (labourerId && labourerId !== 'all') {
        workLogs = workLogs.filter(log => log.labourerId === labourerId);
      }

      // Get all labourers to enrich data
      const labourers = await storage.getLabourers(projectId as string);
      const labourerMap = new Map(labourers.map((l: any) => [l.id, l]));

      // Enrich work logs with labourer details
      const enrichedLogs = workLogs.map(log => {
        const labourer = labourerMap.get(log.labourerId);
        return {
          workDate: log.workDate,
          labourerId: log.labourerId,
          labourerName: labourer ? `${labourer.firstName} ${labourer.surname}` : "Unknown",
          idNumber: labourer?.idNumber || "",
          openMeters: parseFloat(log.openTrenchingMeters || "0"),
          closeMeters: parseFloat(log.closeTrenchingMeters || "0"),
          totalMeters: parseFloat(log.openTrenchingMeters || "0") + parseFloat(log.closeTrenchingMeters || "0"),
          earnings: parseFloat(log.totalEarnings || "0"),
        };
      });

      // Group by requested period
      let groupedData: any[] = [];
      
      if (groupBy === 'daily') {
        // Already daily - just return enriched logs
        groupedData = enrichedLogs;
      } else if (groupBy === 'weekly') {
        // Group by week
        const weeklyMap = new Map<string, any>();
        enrichedLogs.forEach(log => {
          const date = new Date(log.workDate);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          const weekKey = `${log.labourerId}-${weekStart.toISOString().split('T')[0]}`;
          
          const existing = weeklyMap.get(weekKey) || {
            weekStart: weekStart.toISOString().split('T')[0],
            labourerId: log.labourerId,
            labourerName: log.labourerName,
            idNumber: log.idNumber,
            openMeters: 0,
            closeMeters: 0,
            totalMeters: 0,
            earnings: 0,
            daysWorked: 0,
          };
          
          existing.openMeters += log.openMeters;
          existing.closeMeters += log.closeMeters;
          existing.totalMeters += log.totalMeters;
          existing.earnings += log.earnings;
          existing.daysWorked += 1;
          
          weeklyMap.set(weekKey, existing);
        });
        groupedData = Array.from(weeklyMap.values());
      } else if (groupBy === 'monthly') {
        // Group by month
        const monthlyMap = new Map<string, any>();
        enrichedLogs.forEach(log => {
          const date = new Date(log.workDate);
          const monthKey = `${log.labourerId}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          const existing = monthlyMap.get(monthKey) || {
            month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            labourerId: log.labourerId,
            labourerName: log.labourerName,
            idNumber: log.idNumber,
            openMeters: 0,
            closeMeters: 0,
            totalMeters: 0,
            earnings: 0,
            daysWorked: 0,
          };
          
          existing.openMeters += log.openMeters;
          existing.closeMeters += log.closeMeters;
          existing.totalMeters += log.totalMeters;
          existing.earnings += log.earnings;
          existing.daysWorked += 1;
          
          monthlyMap.set(monthKey, existing);
        });
        groupedData = Array.from(monthlyMap.values());
      }

      // Calculate totals
      const totalOpenMeters = groupedData.reduce((sum, row) => sum + row.openMeters, 0);
      const totalCloseMeters = groupedData.reduce((sum, row) => sum + row.closeMeters, 0);
      const totalMeters = groupedData.reduce((sum, row) => sum + row.totalMeters, 0);
      const totalEarnings = groupedData.reduce((sum, row) => sum + row.earnings, 0);

      res.json({
        projectId: project.id,
        projectName: project.name,
        startDate,
        endDate,
        groupBy,
        data: groupedData,
        totals: {
          openMeters: totalOpenMeters,
          closeMeters: totalCloseMeters,
          totalMeters,
          earnings: totalEarnings,
        },
      });
    } catch (error: any) {
      console.error("Error generating worker activity report:", error);
      res.status(500).json({ message: error.message || "Failed to generate worker activity report" });
    }
  });

  // Worker Activity Matrix - pivot table with workers as rows, dates as columns
  app.get("/api/reports/worker-activity-matrix", isAuthenticated, async (req, res) => {
    try {
      const { projectId, startDate, endDate, metricType = 'total' } = req.query;

      if (!projectId || !startDate || !endDate) {
        return res.status(400).json({ message: "projectId, startDate, and endDate are required" });
      }

      const project = await storage.getProject(projectId as string);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get work logs for the date range
      const workLogs = await storage.getWorkLogsByDateRange(
        projectId as string,
        startDate as string,
        endDate as string
      );

      // Get all labourers for the project
      const labourers = await storage.getLabourers(projectId as string);
      const labourerMap = new Map(labourers.map((l: any) => [l.id, l]));

      // Get employee types with pay rates
      const employeeTypes = await storage.getEmployeeTypes();
      const employeeTypeMap = new Map(employeeTypes.map((et: any) => [et.id, et]));

      // Generate all dates in the range
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const dates: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Build matrix data structure
      // Map: labourerId -> Map: date -> { opens, closes, total }
      const matrixData = new Map<string, Map<string, { opens: number; closes: number; total: number }>>();

      workLogs.forEach((log: any) => {
        if (!matrixData.has(log.labourerId)) {
          matrixData.set(log.labourerId, new Map());
        }
        
        const labourerDates = matrixData.get(log.labourerId)!;
        const opens = parseFloat(log.openTrenchingMeters || "0");
        const closes = parseFloat(log.closeTrenchingMeters || "0");
        
        labourerDates.set(log.workDate, {
          opens,
          closes,
          total: opens + closes
        });
      });

      // Convert to array format for frontend
      const rows = Array.from(matrixData.entries()).map(([labourerId, dateMap]) => {
        const labourer = labourerMap.get(labourerId);
        const labourerName = labourer ? `${labourer.firstName} ${labourer.surname}` : "Unknown";
        const idNumber = labourer?.idNumber || "";
        
        // Build daily values array
        const dailyValues = dates.map(date => {
          const work = dateMap.get(date);
          return work ? {
            opens: work.opens,
            closes: work.closes,
            total: work.total
          } : {
            opens: 0,
            closes: 0,
            total: 0
          };
        });

        // Calculate row totals
        const rowTotals = {
          opens: dailyValues.reduce((sum, day) => sum + day.opens, 0),
          closes: dailyValues.reduce((sum, day) => sum + day.closes, 0),
          total: dailyValues.reduce((sum, day) => sum + day.total, 0),
          totalAmount: 0
        };

        // Calculate earnings based on employee type rates
        if (labourer?.employeeTypeId) {
          const employeeType = employeeTypeMap.get(labourer.employeeTypeId);
          if (employeeType) {
            const openRate = parseFloat(employeeType.openTrenchingRate || "0");
            const closeRate = parseFloat(employeeType.closeTrenchingRate || "0");
            rowTotals.totalAmount = (rowTotals.opens * openRate) + (rowTotals.closes * closeRate);
          }
        }

        return {
          labourerId,
          labourerName,
          idNumber,
          dailyValues,
          rowTotals
        };
      });

      // Sort by labourer name
      rows.sort((a, b) => a.labourerName.localeCompare(b.labourerName));

      res.json({
        projectId: project.id,
        projectName: project.name,
        startDate,
        endDate,
        dates,
        rows,
      });
    } catch (error: any) {
      console.error("Error generating worker activity matrix:", error);
      res.status(500).json({ message: error.message || "Failed to generate worker activity matrix" });
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
      
      // Helper to extract yyyy-MM-dd from any date value without UTC drift
      const toLocalDateString = (dateValue: any): string => {
        if (!dateValue) return '';
        
        // If string, extract yyyy-MM-dd part only (handles "2024-01-01" and "2024-01-01T..." formats)
        if (typeof dateValue === 'string') {
          const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
          return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
        }
        
        // For Date objects, extract local components (server's "today")
        if (dateValue instanceof Date) {
          return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
        }
        
        // Reject all other types (numbers, objects, etc.) to prevent drift
        return '';
      };
      
      // Server-side validation: Only allow today's date for new work logs (PRD requirement)
      const today = toLocalDateString(new Date());
      const workDate = toLocalDateString(data.workDate);
      
      if (!workDate) {
        return res.status(400).json({ message: "Invalid work date format" });
      }
      
      if (workDate !== today) {
        return res.status(400).json({ 
          message: "Can only create work logs for today. To modify historical data, submit a correction request." 
        });
      }
      
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
      
      // Helper to extract yyyy-MM-dd from any date value without UTC drift
      const toLocalDateString = (dateValue: any): string => {
        if (!dateValue) return '';
        
        // If string, extract yyyy-MM-dd part only (handles "2024-01-01" and "2024-01-01T..." formats)
        if (typeof dateValue === 'string') {
          const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
          return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
        }
        
        // For Date objects, extract local components (server's "today")
        if (dateValue instanceof Date) {
          return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
        }
        
        // Reject all other types (numbers, objects, etc.) to prevent drift
        return '';
      };
      
      // Get today's date in local timezone
      const today = toLocalDateString(new Date());
      
      // Fetch existing work log to validate its date (PRD requirement: only today's logs can be edited)
      const existingLog = await storage.getWorkLog(req.params.id);
      if (!existingLog) {
        return res.status(404).json({ message: "Work log not found" });
      }
      
      // Check existing log's workDate is today
      const existingWorkDate = toLocalDateString(existingLog.workDate);
      if (existingWorkDate !== today) {
        return res.status(400).json({ 
          message: "Can only update today's work logs. To modify historical data, submit a correction request." 
        });
      }
      
      // If payload includes workDate, validate it's also today (prevent changing date to historical)
      if (data.workDate) {
        const payloadWorkDate = toLocalDateString(data.workDate);
        if (!payloadWorkDate) {
          return res.status(400).json({ message: "Invalid work date format in payload" });
        }
        if (payloadWorkDate !== today) {
          return res.status(400).json({ 
            message: "Can only set work date to today. To modify historical data, submit a correction request." 
          });
        }
      }
      
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
      
      // Auto-calculate total amount from work logs in the date range
      // Convert dates to yyyy-MM-dd strings
      const startDateStr = typeof data.startDate === 'string' 
        ? data.startDate.split('T')[0]
        : (data.startDate as Date).toISOString().split('T')[0];
      const endDateStr = typeof data.endDate === 'string'
        ? data.endDate.split('T')[0]
        : (data.endDate as Date).toISOString().split('T')[0];
      
      // Fetch all work logs for this project in the date range
      const workLogs = await storage.getWorkLogsByDateRange(
        data.projectId,
        startDateStr,
        endDateStr
      );
      
      // Calculate total earnings from work logs
      const totalAmount = workLogs.reduce((sum, log) => sum + Number(log.totalEarnings || 0), 0);
      
      // Set the calculated total amount
      data.totalAmount = totalAmount.toString();
      
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
          // Check if entries already exist (idempotency - don't recreate if already submitted)
          const existingEntries = await storage.getPaymentPeriodEntries(req.params.id);
          
          if (existingEntries.length === 0) {
            // No entries exist yet - create them from work logs
            // Convert dates to strings (handle both Date objects and strings from DB)
            const startDate: any = period.startDate;
            const endDate: any = period.endDate;
            const startDateStr = startDate instanceof Date 
              ? startDate.toISOString().split('T')[0]
              : String(startDate).split('T')[0];
            const endDateStr = endDate instanceof Date
              ? endDate.toISOString().split('T')[0]
              : String(endDate).split('T')[0];
            
            // Fetch all work logs for this project in the date range
            const workLogs = await storage.getWorkLogsByDateRange(
              period.projectId,
              startDateStr,
              endDateStr
            );
            
            // Aggregate work logs by labourer
            const labourerData = new Map<string, {
              openMeters: number;
              closeMeters: number;
              totalEarnings: number;
              daysWorked: Set<string>;
            }>();
            
            for (const log of workLogs) {
              const current = labourerData.get(log.labourerId) || {
                openMeters: 0,
                closeMeters: 0,
                totalEarnings: 0,
                daysWorked: new Set<string>(),
              };
              
              current.openMeters += Number(log.openTrenchingMeters || 0);
              current.closeMeters += Number(log.closeTrenchingMeters || 0);
              current.totalEarnings += Number(log.totalEarnings || 0);
              current.daysWorked.add(log.workDate);
              
              labourerData.set(log.labourerId, current);
            }
            
            // Create payment period entries for each labourer
            let totalAmount = 0;
            for (const [labourerId, data] of Array.from(labourerData.entries())) {
              const totalMeters = data.openMeters + data.closeMeters;
              await storage.createPaymentPeriodEntry({
                periodId: req.params.id,
                labourerId,
                daysWorked: data.daysWorked.size,
                openMeters: data.openMeters.toString(),
                closeMeters: data.closeMeters.toString(),
                totalMeters: totalMeters.toString(),
                totalEarnings: data.totalEarnings.toString(),
              });
              totalAmount += data.totalEarnings;
            }
            
            // Update the payment period's totalAmount field
            if (totalAmount > 0) {
              data.totalAmount = totalAmount.toString();
            }
          } else {
            // Entries already exist - calculate total from existing entries
            const totalAmount = existingEntries.reduce((sum, e) => sum + Number(e.totalEarnings), 0);
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