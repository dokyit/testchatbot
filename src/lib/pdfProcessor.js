import * as pdfjsLib from 'pdfjs-dist';

// Set worker - use CDN version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (pageText) {
        fullText += `Page ${i}:\n${pageText}\n\n`;
      }
    }
    
    if (!fullText.trim()) {
      return `[PDF file: ${file.name} - Text extraction failed or no text found]`;
    }
    
    // Limit text length to prevent API overload
    if (fullText.length > 10000) {
      fullText = fullText.substring(0, 10000) + '\n\n[Text truncated due to length...]';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return `[PDF file: ${file.name} - Could not extract text: ${error.message}]`;
  }
}

export async function extractPDFMetadata(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const metadata = await pdf.getMetadata();
    
    return {
      numPages: pdf.numPages,
      title: metadata.info?.Title || 'Unknown',
      author: metadata.info?.Author || 'Unknown',
      subject: metadata.info?.Subject || 'Unknown',
      creator: metadata.info?.Creator || 'Unknown',
      producer: metadata.info?.Producer || 'Unknown',
      creationDate: metadata.info?.CreationDate || 'Unknown'
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {
      numPages: 0,
      title: 'Unknown',
      error: error.message
    };
  }
}