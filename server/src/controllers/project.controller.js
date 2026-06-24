const prisma = require('../config/prisma');
const { getIo } = require('../sockets/socketManager');

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

// Get projects where user is owner or a member
exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tasks: true } },
          owner: { select: { id: true, username: true, email: true, avatar: true } },
          members: { include: { user: { select: { id: true, username: true, email: true, avatar: true } } } },
        },
      }),
      prisma.project.count({ where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } }),
    ]);

    res.json({ data: projects, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single project if owner or member
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: { 
        tasks: { orderBy: { dueDate: 'asc' } }, 
        owner: { select: { id: true, username: true, email: true, avatar: true } },
        members: { include: { user: { select: { id: true, username: true, email: true, avatar: true } } } } 
      },
    });
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
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

// Project members management (owner only)
exports.addMember = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const ownerId = req.user.userId;
    const { userId: newMemberId, role } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.ownerId !== ownerId) return res.status(403).json({ message: 'Only project owner can add members' });

    // Validate that user exists
    const userExists = await prisma.user.findUnique({ where: { id: newMemberId } });
    if (!userExists) return res.status(404).json({ message: 'User not found' });

    // Validate user is not the owner
    if (newMemberId === project.ownerId) {
      return res.status(400).json({ message: 'Project owner cannot be added as a member' });
    }

    // Validate user is not already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: newMemberId }
    });
    if (existingMember) return res.status(409).json({ message: 'User is already a member' });

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId: newMemberId, role },
      include: { user: { select: { id: true, username: true, email: true, avatar: true } } }
    });

    // Create notification for the new member
    await prisma.notification.create({
      data: {
        userId: newMemberId,
        message: `You have been added to project: "${project.title}"`
      }
    });

    // Emit socket event to project room and the newly added user room
    try {
      const io = getIo();
      io.to(id).emit('memberAdded', member);
      io.to(newMemberId).emit('projectAdded', { projectId: id });
      io.to(newMemberId).emit('notificationReceived');
    } catch (socketErr) {
      console.error('Socket emission failed in addMember:', socketErr);
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('Add member error:', error);
    if (error.code === 'P2002') return res.status(409).json({ message: 'User is already a member' });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listMembers = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const userId = req.user.userId;

    const project = await prisma.project.findFirst({ where: { id, OR: [{ ownerId: userId }, { members: { some: { userId } } }] } });
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });

    const members = await prisma.projectMember.findMany({ where: { projectId: id }, include: { user: { select: { id: true, username: true, email: true, avatar: true } } } });
    res.json(members);
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params; // id = project id
    const ownerId = req.user.userId;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.ownerId !== ownerId) return res.status(403).json({ message: 'Only project owner can remove members' });

    const result = await prisma.projectMember.deleteMany({ where: { projectId: id, userId: memberId } });
    if (result.count === 0) return res.status(404).json({ message: 'Member not found' });

    // Unassign tasks assigned to this user in this project
    await prisma.task.updateMany({
      where: { projectId: id, assignedTo: memberId },
      data: { assignedTo: null }
    });

    // Create notification for the removed member
    await prisma.notification.create({
      data: {
        userId: memberId,
        message: `You have been removed from project: "${project.title}"`
      }
    });

    // Emit socket event to project room and the removed user room
    try {
      const io = getIo();
      io.to(id).emit('memberRemoved', { projectId: id, userId: memberId });
      io.to(memberId).emit('projectRemoved', { projectId: id });
      io.to(memberId).emit('notificationReceived');
    } catch (socketErr) {
      console.error('Socket emission failed in removeMember:', socketErr);
    }

    res.json({ message: 'Member removed and tasks unassigned' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
