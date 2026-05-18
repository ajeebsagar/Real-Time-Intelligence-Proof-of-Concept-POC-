// File Processing Utilities

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mammoth from 'mammoth';
import logger from '../logger';

// Lazy-loaded pdfjs-dist v4 (ESM-only). The Function() wrapper keeps the
// dynamic import as a runtime native call so TypeScript's CommonJS transpiler
// doesn't rewrite it as a require() (which can't load .mjs).
let pdfjsModule: any = null;
const nativeDynamicImport = new Function('m', 'return import(m)') as (
  m: string
) => Promise<any>;

async function getPdfjs(): Promise<any> {
  if (!pdfjsModule) {
    pdfjsModule = await nativeDynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
    // pdfjs-dist v4 always requires GlobalWorkerOptions.workerSrc to be set,
    // even in Node.js. On Windows, raw paths like "d:\..." fail the ESM
    // loader's URL parser ("Received protocol 'd:'"), so convert to file://.
    const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
    const workerPath = path.join(pdfjsRoot, 'legacy/build/pdf.worker.mjs');
    pdfjsModule.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  }
  return pdfjsModule;
}

export class FileProcessor {
  static async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      logger.info(`Extracting text from file: ${filePath}`);

      switch (mimeType) {
        case 'application/pdf':
          return await this.extractPdfText(filePath);
        
        case 'text/plain':
        case 'text/markdown':
          return await this.extractPlainText(filePath);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractDocxText(filePath);
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      logger.error('File extraction error:', error);
      throw error;
    }
  }

  private static async extractPdfText(filePath: string): Promise<string> {
    const pdfjs = await getPdfjs();
    const dataBuffer = fs.readFileSync(filePath);
    // pdfjs expects a Uint8Array, not a Node Buffer.
    const uint8 = new Uint8Array(
      dataBuffer.buffer,
      dataBuffer.byteOffset,
      dataBuffer.byteLength
    );

    const loadingTask = pdfjs.getDocument({
      data: uint8,
      // Be tolerant of slightly malformed PDFs (most real-world files).
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const parts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      parts.push(pageText);
      page.cleanup();
    }
    await pdf.cleanup();
    await pdf.destroy();

    return parts.join('\n\n');
  }

  private static async extractPlainText(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private static async extractDocxText(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  static chunkText(
    text: string,
    chunkSize: number = 1000,
    overlap: number = 200
  ): string[] {
    if (!text || text.trim().length === 0) return [];
    if (overlap >= chunkSize) {
      throw new Error(`Chunk overlap (${overlap}) must be smaller than chunk size (${chunkSize})`);
    }

    const chunks: string[] = [];
    const stride = chunkSize - overlap;
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunk = text.slice(startIndex, endIndex).trim();
      if (chunk.length > 0) chunks.push(chunk);
      if (endIndex === text.length) break;
      startIndex += stride;
    }

    logger.info(`Text chunked into ${chunks.length} pieces`);
    return chunks;
  }

  static async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Directory created: ${dirPath}`);
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`File deleted: ${filePath}`);
      }
    } catch (error) {
      logger.error('File deletion error:', error);
      throw error;
    }
  }

  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = this.getFileExtension(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    return `${nameWithoutExt}_${timestamp}_${random}${ext}`;
  }
}
