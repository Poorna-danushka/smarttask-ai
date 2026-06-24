const prisma = require('../config/prisma');

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Include both owned projects AND projects where user is a member
    const [ownedProjects, memberProjects] = await Promise.all([
      prisma.project.findMany({ where: { ownerId: userId }, select: { id: true } }),
      prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
    ]);
    const projectIds = [
      ...new Set([
        ...ownedProjects.map(p => p.id),
        ...memberProjects.map(m => m.projectId),
      ]),
    ];

    const [totalTasks, completedTasks, inProgressTasks, pendingTasks, urgentTasks, overdueTasks] = await Promise.all([
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'Completed' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'In Progress' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'Todo' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, priority: 'Urgent' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, dueDate: { lt: new Date() }, status: { not: 'Completed' } } }),
    ]);

    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Upcoming deadlines in the next 7 days
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        status: { not: 'Completed' },
      },
      include: { project: { select: { title: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    // Weekly chart data (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        return prisma.task
          .count({ where: { projectId: { in: projectIds }, dueDate: { gte: dayStart, lte: dayEnd } } })
          .then(count => ({ name: days[dayStart.getDay()], tasks: count, completed: Math.floor(count * (productivity / 100)) }));
      })
    );

    res.json({ totalTasks, completedTasks, inProgressTasks, pendingTasks, urgentTasks, overdueTasks, productivity, upcomingDeadlines, weeklyData, totalProjects: projectIds.length });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
