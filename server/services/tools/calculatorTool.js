/**
 * Mathiyon AI - Simple Calculator Tool
 * Executes deterministic arithmetic operations without invoking language model inference.
 */

const calculatorTool = {
  name: 'CalculatorEngine',
  description: 'Fast deterministic arithmetic calculator for addition, subtraction, multiplication, division, and simple percentages.',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Mathematical expression to calculate' }
    },
    required: ['expression']
  },

  async execute({ expression }) {
    const startTime = Date.now();
    if (!expression || typeof expression !== 'string') {
      return {
        success: false,
        tool: 'CalculatorEngine',
        data: null,
        error: { code: 'INVALID_EXPRESSION', message: 'Expression string is required.' },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }

    try {
      let cleanExpr = expression.toLowerCase().trim();

      // Handle percentage expressions like "15% of 50000" or "calculate 25 * 30"
      if (cleanExpr.includes('% of')) {
        const match = cleanExpr.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/);
        if (match) {
          const pct = parseFloat(match[1]);
          const base = parseFloat(match[2]);
          const resultVal = (pct / 100) * base;

          return {
            success: true,
            tool: 'CalculatorEngine',
            data: {
              type: 'CALCULATOR',
              expression,
              result: resultVal,
              formatted: `**${expression}** = **${resultVal}**`
            },
            metadata: { latencyMs: Date.now() - startTime, verified: true }
          };
        }
      }

      // Extract basic expression string
      cleanExpr = cleanExpr.replace(/calculate|solve|what is/gi, '').trim();
      const sanitized = cleanExpr.replace(/[^0-9\+\-\*\/\.\(\)\s]/g, '');

      if (!sanitized) {
        return {
          success: false,
          tool: 'CalculatorEngine',
          data: null,
          error: { code: 'UNPARSEABLE_EXPRESSION', message: 'Could not extract valid arithmetic expression.' },
          metadata: { latencyMs: Date.now() - startTime }
        };
      }

      // Safe JS evaluation of pure numeric math
      const evalVal = Function(`"use strict"; return (${sanitized})`)();
      const rounded = Math.round(evalVal * 1000000) / 1000000;

      return {
        success: true,
        tool: 'CalculatorEngine',
        data: {
          type: 'CALCULATOR',
          expression: cleanExpr,
          result: rounded,
          formatted: `**${cleanExpr}** = **${rounded}**`
        },
        metadata: { latencyMs: Date.now() - startTime, verified: true }
      };
    } catch (err) {
      return {
        success: false,
        tool: 'CalculatorEngine',
        data: null,
        error: { code: 'CALCULATOR_EXECUTION_ERROR', message: `Calculation error: ${err.message}` },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }
  }
};

module.exports = calculatorTool;
