import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Enhanced Prisma Client with minimal logging (suppress connection errors)
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [], // Suppress all logs including connection errors
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown
if (typeof window === "undefined") {
  process.on("beforeExit", async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors
    }
  });
}

/**
 * Execute a Prisma query with automatic retry on connection errors
 * This handles Neon's serverless connection drops gracefully
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error
      const isConnectionError = 
        error.message?.includes("Connection") ||
        error.message?.includes("connection") ||
        error.code === "P1001" ||
        error.code === "P1002" ||
        error.code === "P1017";
      
      if (isConnectionError && attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Try to reconnect
        try {
          await prisma.$connect();
        } catch {
          // Ignore reconnect errors
        }
        
        continue;
      }
      
      // If not a connection error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError;
}
