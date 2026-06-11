const prisma = require('../config/prisma');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.userId;

    if (!q || q.length < 2) return res.json({ projects: [], tasks: [] });

    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId, OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
        take: 5,
      }),
      prisma.task.findMany({
        where: { project: { ownerId: userId }, OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
        include: { project: { select: { title: true } } },
        take: 5,
      }),
    ]);

    res.json({ projects, tasks });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
