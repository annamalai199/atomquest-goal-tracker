import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * SAFE SEED SCRIPT
 * This script adds test data WITHOUT deleting existing data
 * Use this to add more users/data without losing what you have
 */

async function main() {
  console.log("🌱 Starting safe seed (preserves existing data)...");

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@company.com" },
  });

  if (existingAdmin) {
    console.log("⚠️  Admin user already exists. Skipping user creation.");
    console.log("✅ Database already has data. No changes made.");
    return;
  }

  console.log("📝 No existing admin found. Creating initial test data...");

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@company.com",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      name: "Admin User",
      role: "ADMIN",
      department: "HR",
    },
  });

  // Create Managers
  const manager1 = await prisma.user.create({
    data: {
      email: "manager1@company.com",
      passwordHash: await bcrypt.hash("Manager@123", 12),
      name: "Sarah Johnson",
      role: "MANAGER",
      department: "Engineering",
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "manager2@company.com",
      passwordHash: await bcrypt.hash("Manager@123", 12),
      name: "Michael Chen",
      role: "MANAGER",
      department: "Sales",
    },
  });

  const manager3 = await prisma.user.create({
    data: {
      email: "manager3@company.com",
      passwordHash: await bcrypt.hash("Manager@123", 12),
      name: "Priya Sharma",
      role: "MANAGER",
      department: "Operations",
    },
  });

  console.log("✅ Created admin and managers");

  // Create Employees
  const employees = await Promise.all([
    prisma.user.create({
      data: {
        email: "employee1@company.com",
        passwordHash: await bcrypt.hash("Employee@123", 12),
        name: "John Smith",
        role: "EMPLOYEE",
        department: "Engineering",
        managerId: manager1.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "employee2@company.com",
        passwordHash: await bcrypt.hash("Employee@123", 12),
        name: "Emily Davis",
        role: "EMPLOYEE",
        department: "Engineering",
        managerId: manager1.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "employee3@company.com",
        passwordHash: await bcrypt.hash("Employee@123", 12),
        name: "David Wilson",
        role: "EMPLOYEE",
        department: "Sales",
        managerId: manager2.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "employee4@company.com",
        passwordHash: await bcrypt.hash("Employee@123", 12),
        name: "Lisa Anderson",
        role: "EMPLOYEE",
        department: "Sales",
        managerId: manager2.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "employee5@company.com",
        passwordHash: await bcrypt.hash("Employee@123", 12),
        name: "Raj Kumar",
        role: "EMPLOYEE",
        department: "Operations",
        managerId: manager3.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "employee6@company.com",
        passwordHash: await bcrypt.hash("Employee@123", 12),
        name: "Maria Garcia",
        role: "EMPLOYEE",
        department: "Operations",
        managerId: manager3.id,
      },
    }),
  ]);

  console.log("✅ Created 6 employees");

  // Create Thrust Areas
  const thrustAreas = await Promise.all([
    prisma.thrustArea.create({ data: { name: "Revenue Growth" } }),
    prisma.thrustArea.create({ data: { name: "Customer Satisfaction" } }),
    prisma.thrustArea.create({ data: { name: "Operational Excellence" } }),
    prisma.thrustArea.create({ data: { name: "Innovation" } }),
    prisma.thrustArea.create({ data: { name: "Team Development" } }),
    prisma.thrustArea.create({ data: { name: "Quality Improvement" } }),
  ]);

  console.log("✅ Created 6 thrust areas");

  // Create Active Cycle (FY 2025-26)
  const cycle = await prisma.cycle.create({
    data: {
      name: "FY 2025-26",
      year: 2025,
      goalSetOpen: new Date("2025-04-01"),
      q1Open: new Date("2025-05-01"),
      q2Open: new Date("2025-08-01"),
      q3Open: new Date("2025-11-01"),
      q4Open: new Date("2026-02-01"),
      isActive: true,
    },
  });

  console.log("✅ Created active cycle");

  // Create sample goals for employee1 (John Smith)
  const employee1Goals = await Promise.all([
    prisma.goal.create({
      data: {
        employeeId: employees[0].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[0].id,
        title: "Increase API response time by 30%",
        description: "Optimize database queries and implement caching",
        uom: "NUMERIC_MAX",
        target: 200,
        weightage: 25,
        status: "APPROVED",
        lockedAt: new Date(),
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[0].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[3].id,
        title: "Launch new microservice architecture",
        description: "Design and deploy 3 core microservices",
        uom: "TIMELINE",
        target: new Date("2025-09-30").getTime(),
        weightage: 30,
        status: "APPROVED",
        lockedAt: new Date(),
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[0].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[5].id,
        title: "Reduce production bugs to zero",
        description: "Implement comprehensive testing and monitoring",
        uom: "ZERO",
        target: 0,
        weightage: 20,
        status: "APPROVED",
        lockedAt: new Date(),
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[0].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[4].id,
        title: "Mentor 2 junior developers",
        description: "Conduct weekly 1-on-1s and code reviews",
        uom: "NUMERIC_MIN",
        target: 2,
        weightage: 25,
        status: "APPROVED",
        lockedAt: new Date(),
      },
    }),
  ]);

  console.log("✅ Created sample goals");

  // Create Q1 check-ins
  await Promise.all([
    prisma.checkIn.create({
      data: {
        goalId: employee1Goals[0].id,
        quarter: "Q1",
        plannedTarget: 250,
        actualAchieved: 230,
        progressStatus: "ON_TRACK",
        progressScore: 92,
        managerComment: "Great progress! Keep optimizing.",
        commentedAt: new Date(),
      },
    }),
    prisma.checkIn.create({
      data: {
        goalId: employee1Goals[1].id,
        quarter: "Q1",
        plannedTarget: 1,
        actualAchieved: 1,
        progressStatus: "ON_TRACK",
        progressScore: 100,
        managerComment: "First microservice deployed successfully!",
        commentedAt: new Date(),
      },
    }),
  ]);

  console.log("✅ Created Q1 check-ins");

  console.log("\n🎉 Safe seed completed successfully!\n");
  console.log("📧 Test Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin: admin@company.com / Admin@123");
  console.log("👔 Manager: manager1@company.com / Manager@123");
  console.log("👨‍💼 Employee: employee1@company.com / Employee@123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
