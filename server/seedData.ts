import { db } from "./db";
import { storage } from "./storage";
import bcrypt from "bcrypt";

// South African Names
const saFirstNames = [
  "Thabo", "Sipho", "Lerato", "Nomsa", "Kagiso", "Zanele", "Mandla", "Precious",
  "Bongani", "Thandiwe", "Sello", "Refilwe", "Nhlanhla", "Palesa", "Lungile", "Ntombi",
  "Mpho", "Katlego", "Tebogo", "Dineo", "Themba", "Lindiwe", "Sibusiso", "Nokuthula",
  "Jabu", "Nandi", "Dumisani", "Zinhle", "Mthunzi", "Ayanda", "Thandeka", "Sabelo",
  "Bongiwe", "Siyabonga", "Nomvula", "Bheki", "Thulani", "Zodwa", "Vusi", "Nomalanga"
];

const saLastNames = [
  "Nkosi", "Dlamini", "Mokoena", "Khumalo", "Zulu", "Molefe", "Mthembu", "Sithole",
  "Ndlovu", "Mahlangu", "Buthelezi", "Ntuli", "Shabalala", "Ngcobo", "Mkhize", "Radebe",
  "Cebekhulu", "Zwane", "Tshabalala", "Cele", "Mazibuko", "Zungu", "Khoza", "Hadebe",
  "Nxumalo", "Biyela", "Gumede", "Naidoo", "Pillay", "Reddy", "Moodley", "Govender",
  "Chetty", "Naicker", "Padayachee", "Singh", "Van der Merwe", "Botha", "De Villiers", "Fourie"
];

// Foreign Names (Zimbabwe, Mozambique, Lesotho)
const foreignNames = [
  { first: "Tendai", last: "Moyo", country: "Zimbabwe" },
  { first: "Farai", last: "Ncube", country: "Zimbabwe" },
  { first: "Rumbidzai", last: "Sibanda", country: "Zimbabwe" },
  { first: "Anesu", last: "Chirwa", country: "Zimbabwe" },
  { first: "Carlos", last: "Machel", country: "Mozambique" },
  { first: "Amélia", last: "Santos", country: "Mozambique" },
  { first: "João", last: "Fernandes", country: "Mozambique" },
  { first: "Isabel", last: "Dos Santos", country: "Mozambique" },
  { first: "Thabo", last: "Molapo", country: "Lesotho" },
  { first: "Masechaba", last: "Khethisa", country: "Lesotho" },
  { first: "Tšepo", last: "Moloi", country: "Lesotho" },
  { first: "Lineo", last: "Motaung", country: "Lesotho" },
];

// Generate valid RSA ID number (format: YYMMDD GSSS CAZ)
function generateRSAID(birthYear: number, birthMonth: number, birthDay: number, gender: "M" | "F"): string {
  const yy = birthYear.toString().slice(-2).padStart(2, "0");
  const mm = birthMonth.toString().padStart(2, "0");
  const dd = birthDay.toString().padStart(2, "0");
  const genderCode = gender === "M" ? Math.floor(Math.random() * 5000 + 5000) : Math.floor(Math.random() * 5000);
  const citizenship = "0"; // SA citizen
  const checkDigit = Math.floor(Math.random() * 10);
  return `${yy}${mm}${dd}${genderCode.toString().padStart(4, "0")}${citizenship}8${checkDigit}`;
}

