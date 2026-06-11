const prisma = require('../config/prisma');
const { generateAIAnalysis } = require('../services/ai.service');

exports.analyzeTasksWithAI = async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await prisma.project.findMany({ where: { ownerId: userId }, select: { id: true } });
    const projectIds = projects.map(p => p.id);

    const tasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: { project: { select: { title: true } } },
    });

    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const todo = tasks.filter(t => t.status === 'Todo').length;
    const urgent = tasks.filter(t => t.priority === 'Urgent').length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length;
    const productivity = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    const analysis = await generateAIAnalysis(tasks, completed, inProgress, todo, urgent, overdue, productivity);

    res.json({ ...analysis, stats: { total: tasks.length, completed, inProgress, todo, urgent, overdue, productivity } });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ message: 'AI analysis failed' });
  }
};
