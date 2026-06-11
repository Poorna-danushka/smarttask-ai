const prisma = require('../config/prisma');

exports.createProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.userId;
    const project = await prisma.project.create({
      data: { title, description, ownerId: userId },
      include: { _count: { select: { tasks: true } } },
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { tasks: true } } },
      }),
      prisma.project.count({ where: { ownerId: userId } }),
    ]);

    res.json({ data: projects, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const project = await prisma.project.findFirst({
      where: { id, ownerId: userId },
      include: { tasks: { orderBy: { dueDate: 'asc' } } },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    const userId = req.user.userId;
    const result = await prisma.project.updateMany({
      where: { id, ownerId: userId },
      data: { title, description, status },
    });
    if (result.count === 0) return res.status(404).json({ message: 'Project not found or unauthorized' });
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    // Cascade delete: tasks first, then project
    await prisma.task.deleteMany({ where: { projectId: id } });
    const result = await prisma.project.deleteMany({ where: { id, ownerId: userId } });
    if (result.count === 0) return res.status(404).json({ message: 'Project not found or unauthorized' });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
