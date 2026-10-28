import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma, checkDatabaseHealth } from './config/prisma.js';

async function main(): Promise<void> {
  const app = createApp();

  const isDbReady = await checkDatabaseHealth();
  if (!isDbReady) {
    console.warn('⚠️ Warning: Database connection could not be verified on startup.');
  } else {
    console.log('✅ PostgreSQL database connection established successfully.');
  }

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`🚀 EOTC Learning API running at http://${env.HOST}:${env.PORT}`);
    console.log(`📡 Health endpoint: http://${env.HOST}:${env.PORT}/api/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('🔌 Prisma disconnected. Process exiting.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
