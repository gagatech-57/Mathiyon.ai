/**
 * Mathiyon AI - Math Tool
 * Interfaces with SymPy Mathematics Engine via Python FastAPI service.
 */

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';

const mathTool = {
  name: 'MathEngine',
  description: 'Deterministic mathematical solver powered by SymPy for arithmetic, algebra, calculus, and verified computation.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'Mathematical expression or word problem' }
    },
    required: ['question']
  },

  async execute({ question }) {
    if (!question || typeof question !== 'string') {
      return { success: false, error: 'Invalid math query string' };
    }

    try {
      const res = await fetch(`${PYTHON_AI_SERVICE_URL}/math/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, difficulty: 'intermediate' })
      });

      if (res.ok) {
        const data = await res.json();
        let extractedResult = data.result || data.solution || data.answer;
        if (!extractedResult && data.explanation) {
          const match = data.explanation.match(/> \*\*`([^`]+)`\*\*/);
          if (match && match[1]) extractedResult = match[1];
        }

        return {
          success: true,
          type: 'math',
          result: extractedResult || 'Math computation verified',
          verified: data.verified !== false,
          explanation: data.explanation || `Solved exact expression: ${extractedResult}`,
          steps: data.steps || []
        };
      } else {
        return { success: false, error: `Math Engine status ${res.status}` };
      }
    } catch (err) {
      return { success: false, error: `Math Engine connectivity failure: ${err.message}` };
    }
  }
};

module.exports = mathTool;
