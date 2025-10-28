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
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ============= Authentication Routes =============
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // ============= Project Routes =============
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let projects: any[] = [];
      if (user?.role === "super_admin" || user?.role === "admin") {
        projects = await storage.getProjects();
      } else if (user?.role === "project_manager") {
        projects = await storage.getProjectsByManager(userId);
      } else if (user?.role === "supervisor") {
        projects = await storage.getProjectsBySupervisor(userId);
      } else {
        // Labourers can only see their assigned project
        const labourer = await storage.getLabourerByUserId(userId);
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

  app.post("/api/projects", isAuthenticated, requireRole("super_admin", "admin"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertProjectSchema.parse({ ...req.body, createdBy: userId });
      const project = await storage.createProject(data);
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
      const userId = req.user.claims.sub;
      const data = insertLabourerSchema.parse({ ...req.body, createdBy: userId });
      const labourer = await storage.createLabourer(data);
      res.status(201).json(labourer);
    } catch (error: any) {
      console.error("Error creating labourer:", error);
      res.status(400).json({ message: error.message || "Failed to create labourer" });
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const data = insertCorrectionRequestSchema.parse({ ...req.body, requestedBy: userId });
      const request = await storage.createCorrectionRequest(data);
      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating correction request:", error);
      res.status(400).json({ message: error.message || "Failed to create correction request" });
    }
  });

  app.put("/api/correction-requests/:id", isAuthenticated, requireRole("super_admin", "admin", "project_manager"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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