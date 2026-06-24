const { PrismaClient } = require('@prisma/client');
const { DATABASE_URL } = require('./env');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});

const sanitizeDatabaseUrl = (str) => {
  if (!str) return '';
  // Mask username/password pattern
  return str.replace(/:\/\/[^:]+:[^@]+@/, '://user:****@');
};

const connectPrisma = async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully');
  } catch (error) {
    const errorMsg = error.message || String(error);
    console.error('Prisma connection failed:', sanitizeDatabaseUrl(errorMsg));
    process.exit(1);
  }
};

connectPrisma();

module.exports = prisma;
