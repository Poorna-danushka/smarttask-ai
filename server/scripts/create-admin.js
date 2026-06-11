const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'poornadanushka2@gmail.com';
const ADMIN_PASSWORD = 'ilikeit';
const ADMIN_USERNAME = 'admin';

async function createAdminOnce() {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`✅ Admin already exists for email: ${ADMIN_EMAIL}`);
      } else {
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { role: 'admin' },
        });
        console.log(`✅ Existing user upgraded to admin: ${ADMIN_EMAIL}`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
    console.log('🔐 You can now log in through the admin login page.');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminOnce();
