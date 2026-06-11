const prisma = require('../config/prisma');

exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, status, priority, dueDate, assignedTo } = req.body;
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
    const tasks = await prisma.task.findMany({
      where: { projectId },
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

    const projects = await prisma.project.findMany({ where: { ownerId: userId }, select: { id: true } });
    const projectIds = projects.map(p => p.id);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        include: { project: { select: { title: true } } },
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

    const oldTask = await prisma.task.findUnique({ where: { id } });
    const task = await prisma.task.update({
      where: { id },
      data: { title, description, status, priority, dueDate: dueDate ? new Date(dueDate) : null, assignedTo: assignedTo || null },
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
    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
