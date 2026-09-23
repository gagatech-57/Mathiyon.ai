/**
 * Mathiyon AI - Input Router (Phase 8 Multimodal Architecture)
 * Normalizes multi-type inputs (TEXT, DOCUMENT, IMAGE, VOICE, CODE) into unified AI Orchestrator payload format.
 */

const inputRouter = {
  normalizeInput(payload) {
    if (typeof payload === 'string') {
      return {
        type: 'TEXT',
        message: payload,
        attachments: [],
        raw: payload
      };
    }

    const { message = '', documentId, documentIds = [], imageUrl, audioData, code, enableWebSearch } = payload;

    let type = 'TEXT';
    if (imageUrl) type = 'IMAGE';
    else if (audioData) type = 'VOICE';
    else if (code) type = 'CODE';
    else if (documentId || (documentIds && documentIds.length > 0)) type = 'DOCUMENT';

    return {
      type,
      message,
      documentIds: Array.isArray(documentIds) ? documentIds : (documentId ? [documentId] : []),
      imageUrl,
      audioData,
      code,
      enableWebSearch: Boolean(enableWebSearch),
      raw: payload
    };
  }
};

module.exports = inputRouter;