// Generate passport number
function generatePassport(country: string): string {
  const prefixes: Record<string, string> = {
    "Zimbabwe": "AN",
    "Mozambique": "MP",
    "Lesotho": "LS",
  };
  const prefix = prefixes[country] || "XX";
  const number = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}${number}`;
}

// Generate DOB from RSA ID
function getdobFromID(year: number, month: number, day: number): string {
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  const mm = month.toString().padStart(2, "0");
  const dd = day.toString().padStart(2, "0");
  return `${fullYear}-${mm}-${dd}`;
}

// South African Banks with Universal Branch Codes (matching frontend)
const SA_BANKS = [
  { name: "Absa Bank", universalBranchCode: "632005" },
  { name: "Capitec Bank", universalBranchCode: "470010" },
  { name: "First National Bank (FNB)", universalBranchCode: "250655" },
  { name: "Nedbank", universalBranchCode: "198765" },
  { name: "Standard Bank", universalBranchCode: "051001" },
  { name: "African Bank", universalBranchCode: "430000" },
  { name: "TymeBank", universalBranchCode: "678910" },
] as const;

// Date helpers
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function seedData() {
  console.log("Starting seed data generation...");

  // ============= 1. EMPLOYEE TYPES =============
  console.log("1. Creating employee types...");
  
  const employeeTypeData = [
    { name: "Trainee", description: "Entry-level trainee" },
    { name: "General Worker", description: "General construction worker" },
    { name: "Semi-Skilled", description: "Semi-skilled technician" },
    { name: "Skilled", description: "Skilled technician" },
    { name: "Supervisor", description: "Team supervisor" },
  ];

  const createdEmployeeTypes: any[] = [];
  const existingTypes = await storage.getEmployeeTypes();
  
  for (const et of employeeTypeData) {
    const existing = existingTypes.find(e => e.name === et.name);
    if (existing) {
      createdEmployeeTypes.push(existing);
    } else {
      const created = await storage.createEmployeeType(et);
      createdEmployeeTypes.push(created);
    }
  }

  // ============= 2. STAFF USERS =============
  console.log("2. Creating staff users...");

  const staffUsers = [
    {
      email: "james.vanderwalt@mooya.co.za",
      firstName: "James",
      lastName: "van der Walt",
      role: "admin" as const,
      oidcSub: "mock_sub_james",
    },
    {
      email: "sarah.nkosi@mooya.co.za",
      firstName: "Sarah",
      lastName: "Nkosi",
      role: "project_manager" as const,
      oidcSub: "mock_sub_sarah",
    },
    {
      email: "michael.botha@mooya.co.za",
      firstName: "Michael",
      lastName: "Botha",
      role: "project_manager" as const,
      oidcSub: "mock_sub_michael",
    },
    {
      email: "lindiwe.dlamini@mooya.co.za",
      firstName: "Lindiwe",
      lastName: "Dlamini",
      role: "supervisor" as const,
      oidcSub: "mock_sub_lindiwe",
    },
    {
      email: "thabo.molefe@xnext.co.za",
      firstName: "Thabo",
      lastName: "Molefe",
      role: "supervisor" as const,
      oidcSub: "mock_sub_thabo",
    },
    {
      email: "priya.naidoo@mooyawireless.co.za",
      firstName: "Priya",
      lastName: "Naidoo",
      role: "supervisor" as const,
      oidcSub: "mock_sub_priya",
    },
    {
      email: "johan.fourie@mooya.co.za",
      firstName: "Johan",
      lastName: "Fourie",
      role: "supervisor" as const,
      oidcSub: "mock_sub_johan",
    },
  ];

  const createdStaff: any[] = [];
  for (const staff of staffUsers) {
    const existing = await storage.getUserByEmail(staff.email);
    if (existing) {
      createdStaff.push(existing);
    } else {
      const created = await storage.upsertUser(staff);
      createdStaff.push(created);
    }
  }

  const [admin, pm1, pm2, sup1, sup2, sup3, sup4] = createdStaff;
  console.log(`Created/found ${createdStaff.length} staff users`);

  // ============= 3. PROJECTS =============
  console.log("3. Creating projects...");

  const projectsData = [
    {
      name: "Sandton CBD Fibre Rollout",
      location: "Sandton, Johannesburg",
      description: "High-density fibre deployment in Sandton business district covering 15km of trenching",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-10-31"),
      status: "active" as const,
      budget: "2500000",
      paymentPeriod: "fortnightly" as const,
      createdBy: admin.id,
      supervisorIds: [sup1.id, sup2.id],
    },
    {
      name: "Soweto Residential Deployment",
      location: "Soweto, Johannesburg",
      description: "Residential fibre to the home deployment across multiple suburbs",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-10-31"),
      status: "active" as const,
      budget: "1800000",
      paymentPeriod: "monthly" as const,
      createdBy: admin.id,
      supervisorIds: [sup3.id],
    },
    {
      name: "Pretoria East Network Expansion",
      location: "Pretoria East",
      description: "Network expansion in Pretoria East suburbs including Menlyn and Waterkloof",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-10-31"),
      status: "active" as const,
      budget: "2100000",
      paymentPeriod: "fortnightly" as const,
      createdBy: admin.id,
      supervisorIds: [sup4.id],
    },
    {
      name: "Durban North Coast Deployment",
      location: "Umhlanga, Durban",
      description: "Coastal fibre deployment from Umhlanga to Ballito",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-10-31"),
      status: "active" as const,
      budget: "1950000",
      paymentPeriod: "monthly" as const,
      createdBy: admin.id,
      supervisorIds: [sup2.id],
    },
  ];

  const createdProjects: any[] = [];
  for (const proj of projectsData) {
    const { supervisorIds, ...projectData } = proj;
    const created = await storage.createProject(projectData);
    createdProjects.push({ ...created, supervisorIds });

    // Assign supervisors
    for (const supId of supervisorIds) {
      await storage.assignProjectSupervisor(created.id, supId);
    }

    // Create pay rates for this project
    const basePayRates: Record<string, number> = {
      "Trainee": 1.80,
      "General Worker": 2.20,
      "Semi-Skilled": 2.80,
      "Skilled": 3.50,
      "Supervisor": 4.50,
    };

    for (const empType of createdEmployeeTypes) {
      // Create open trenching rate
      await storage.createPayRate({
        projectId: created.id,
        employeeTypeId: empType.id,
        category: "open_trenching",
        amount: basePayRates[empType.name]?.toString() || "2.00",
        unit: "per_meter",
        effectiveDate: "2025-08-01",
        createdBy: admin.id,
      });

      // Create close trenching rate (slightly lower)
      await storage.createPayRate({
        projectId: created.id,
        employeeTypeId: empType.id,
        category: "close_trenching",
        amount: (basePayRates[empType.name] * 0.9)?.toString() || "1.80",
        unit: "per_meter",
        effectiveDate: "2025-08-01",
        createdBy: admin.id,
      });
    }
  }

  console.log(`Created ${createdProjects.length} projects`);

  // ============= 4. LABOURERS =============
  console.log("4. Creating labourers...");

  const createdLabourers: any[] = [];
  const employeeTypeIds = createdEmployeeTypes.map(et => et.id);

  // Create 40 SA labourers
  for (let i = 0; i < 40; i++) {
    const firstName = saFirstNames[Math.floor(Math.random() * saFirstNames.length)];
    const surname = saLastNames[Math.floor(Math.random() * saLastNames.length)];
    const gender = Math.random() > 0.5 ? "M" : "F";
    
    // Random birth date between 1980-2003 (ages 22-45)
    const birthYear = 80 + Math.floor(Math.random() * 24); // 80-103
    const birthMonth = 1 + Math.floor(Math.random() * 12);
    const birthDay = 1 + Math.floor(Math.random() * 28);
    
    const idNumber = generateRSAID(1900 + birthYear, birthMonth, birthDay, gender);
    const hashedId = await bcrypt.hash(idNumber, 10);
    const dateOfBirth = getdobFromID(birthYear, birthMonth, birthDay);
    
    // Random employee type (weighted toward General Worker)
    const employeeTypeIndex = Math.random() < 0.5 ? 1 : Math.floor(Math.random() * (employeeTypeIds.length - 1));
    
    const labourer = await storage.createLabourer({
      firstName,
      surname,
      idNumber,
      passwordHash: hashedId,
      dateOfBirth,
      contactNumber: `+27${Math.floor(Math.random() * 900000000 + 600000000)}`,
      email: `${firstName.toLowerCase()}.${surname.toLowerCase()}${i}@worker.mooya.co.za`,
      employeeTypeId: employeeTypeIds[employeeTypeIndex],
      ...(() => {
        const randomBank = SA_BANKS[Math.floor(Math.random() * SA_BANKS.length)];
        return {
          bankName: randomBank.name,
          branchCode: randomBank.universalBranchCode,
        };
      })(),
      accountNumber: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
      accountType: Math.random() > 0.5 ? "savings" as const : "cheque" as const,
      createdBy: admin.id,
    });
    
    createdLabourers.push(labourer);
  }

  // Create 12 foreign nationals
  for (let i = 0; i < 12; i++) {
    const foreignWorker = foreignNames[i];
    const passportNumber = generatePassport(foreignWorker.country);
    const hashedPassport = await bcrypt.hash(passportNumber, 10);
    
    // Foreign workers tend to be in lower tiers
    const employeeTypeIndex = Math.random() < 0.7 ? 0 : 1;
    
    const labourer = await storage.createLabourer({
      firstName: foreignWorker.first,
      surname: foreignWorker.last,
      idNumber: passportNumber,
      passwordHash: hashedPassport,
      dateOfBirth: "1990-01-01", // Placeholder
      contactNumber: `+27${Math.floor(Math.random() * 900000000 + 600000000)}`,
      email: `${foreignWorker.first.toLowerCase()}.${foreignWorker.last.toLowerCase()}@worker.mooya.co.za`,
      employeeTypeId: employeeTypeIds[employeeTypeIndex],
      ...(() => {
        const randomBank = SA_BANKS[Math.floor(Math.random() * SA_BANKS.length)];
        return {
          bankName: randomBank.name,
          branchCode: randomBank.universalBranchCode,
        };
      })(),
      accountNumber: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
      accountType: "savings" as const,
      createdBy: admin.id,
    });
    
    createdLabourers.push(labourer);
  }

  console.log(`Created ${createdLabourers.length} labourers (40 SA + 12 foreign nationals)`);

  // ============= 5. ASSIGN LABOURERS TO PROJECTS =============
  console.log("5. Assigning labourers to projects...");

  // Distribute labourers across projects
  const labourersPerProject = Math.floor(createdLabourers.length / createdProjects.length);
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const start = i * labourersPerProject;
    const end = i === createdProjects.length - 1 ? createdLabourers.length : start + labourersPerProject;
    
    const labourerIds = [];
    for (let j = start; j < end; j++) {
      labourerIds.push(createdLabourers[j].id);
    }
    
    await storage.assignLabourersToProject(labourerIds, project.id);
  }

  console.log("Labourers assigned to projects");

  // ============= 6. WORK LOGS =============
  console.log("6. Generating work logs for past 3 months...");

  const startDate = new Date("2025-08-01");
  const endDate = new Date("2025-10-30");
  
  let totalWorkLogs = 0;
  
  for (const project of createdProjects) {
    console.log(`  Generating logs for ${project.name}...`);
    
    // Get labourers for this project
    const projectLabourers = await storage.getLabourers(project.id);
    
    // Get supervisor for this project
    const supervisorId = project.supervisorIds[0];
    
    // Get pay rates for this project
    const payRates = await storage.getPayRates(project.id);
    const rateMap = new Map<string, { open: number, close: number }>();
    
    for (const rate of payRates) {
      if (!rateMap.has(rate.employeeTypeId)) {
        rateMap.set(rate.employeeTypeId, { open: 0, close: 0 });
      }
      const amount = parseFloat(rate.amount);
      if (rate.category === "open_trenching") {
        rateMap.get(rate.employeeTypeId)!.open = amount;
      } else if (rate.category === "close_trenching") {
        rateMap.get(rate.employeeTypeId)!.close = amount;
      }
    }
    
    // Generate work logs for each day
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = getDateString(currentDate);
      const dayOfWeek = currentDate.getDay();
      
      // Weekend - reduced workforce
      const workProbability = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 0.85;
      
      for (const labourer of projectLabourers) {
        // Random chance of working this day
        if (Math.random() < workProbability) {
          const openMeters = Math.floor(Math.random() * 40 + 20); // 20-60 meters
          const closeMeters = Math.floor(Math.random() * 35 + 15); // 15-50 meters
          
          // Get pay rates
          const rates = rateMap.get(labourer.employeeTypeId);
          const openRate = rates?.open || 2.00;
          const closeRate = rates?.close || 1.80;
          
          const totalEarnings = ((openMeters * openRate) + (closeMeters * closeRate)).toFixed(2);
          
          await storage.createWorkLog({
            labourerId: labourer.id,
            projectId: project.id,
            workDate: dateStr,
            openTrenchingMeters: openMeters.toString(),
            closeTrenchingMeters: closeMeters.toString(),
            totalEarnings,
            recordedBy: supervisorId,
          });
          
          totalWorkLogs++;
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }
  }

  console.log(`Created ${totalWorkLogs} work log entries`);

  // ============= 7. PAYMENT PERIODS =============
  console.log("7. Creating payment periods...");

  for (const project of createdProjects) {
    console.log(`  Creating periods for ${project.name}...`);
    
    if (project.paymentPeriod === "fortnightly") {
      // Create 6 fortnightly periods
      const periods = [
        { start: "2025-08-01", end: "2025-08-14", status: "paid" },
        { start: "2025-08-15", end: "2025-08-31", status: "paid" },
        { start: "2025-09-01", end: "2025-09-14", status: "paid" },
        { start: "2025-09-15", end: "2025-09-30", status: "approved" },
        { start: "2025-10-01", end: "2025-10-14", status: "submitted" },
        { start: "2025-10-15", end: "2025-10-30", status: "open" },
      ];
      
      for (const period of periods) {
        const createdPeriod = await storage.createPaymentPeriod({
          projectId: project.id,
          startDate: period.start,
          endDate: period.end,
          status: period.status as any,
          submittedBy: period.status !== "open" ? project.supervisorIds[0] : null,
          submittedAt: period.status !== "open" ? new Date(`${period.end}T18:00:00Z`) : null,
          approvedBy: (period.status === "approved" || period.status === "paid") ? admin.id : null,
          approvedAt: (period.status === "approved" || period.status === "paid") ? new Date(`${period.end}T20:00:00Z`) : null,
        });
        
        // Get work logs for this period
        const workLogsInPeriod = await storage.getWorkLogsByDateRange(project.id, period.start, period.end);
        
        // Group by labourer
        const labourerWorkLogs = new Map<string, any[]>();
        for (const wl of workLogsInPeriod) {
          if (!labourerWorkLogs.has(wl.labourerId)) {
            labourerWorkLogs.set(wl.labourerId, []);
          }
          labourerWorkLogs.get(wl.labourerId)!.push(wl);
        }
        
        // Create entries
        for (const [labourerId, logs] of Array.from(labourerWorkLogs.entries())) {
          const openMeters = logs.reduce((sum, l) => sum + parseFloat(l.openTrenchingMeters || "0"), 0);
          const closeMeters = logs.reduce((sum, l) => sum + parseFloat(l.closeTrenchingMeters || "0"), 0);
          const totalMeters = openMeters + closeMeters;
          const totalAmount = logs.reduce((sum, l) => sum + parseFloat(l.totalEarnings || "0"), 0);
          
          await storage.createPaymentPeriodEntry({
            periodId: createdPeriod.id,
            labourerId,
            openMeters: openMeters.toFixed(2),
            closeMeters: closeMeters.toFixed(2),
            totalMeters: totalMeters.toFixed(2),
            totalEarnings: totalAmount.toFixed(2),
            daysWorked: logs.length,
          });
        }
      }
    } else {
      // Monthly periods
      const periods = [
        { start: "2025-08-01", end: "2025-08-31", status: "paid" },
        { start: "2025-09-01", end: "2025-09-30", status: "approved" },
        { start: "2025-10-01", end: "2025-10-31", status: "open" },
      ];
      
      for (const period of periods) {
        const createdPeriod = await storage.createPaymentPeriod({
          projectId: project.id,
          startDate: period.start,
          endDate: period.end,
          status: period.status as any,
          submittedBy: period.status !== "open" ? project.supervisorIds[0] : null,
          submittedAt: period.status !== "open" ? new Date(`${period.end}T18:00:00Z`) : null,
          approvedBy: (period.status === "approved" || period.status === "paid") ? admin.id : null,
          approvedAt: (period.status === "approved" || period.status === "paid") ? new Date(`${period.end}T20:00:00Z`) : null,
        });
        
        // Get work logs for this period
        const workLogsInPeriod = await storage.getWorkLogsByDateRange(project.id, period.start, period.end);
        
        // Group by labourer
        const labourerWorkLogs = new Map<string, any[]>();
        for (const wl of workLogsInPeriod) {
          if (!labourerWorkLogs.has(wl.labourerId)) {
            labourerWorkLogs.set(wl.labourerId, []);
          }
          labourerWorkLogs.get(wl.labourerId)!.push(wl);
        }
        
        // Create entries
        for (const [labourerId, logs] of Array.from(labourerWorkLogs.entries())) {
          const openMeters = logs.reduce((sum, l) => sum + parseFloat(l.openTrenchingMeters || "0"), 0);
          const closeMeters = logs.reduce((sum, l) => sum + parseFloat(l.closeTrenchingMeters || "0"), 0);
          const totalMeters = openMeters + closeMeters;
          const totalAmount = logs.reduce((sum, l) => sum + parseFloat(l.totalEarnings || "0"), 0);
          
          await storage.createPaymentPeriodEntry({
            periodId: createdPeriod.id,
            labourerId,
            openMeters: openMeters.toFixed(2),
            closeMeters: closeMeters.toFixed(2),
            totalMeters: totalMeters.toFixed(2),
            totalEarnings: totalAmount.toFixed(2),
            daysWorked: logs.length,
          });
        }
      }
    }
  }

  // ============= 8. CORRECTION REQUESTS =============
  console.log("8. Creating audit trail correction requests...");

  // Get a sample work log ID for reference
  const sampleWorkLog = await db.query.workLogs.findFirst();
  const sampleLabourer = createdLabourers[0];

  const scenarios = [
    {
      entityType: "work_log",
      entityId: sampleWorkLog?.id || "sample-id",
      fieldName: "openMeters",
      newValue: "45",
      reason: "Incorrect meter reading on 2025-08-15 - should be 45 open meters not 25",
      requestedBy: sup1.id,
      status: "approved" as const,
      approvedBy: admin.id,
      approvedAt: new Date("2025-08-16T10:30:00Z"),
    },
    {
      entityType: "work_log",
      entityId: sampleWorkLog?.id || "sample-id",
      fieldName: "workDate",
      newValue: "2025-09-03",
      reason: "Missed work entry for 2025-09-03 - worker was present but not logged",
      requestedBy: sup2.id,
      status: "pending" as const,
    },
    {
      entityType: "labourer",
      entityId: sampleLabourer.id,
      fieldName: "employeeTypeId",
      newValue: employeeTypeIds[1],
      reason: "Employee type change - worker completed skills assessment, promote from Trainee to General Worker",
      requestedBy: sup3.id,
      status: "approved" as const,
      approvedBy: admin.id,
      approvedAt: new Date("2025-09-20T14:00:00Z"),
    },
    {
      entityType: "work_log",
      entityId: sampleWorkLog?.id || "sample-id",
      fieldName: "duplicate",
      newValue: "remove",
      reason: "Duplicate entry on 2025-08-22 - same work logged twice",
      requestedBy: sup4.id,
      status: "rejected" as const,
      approvedBy: admin.id,
      approvedAt: new Date("2025-08-23T09:00:00Z"),
      reviewNotes: "No evidence of duplicate entry in system logs",
    },
    {
      entityType: "work_log",
      entityId: sampleWorkLog?.id || "sample-id",
      fieldName: "closeMeters",
      newValue: "30",
      reason: "Close meters incorrectly recorded as 60, should be 30 on 2025-09-12",
      requestedBy: sup1.id,
      status: "approved" as const,
      approvedBy: admin.id,
      approvedAt: new Date("2025-09-13T11:15:00Z"),
    },
    {
      entityType: "labourer",
      entityId: sampleLabourer.id,
      fieldName: "accountNumber",
      newValue: "9876543210",
      reason: "Banking details update - account number changed",
      requestedBy: sup2.id,
      status: "pending" as const,
    },
    {
      entityType: "work_log",
      entityId: sampleWorkLog?.id || "sample-id",
      fieldName: "workDate",
      newValue: "2025-10-05",
      reason: "Wrong date entered - work done on 2025-10-05 was logged as 2025-10-06",
      requestedBy: sup3.id,
      status: "pending" as const,
    },
    {
      entityType: "work_log",
      entityId: sampleWorkLog?.id || "sample-id",
      fieldName: "openMeters",
      newValue: "40",
      reason: "Open meters reading of 120 is unrealistic for single day - should be 40",
      requestedBy: sup4.id,
      status: "approved" as const,
      approvedBy: admin.id,
      approvedAt: new Date("2025-10-10T16:45:00Z"),
    },
  ];

  for (const scenario of scenarios) {
    await storage.createCorrectionRequest(scenario);
  }

  console.log("\n✅ Seed data generation complete!");
  console.log(`   - ${createdEmployeeTypes.length} employee types`);
  console.log(`   - ${createdStaff.length} staff users`);
  console.log(`   - ${createdProjects.length} projects`);
  console.log(`   - ${createdLabourers.length} labourers (40 SA, 12 foreign nationals)`);
  console.log(`   - ${totalWorkLogs} work logs for 3 months (Aug-Oct 2025)`);
  console.log(`   - Payment periods (fortnightly and monthly)`);
  console.log(`   - ${scenarios.length} correction requests`);
}

// Run the seed function
seedData()
  .then(() => {
    console.log("\nSeed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nError seeding data:", error);
    process.exit(1);
  });
