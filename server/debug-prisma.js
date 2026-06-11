const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing User setup...');
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found in database! Creating dummy user...');
      return;
    }
    const userId = user.id;

    console.log('Testing Dashboard Stats query...');
    const projects = await prisma.project.findMany({ where: { ownerId: userId }, select: { id: true } });
    const projectIds = projects.map(p => p.id);
    
    const count = await prisma.task.count({ where: { projectId: { in: projectIds } } });
    console.log('Tasks count:', count);
    
    const weeklyData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      const c = await prisma.task.count({
        where: {
          projectId: { in: projectIds },
          dueDate: { gte: dayStart, lte: dayEnd },
        },
      });
    }
    console.log('Dashboard Stats query OK');
  } catch (error) {
    console.error('Prisma Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
