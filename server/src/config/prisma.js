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

const connectPrisma = async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully');
  } catch (error) {
    console.error('Prisma connection failed:', error);
    process.exit(1);
  }
};

connectPrisma();

module.exports = prisma;
