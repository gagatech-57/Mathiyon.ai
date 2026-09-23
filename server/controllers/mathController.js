const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';

// @desc    Solve mathematical problem using SymPy & MathEngineSolver
// @route   POST /api/math/solve
// @access  Private (JWT Protected)
const solveMathProblem = async (req, res) => {
  try {
    const { question, difficulty } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question prompt is required' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const pyRes = await fetch(`${PYTHON_AI_SERVICE_URL}/math/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim(), difficulty: difficulty || 'intermediate' }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (pyRes.ok) {
      const data = await pyRes.json();
      return res.json({
        success: data.success,
        category: data.category || 'general_math',
        result: data.result,
        explanation: data.explanation,
        exact: data.exact || true,
        verified: data.verified || true,
        latency_ms: data.latency_ms,
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'Mathiyon Math Engine is temporarily unavailable.',
      });
    }
  } catch (error) {
    console.error('Math Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Math processing error',
    });
  }
};

module.exports = { solveMathProblem };
