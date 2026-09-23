/**
 * Mathiyon AI - Vision Service Boundary (Phase 8 Multimodal Architecture)
 * Vision processing boundary for image OCR, mathematical screenshot recognition, and code screenshots.
 */

const visionService = {
  status: 'NOT CONFIGURED',
  provider: 'None',

  async processImage(imageUrl, prompt = '') {
    return {
      status: this.status,
      configured: false,
      message: 'Vision model processing service boundary active. External vision provider is not configured.',
      detectedMathText: null,
      ocrResult: null,
      imageUrl,
      prompt
    };
  }
};

module.exports = visionService;
