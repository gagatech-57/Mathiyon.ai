/**
 * Mathiyon AI - Code Tool
 * Analyzes code snippets, structural patterns, and performs code verification.
 */

const codeTool = {
  name: 'CodeEngine',
  description: 'Code comprehension, syntax analysis, and explanation engine for JavaScript, TypeScript, Python, and C++.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      query: { type: 'string' }
    },
    required: ['code']
  },

  async execute({ code, query = 'Explain this code' }) {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Invalid code payload' };
    }

    // Basic code analysis metrics
    const lineCount = code.split('\n').length;
    const isReact = /import.*React|jsx|tsx|useState|useEffect/i.test(code);
    const isPython = /def |import |class |self/i.test(code);
    const isNode = /require\(|module\.exports|express/i.test(code);

    let language = 'general';
    if (isReact) language = 'React / TypeScript';
    else if (isPython) language = 'Python';
    else if (isNode) language = 'Node.js / JavaScript';

    return {
      success: true,
      type: 'code',
      language,
      lineCount,
      snippet: code.substring(0, 300),
      summary: `Detected ${language} code block (${lineCount} lines). Prepared for AI explanation.`
    };
  }
};

module.exports = codeTool;
