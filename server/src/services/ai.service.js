const generateAIAnalysis = async (tasks, completed, inProgress, todo, urgent, overdue, productivity) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiKey });
    const prompt = `You are a productivity coach AI. Analyze the following task data and provide structured insights.
Tasks summary: Total: ${tasks.length}, Completed: ${completed}, In Progress: ${inProgress}, Todo: ${todo}, Urgent: ${urgent}, Overdue: ${overdue}.
Task list: ${tasks.slice(0, 15).map(t => `- ${t.title} [${t.status}] [${t.priority}] ${t.dueDate ? 'due: ' + new Date(t.dueDate).toLocaleDateString() : ''}`).join('\n')}

Provide:
1. A brief summary of current workload
2. Top 3 actionable recommendations
3. Risk warnings (if any)
4. Estimated focus areas

Be concise, specific, and actionable. Format as JSON with keys: summary, recommendations (array), risks (array), focusAreas (array).`;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    const analysis = JSON.parse(response.choices[0].message.content);
    return analysis;
  }

  // Mock AI response fallback
  const recommendations = [];
  if (overdue > 0) recommendations.push(`You have ${overdue} overdue task(s). Prioritize these immediately to get back on track.`);
  if (urgent > 0) recommendations.push(`${urgent} urgent task(s) need your attention today. Consider blocking dedicated time for them.`);
  if (productivity < 50) recommendations.push('Your completion rate is below 50%. Try breaking large tasks into smaller subtasks for easier progress.');
  if (todo > inProgress * 2) recommendations.push('You have many tasks in Todo. Start moving them to In Progress to maintain momentum.');
  if (recommendations.length === 0) recommendations.push('Great job! Keep maintaining your current pace and continue completing tasks consistently.');

  const risks = [];
  if (overdue > 3) risks.push('High number of overdue tasks may impact project delivery.');
  if (urgent > 5) risks.push('Too many urgent tasks suggests a prioritization issue.');

  return {
    summary: `You have ${tasks.length} total tasks. Your productivity rate is ${productivity}%. ${completed} tasks completed, ${inProgress} in progress, and ${todo} remaining in Todo.`,
    recommendations,
    risks: risks.length ? risks : ['No critical risks detected. Keep up the good work!'],
    focusAreas: ['Complete overdue tasks first', 'Balance urgent vs important tasks', 'Maintain consistent daily progress'],
  };
};

module.exports = { generateAIAnalysis };
