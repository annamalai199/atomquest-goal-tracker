import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.thrustArea.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Cleared existing data");

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

  // Create Active Cycle (FY 2026-27)
  const cycle = await prisma.cycle.create({
    data: {
      name: "FY 2026-27",
      year: 2026,
      goalSetOpen: new Date("2026-04-01"),
      q1Open: new Date("2026-05-01"),
      q2Open: new Date("2026-08-01"),
      q3Open: new Date("2026-11-01"),
      q4Open: new Date("2027-02-01"),
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
        target: 200, // Target: 200ms (lower is better)
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

  console.log("✅ Created sample goals for employee1");

  // Create Q1 check-ins for employee1
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
    prisma.checkIn.create({
      data: {
        goalId: employee1Goals[2].id,
        quarter: "Q1",
        plannedTarget: 0,
        actualAchieved: 0,
        progressStatus: "COMPLETED",
        progressScore: 100,
        managerComment: "Zero bugs in Q1. Excellent work!",
        commentedAt: new Date(),
      },
    }),
    prisma.checkIn.create({
      data: {
        goalId: employee1Goals[3].id,
        quarter: "Q1",
        plannedTarget: 2,
        actualAchieved: 2,
        progressStatus: "COMPLETED",
        progressScore: 100,
        managerComment: "Both mentees showing great improvement.",
        commentedAt: new Date(),
      },
    }),
  ]);

  console.log("✅ Created Q1 check-ins");

  // Create draft goals for employee2 (Emily Davis)
  await Promise.all([
    prisma.goal.create({
      data: {
        employeeId: employees[1].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[1].id,
        title: "Improve user satisfaction score",
        description: "Enhance UI/UX based on user feedback",
        uom: "NUMERIC_MIN",
        target: 4.5,
        weightage: 30,
        status: "DRAFT",
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[1].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[2].id,
        title: "Reduce page load time",
        description: "Optimize frontend performance",
        uom: "NUMERIC_MAX",
        target: 1.5,
        weightage: 40,
        status: "DRAFT",
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[1].id,
        managerId: manager1.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[3].id,
        title: "Implement dark mode feature",
        description: "Design and deploy dark mode across all pages",
        uom: "TIMELINE",
        target: new Date("2025-07-31").getTime(),
        weightage: 30,
        status: "DRAFT",
      },
    }),
  ]);

  console.log("✅ Created draft goals for employee2");

  // Create submitted goals for employee3 (David Wilson - Sales)
  await Promise.all([
    prisma.goal.create({
      data: {
        employeeId: employees[2].id,
        managerId: manager2.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[0].id,
        title: "Achieve $500K in quarterly sales",
        description: "Focus on enterprise clients",
        uom: "NUMERIC_MIN",
        target: 500000,
        weightage: 40,
        status: "SUBMITTED",
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[2].id,
        managerId: manager2.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[1].id,
        title: "Maintain customer retention rate",
        description: "Keep churn below 5%",
        uom: "NUMERIC_MAX",
        target: 5,
        weightage: 30,
        status: "SUBMITTED",
      },
    }),
    prisma.goal.create({
      data: {
        employeeId: employees[2].id,
        managerId: manager2.id,
        cycleId: cycle.id,
        thrustAreaId: thrustAreas[1].id,
        title: "Close 15 new enterprise deals",
        description: "Target Fortune 500 companies",
        uom: "NUMERIC_MIN",
        target: 15,
        weightage: 30,
        status: "SUBMITTED",
      },
    }),
  ]);

  console.log("✅ Created submitted goals for employee3");

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      goalId: employee1Goals[0].id,
      userId: manager1.id,
      action: "GOAL_APPROVED",
      newValue: JSON.stringify({ status: "APPROVED" }),
    },
  });

  await prisma.auditLog.create({
    data: {
      goalId: employee1Goals[0].id,
      userId: employees[0].id,
      action: "CHECKIN_UPDATED",
      newValue: JSON.stringify({ quarter: "Q1", actualAchieved: 230 }),
    },
  });

  console.log("✅ Created audit logs");

  console.log("\n🎉 Seed completed successfully!\n");
  console.log("📧 Test Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin:");
  console.log("   Email: admin@company.com");
  console.log("   Password: Admin@123");
  console.log("\n👔 Managers:");
  console.log("   Email: manager1@company.com (Engineering)");
  console.log("   Password: Manager@123");
  console.log("   Email: manager2@company.com (Sales)");
  console.log("   Password: Manager@123");
  console.log("\n👨‍💼 Employees:");
  console.log("   Email: employee1@company.com (Has approved goals + Q1 check-ins)");
  console.log("   Password: Employee@123");
  console.log("   Email: employee2@company.com (Has draft goals)");
  console.log("   Password: Employee@123");
  console.log("   Email: employee3@company.com (Has submitted goals awaiting approval)");
  console.log("   Password: Employee@123");
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
