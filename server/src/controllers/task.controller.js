const prisma = require('../config/prisma');

const checkProjectAccess = async (projectId, userId) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  return !!project;
};

exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, status, priority, dueDate, assignedTo } = req.body;
    const userId = req.user.userId;

    if (!projectId) return res.status(400).json({ message: 'projectId is required' });

    const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
    if (!projectExists) return res.status(404).json({ message: 'Project not found' });

    const hasAccess = await checkProjectAccess(projectId, userId);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        status: status || 'Todo',
        priority: priority || 'Medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
      },
      include: { assignee: { select: { id: true, username: true, email: true, avatar: true } } },
    });

    if (assignedTo && assignedTo !== req.user.userId) {
      await prisma.notification.create({
        data: { userId: assignedTo, message: `You have been assigned a new task: "${task.title}"` },
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
    if (!projectExists) return res.status(404).json({ message: 'Project not found' });

    const hasAccess = await checkProjectAccess(projectId, userId);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: { assignee: { select: { id: true, username: true, email: true, avatar: true } } },
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tasks = await prisma.task.findMany({
      where: { assignedTo: userId },
      include: { project: { select: { title: true } } },
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUserTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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

    if (projectIds.length === 0) {
      return res.json({ data: [], meta: { total: 0, page, limit, totalPages: 0 } });
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          project: { select: { title: true } },
          assignee: { select: { id: true, username: true, email: true, avatar: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
    ]);

    res.json({ data: tasks, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;
    const userId = req.user.userId;

    const oldTask = await prisma.task.findUnique({ where: { id } });
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await checkProjectAccess(oldTask.projectId, userId);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });

    // Build update data with only the fields that were actually sent
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) data.assignedTo = assignedTo || null;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: { assignee: { select: { id: true, username: true, email: true, avatar: true } } },
    });

    if (assignedTo && assignedTo !== req.user.userId && oldTask?.assignedTo !== assignedTo) {
      await prisma.notification.create({
        data: { userId: assignedTo, message: `You have been assigned to task: "${task.title}"` },
      });
    }

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const oldTask = await prisma.task.findUnique({ where: { id } });
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await checkProjectAccess(oldTask.projectId, userId);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });

    const task = await prisma.task.update({ where: { id }, data: { status } });
    res.json(task);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const oldTask = await prisma.task.findUnique({ where: { id } });
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await checkProjectAccess(oldTask.projectId, userId);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });

    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
