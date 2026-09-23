const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

/**
 * Extracts normalized text and page breakdown from a PDF Buffer.
 * Uses pdf-parse v2 PDFParse class API.
 */
async function extractPdfText(buffer) {
  try {
    const pdfParseModule = require('pdf-parse');
    const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;

    if (typeof PDFParseClass === 'function' && PDFParseClass.prototype && PDFParseClass.prototype.load) {
      // pdf-parse v2 API
      const parser = new PDFParseClass({ data: buffer });
      await parser.load();
      const parsedData = await parser.getText();
      
      const totalPages = parsedData.total || (parsedData.pages ? parsedData.pages.length : 1);
      const pages = (parsedData.pages && parsedData.pages.length > 0)
        ? parsedData.pages.map((p) => ({
            pageNumber: p.num || 1,
            text: (p.text || '').trim(),
          }))
        : [{ pageNumber: 1, text: (parsedData.text || '').trim() }];

      const combinedText = pages.map((p) => p.text).join('\n\n');

      if (typeof parser.destroy === 'function') {
        try { parser.destroy(); } catch (e) {}
      }

      return {
        text: combinedText,
        pageCount: totalPages,
        pages: pages.filter((p) => p.text.length > 0),
      };
    } else if (typeof pdfParseModule === 'function') {
      // Legacy pdf-parse v1 function API fallback
      const data = await pdfParseModule(buffer);
      const totalPages = data.numpages || 1;
      const rawText = data.text || '';
      
      const rawSplit = rawText.split(/\f|\n\s*\n\s*\n/);
      let pages = [];
      if (rawSplit.length >= totalPages) {
        pages = rawSplit.slice(0, totalPages).map((t, i) => ({ pageNumber: i + 1, text: t.trim() }));
      } else {
        const approxLen = Math.ceil(rawText.length / totalPages);
        for (let i = 0; i < totalPages; i++) {
          const start = i * approxLen;
          const end = Math.min((i + 1) * approxLen, rawText.length);
          pages.push({ pageNumber: i + 1, text: rawText.substring(start, end).trim() });
        }
      }

      return {
        text: rawText,
        pageCount: totalPages,
        pages: pages.filter((p) => p.text.length > 0),
      };
    } else {
      throw new Error('PDF extraction failed. Installed pdf-parse version has unknown API export.');
    }
  } catch (err) {
    console.error('extractPdfText Error:', err.message);
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

/**
 * Main Document Text Extractor Entrypoint
 */
async function extractTextFromDocument(filePath, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    return await extractPdfText(buffer);
  } else if (ext === '.docx') {
    const docResult = await mammoth.extractRawText({ buffer });
    const rawText = (docResult.value || '').trim();
    return {
      text: rawText,
      pageCount: 1,
      pages: [{ pageNumber: 1, text: rawText }],
    };
  } else {
    // TXT, MD, CSV, JSON, Source Code
    const rawText = buffer.toString('utf-8').trim();
    return {
      text: rawText,
      pageCount: 1,
      pages: [{ pageNumber: 1, text: rawText }],
    };
  }
}

module.exports = {
  extractPdfText,
  extractTextFromDocument,
};
