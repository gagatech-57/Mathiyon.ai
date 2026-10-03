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

      // Handle percentage expressions like "25% of 200" or "15% of 50000" or Tamil "25 oda 15%"
      if (cleanExpr.includes('% of') || cleanExpr.includes('percent of')) {
        const match = cleanExpr.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*(\d+(?:\.\d+)?)/);
        if (match) {
          const pct = parseFloat(match[1]);
          const base = parseFloat(match[2]);
          const resultVal = (pct / 100) * base;
          const cleanRes = Number.isInteger(resultVal) ? String(resultVal) : String(Math.round(resultVal * 1000000) / 1000000);

          return {
            success: true,
            tool: 'CalculatorEngine',
            data: {
              type: 'CALCULATOR',
              expression,
              result: cleanRes,
              formatted: cleanRes
            },
            metadata: { latencyMs: Date.now() - startTime, verified: true }
          };
        }
      }

      const tamilPctMatch = cleanExpr.match(/(\d+(?:\.\d+)?)\s*oda\s*(\d+(?:\.\d+)?)\s*%/);
      if (tamilPctMatch) {
        const base = parseFloat(tamilPctMatch[1]);
        const pct = parseFloat(tamilPctMatch[2]);
        const resultVal = (pct / 100) * base;
        const cleanRes = Number.isInteger(resultVal) ? String(resultVal) : String(Math.round(resultVal * 1000000) / 1000000);

        return {
          success: true,
          tool: 'CalculatorEngine',
          data: {
            type: 'CALCULATOR',
            expression,
            result: cleanRes,
            formatted: cleanRes
          },
          metadata: { latencyMs: Date.now() - startTime, verified: true }
        };
      }

      // Extract basic expression string & normalize word operators
      cleanExpr = cleanExpr
        .replace(/calculate|solve|what is/gi, '')
        .replace(/\bplus\b/gi, '+')
        .replace(/\bminus\b/gi, '-')
        .replace(/\b(times|multiplied by|into)\b/gi, '*')
        .replace(/\b(divided by|over)\b/gi, '/')
        .trim();
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
      // Format with 10 decimal places for repeating decimals, strip trailing zeros
      let cleanFormatted;
      if (Number.isInteger(evalVal)) {
        cleanFormatted = String(evalVal);
      } else {
        cleanFormatted = parseFloat(evalVal.toFixed(10)).toString();
        // For repeating decimals, ensure we show 10 significant decimal digits
        if (cleanFormatted.includes('.')) {
          const decPart = cleanFormatted.split('.')[1];
          if (decPart.length < 10) {
            cleanFormatted = evalVal.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
          }
        }
      }

      return {
        success: true,
        tool: 'CalculatorEngine',
        data: {
          type: 'CALCULATOR',
          expression: cleanExpr,
          result: cleanFormatted,
          formatted: cleanFormatted
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
