/**
 * Mathiyon AI - RAG Tool
 * Connects to 384-d dense vector search & document chunk retrieval with strict user isolation.
 */

const { searchDocumentChunks } = require('../../controllers/fileController');

const ragTool = {
  name: 'RAG',
  description: 'Vector search retrieval across user uploaded documents (PDF, TXT, DOCX, CSV, JSON, Markdown).',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      query: { type: 'string' },
      documentIds: { type: 'array', items: { type: 'string' } },
      topK: { type: 'number', default: 5 }
    },
    required: ['userId', 'query']
  },

  async execute({ userId, query, documentIds = [], topK = 5 }) {
    if (!userId || !query) {
      return { success: false, error: 'userId and query are required' };
    }

    try {
      let searchResult = null;
      let statusCode = 200;

      await searchDocumentChunks(
        {
          user: { id: userId },
          body: { query, documentIds, topK }
        },
        {
          json: (data) => { searchResult = data; },
          status: (code) => {
            statusCode = code;
            return { json: (data) => { searchResult = data; } };
          }
        }
      );

      if (statusCode === 403) {
        return {
          success: false,
          statusCode: 403,
          error: 'Access denied to requested document(s)',
          forbidden: true
        };
      }

      if (searchResult && searchResult.success && searchResult.chunks && searchResult.chunks.length > 0) {
        const relevantChunks = searchResult.chunks.filter(c => c.score >= 0.15);

        if (relevantChunks.length > 0) {
          const ragContextText = relevantChunks
            .map(c => `[Source: ${c.originalFilename} — Page ${c.page}]\n${c.text}`)
            .join('\n\n');

          const uniqueCit = new Set();
          const sources = [];
          relevantChunks.forEach(c => {
            const key = `${c.originalFilename} — Page ${c.page}`;
            if (!uniqueCit.has(key)) {
              uniqueCit.add(key);
              sources.push({ file: c.originalFilename, page: c.page });
            }
          });

          return {
            success: true,
            type: 'document',
            found: true,
            context: ragContextText,
            sources,
            citations: Array.from(uniqueCit),
            chunksCount: relevantChunks.length
          };
        }
      }

      return {
        success: true,
        type: 'document',
        found: false,
        context: '',
        sources: [],
        citations: [],
        missingMessage: 'The document does not contain this information.'
      };
    } catch (err) {
      return { success: false, error: `RAG retrieval failure: ${err.message}` };
    }
  }
};

module.exports = ragTool;
