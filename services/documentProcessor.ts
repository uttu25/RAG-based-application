
declare const pdfjsLib: any;
declare const mammoth: any;

export class DocumentProcessor {
  static async extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  }

  static async extractTextFromDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  static async processFile(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      return await this.extractTextFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await this.extractTextFromDocx(file);
    } else if (file.type === 'text/plain') {
      return await file.text();
    }
    throw new Error('Unsupported file type: ' + file.type);
  }

  static chunkText(text: string, documentId: string, documentName: string, chunkSize: number = 800, overlap: number = 200): any[] {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.substring(start, end).trim();
      
      if (chunkText.length > 50) { // Avoid tiny chunks
        chunks.push({
          id: `${documentId}-${chunks.length}`,
          documentId,
          documentName,
          text: chunkText,
        });
      }
      
      start += chunkSize - overlap;
    }
    
    return chunks;
  }
}
