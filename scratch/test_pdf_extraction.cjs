const fs = require('fs');
const path = require('path');
const { extractPdfText } = require('../server/services/documentExtractor');

async function testPdfExtraction() {
  console.log("================================================");
  console.log(" 📄 TESTING PDF EXTRACTION SERVICE");
  console.log("================================================\n");

  const pdfPath = path.join(__dirname, '../mathiyon_rag_demo.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error("FATAL: mathiyon_rag_demo.pdf file not found.");
    process.exit(1);
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log(`Loaded PDF File Size: ${pdfBuffer.length} bytes`);

  try {
    const startTime = Date.now();
    const result = await extractPdfText(pdfBuffer);
    const latency = Date.now() - startTime;

    console.log(`Extraction Latency: ${latency}ms`);
    console.log(`Page Count: ${result.pageCount}`);
    console.log(`Extracted Pages Array Length: ${result.pages ? result.pages.length : 0}`);
    console.log("\n--- Extracted Text ---");
    console.log(result.text);

    // Required Keyword Assertions
    const requiredKeywords = [
      "Mathiyon AI",
      "React",
      "MongoDB",
      "1/3 + 1/6 = 1/2",
      "2x + 5 = 15"
    ];

    let allKeywordsFound = true;
    console.log("\n--- KEYWORD ASSERTIONS ---");
    for (const kw of requiredKeywords) {
      const found = result.text.includes(kw);
      console.log(`Assertion "${kw}": ${found ? 'PASS' : 'FAIL'}`);
      if (!found) allKeywordsFound = false;
    }

    if (result.pageCount > 0 && result.text.length > 0 && allKeywordsFound) {
      console.log("\n================================================");
      console.log(" 🎉 PDF EXTRACTION TEST: PASS");
      console.log("================================================");
      process.exit(0);
    } else {
      console.error("\n[FAIL] PDF Extraction did not meet all requirements.");
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n[FAIL] PDF Extraction error: ${err.message}`);
    process.exit(1);
  }
}

testPdfExtraction();
