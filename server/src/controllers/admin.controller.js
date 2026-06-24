const prisma = require('../config/prisma');

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalProjects, totalTasks, completedTasks, notifications, overdueTasks, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'Completed' } }),
      prisma.notification.count(),
      prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { not: 'Completed' } } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true },
      }),
    ]);

    // New users today (User has createdAt)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const newUsersToday = await prisma.user.count({ where: { createdAt: { gte: todayStart } } });

    // Tasks completed (Task has no updatedAt, so we return total completed)
    const tasksCompletedToday = completedTasks;

    // User growth: new users per day for past 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const userGrowth = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const start = new Date(date.setHours(0, 0, 0, 0));
        const end = new Date(date.setHours(23, 59, 59, 999));
        return prisma.user
          .count({ where: { createdAt: { gte: start, lte: end } } })
          .then(count => ({ name: days[start.getDay()], users: count }));
      })
    );

    res.json({
      totalUsers, totalProjects, totalTasks, completedTasks,
      overdueTasks, notifications, recentUsers,
      tasksCompletedToday, newUsersToday, userGrowth,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const projects = await prisma.project.findMany({ where: { ownerId: id }, select: { id: true } });
    const projectIds = projects.map(p => p.id);
    await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { ownerId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await prisma.user.update({ where: { id }, data: { role } });
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { username: true, email: true } }, _count: { select: { tasks: true } } },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const [recentUsers, recentProjects, recentTasks, recentNotifications] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { owner: { select: { username: true } } } }),
      prisma.task.findMany({ orderBy: { dueDate: 'desc' }, take: 10, where: { status: 'Completed' }, include: { project: { select: { title: true } }, assignee: { select: { username: true } } } }),
      prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { username: true } } } }),
    ]);

    const activities = [
      ...recentUsers.map(u => ({ type: u.role === 'admin' ? 'role_change' : 'register', label: u.role === 'admin' ? `Admin account: ${u.username}` : `New user registered: ${u.username}`, user: u.username, time: u.createdAt })),
      ...recentProjects.map(p => ({ type: 'project_create', label: `Project created: "${p.title}"`, user: p.owner?.username || 'unknown', time: p.createdAt })),
      ...recentTasks.map(t => ({ type: 'task_complete', label: `Task completed: "${t.title}" in ${t.project?.title}`, user: t.assignee?.username || 'a user', time: t.dueDate || new Date() })),
      ...recentNotifications.map(n => ({ type: 'notification', label: n.message, user: n.user?.username || 'system', time: n.createdAt })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);

    res.json(activities);
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, message: `[Admin] ${message.trim()}` })),
    });

    res.json({ message: `Broadcast sent to ${users.length} users` });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
