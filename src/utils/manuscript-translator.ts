/**
 * Manuscript Translation Tool
 * Translates entire manuscripts or specific sections with context preservation
 */

import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  preserveFormatting?: boolean;
  preserveNames?: boolean;
  section?: 'full' | 'selection' | 'chapter';
}

export interface TranslationResult {
  success: boolean;
  originalText: string;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  wordCount: number;
  translatedWordCount?: number;
  preservedElements?: string[];
  error?: string;
  confidence?: number;
}

export interface TranslationQuality {
  accuracy: number;
  fluency: number;
  consistency: number;
  culturalAdaptation: number;
  overallScore: number;
  feedback: string[];
}

// --- TRANSLATOR CLASS ---

export class ManuscriptTranslator {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    try {
      const {
        text,
        targetLanguage,
        sourceLanguage = 'auto-detect',
        preserveFormatting = true,
        preserveNames = true,
        section = 'selection'
      } = request;

      if (!text.trim()) {
        return {
          success: false,
          originalText: text,
          targetLanguage,
          wordCount: 0,
          error: 'Text cannot be empty'
        };
      }

      // Detect source language if not specified
      const detectedLanguage = sourceLanguage === 'auto-detect'
        ? await this.detectLanguage(text)
        : sourceLanguage;

      // Check if translation is needed
      if (detectedLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
        return {
          success: true,
          originalText: text,
          translatedText: text,
          sourceLanguage: detectedLanguage,
          targetLanguage,
          wordCount: this.countWords(text),
          translatedWordCount: this.countWords(text),
          confidence: 100,
          preservedElements: []
        };
      }

      // Extract elements to preserve
      const preservedElements: string[] = [];
      let processedText = text;

      if (preserveNames) {
        const names = this.extractCharacterNames(text);
        preservedElements.push(...names);
      }

      // Perform translation
      const translatedText = await this.performTranslation(
        processedText,
        detectedLanguage,
        targetLanguage,
        preserveFormatting,
        preservedElements
      );

      // Calculate confidence based on text complexity and length
      const confidence = this.calculateTranslationConfidence(text, translatedText);

      return {
        success: true,
        originalText: text,
        translatedText,
        sourceLanguage: detectedLanguage,
        targetLanguage,
        wordCount: this.countWords(text),
        translatedWordCount: this.countWords(translatedText),
        preservedElements,
        confidence
      };

    } catch (error) {
      return {
        success: false,
        originalText: request.text,
        targetLanguage: request.targetLanguage,
        wordCount: this.countWords(request.text),
        error: `Translation failed: ${(error as Error).message}`
      };
    }
  }

  async translateChapter(
    manuscript: string,
    chapterNumber: number,
    targetLanguage: string,
    chapterBoundaries: Array<{ startPosition: number; endPosition: number; chapterNumber: number }>
  ): Promise<TranslationResult> {
    const chapter = chapterBoundaries.find(c => c.chapterNumber === chapterNumber);

    if (!chapter) {
      return {
        success: false,
        originalText: '',
        targetLanguage,
        wordCount: 0,
        error: `Chapter ${chapterNumber} not found`
      };
    }

    const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

    return this.translateText({
      text: chapterText,
      targetLanguage,
      section: 'chapter',
      preserveFormatting: true,
      preserveNames: true
    });
  }

  async assessTranslationQuality(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationQuality> {
    const prompt = `You are an expert translation quality assessor. Evaluate this translation on a scale of 0-100 for each criterion:

ORIGINAL (${sourceLanguage}):
"""
${originalText.slice(0, 2000)}
"""

TRANSLATION (${targetLanguage}):
"""
${translatedText.slice(0, 2000)}
"""

Assess the translation quality and provide scores for each criterion with brief justification:
1. Accuracy: How well the meaning is preserved
2. Fluency: How natural the translation reads
3. Consistency: How consistent terminology and style are maintained
4. Cultural Adaptation: How well cultural references are adapted

Also provide 2-3 specific feedback points for improvement.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        accuracy: { type: Type.NUMBER },
        fluency: { type: Type.NUMBER },
        consistency: { type: Type.NUMBER },
        culturalAdaptation: { type: Type.NUMBER },
        feedback: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["accuracy", "fluency", "consistency", "culturalAdaptation", "feedback"]
    };

    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      const data = JSON.parse(result.text);
      const overallScore = (data.accuracy + data.fluency + data.consistency + data.culturalAdaptation) / 4;

      return {
        accuracy: data.accuracy,
        fluency: data.fluency,
        consistency: data.consistency,
        culturalAdaptation: data.culturalAdaptation,
        overallScore: Math.round(overallScore),
        feedback: data.feedback
      };

    } catch (error) {
      return {
        accuracy: 0,
        fluency: 0,
        consistency: 0,
        culturalAdaptation: 0,
        overallScore: 0,
        feedback: ['Quality assessment failed: ' + (error as Error).message]
      };
    }
  }

  private async detectLanguage(text: string): Promise<string> {
    const prompt = `Detect the language of this text. Respond with just the language name in English (e.g., "English", "Spanish", "French", "Russian", etc.):

"${text.slice(0, 500)}"`;

    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          topK: 1
        }
      });

      return result.text.trim();
    } catch (error) {
      return 'Unknown';
    }
  }

  private async performTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    preserveFormatting: boolean,
    preservedElements: string[]
  ): Promise<string> {
    let prompt = `You are a professional literary translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}.

IMPORTANT INSTRUCTIONS:
- Maintain the literary style and tone of the original
- Preserve the narrative voice and character personalities
- Keep cultural references appropriate for the target language
- Maintain the same level of formality`;

    if (preserveFormatting) {
      prompt += `\n- Preserve all formatting including paragraphs, line breaks, and punctuation structure`;
    }

    if (preservedElements.length > 0) {
      prompt += `\n- Keep these names/terms unchanged: ${preservedElements.join(', ')}`;
    }

    prompt += `\n- Respond with ONLY the translated text, no additional commentary

TEXT TO TRANSLATE:
"""
${text}
"""`;

    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.3 // Slightly higher temperature for creative translation
        }
      });

      return result.text.trim();
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error(`Translation API call failed: ${(error as Error).message}`);
    }
  }

  private extractCharacterNames(text: string): string[] {
    // Extract potential character names (capitalized words that appear multiple times)
    const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
    const wordCounts: Record<string, number> = {};

    words.forEach(word => {
      // Filter out common non-names
      const commonWords = new Set([
        'The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Who', 'How',
        'Chapter', 'Part', 'Book', 'Mr', 'Mrs', 'Ms', 'Dr', 'Professor'
      ]);

      if (!commonWords.has(word) && word.length > 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    // Return names that appear at least 3 times
    return Object.entries(wordCounts)
      .filter(([_, count]) => count >= 3)
      .map(([name]) => name)
      .slice(0, 20); // Limit to top 20 names
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private calculateTranslationConfidence(originalText: string, translatedText: string): number {
    const originalWords = this.countWords(originalText);
    const translatedWords = this.countWords(translatedText);

    // Base confidence
    let confidence = 85;

    // Adjust based on length difference
    const lengthRatio = translatedWords / originalWords;
    if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      confidence -= 20; // Significant length change might indicate issues
    } else if (lengthRatio < 0.8 || lengthRatio > 1.2) {
      confidence -= 10; // Moderate length change
    }

    // Adjust based on text complexity
    const avgWordLength = originalText.length / originalWords;
    if (avgWordLength > 6) {
      confidence -= 5; // Complex words might be harder to translate
    }

    // Ensure confidence is within bounds
    return Math.max(50, Math.min(95, confidence));
  }

  // Utility method to get supported languages
  getSupportedLanguages(): string[] {
    return [
      'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
      'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
      'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish',
      'Czech', 'Hungarian', 'Romanian', 'Bulgarian', 'Greek', 'Turkish',
      'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay'
    ];
  }

  // Utility method to split large texts for batch translation
  splitTextForTranslation(text: string, maxChunkSize: number = 4000): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          // Paragraph is too long, split by sentences
          const sentences = paragraph.split(/[.!?]+/);
          let sentenceChunk = '';

          for (const sentence of sentences) {
            if ((sentenceChunk + sentence).length > maxChunkSize) {
              if (sentenceChunk) {
                chunks.push(sentenceChunk.trim());
                sentenceChunk = sentence;
              } else {
                chunks.push(sentence.trim()); // Force include even if too long
              }
            } else {
              sentenceChunk += sentence + '.';
            }
          }

          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
          }
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  async translateInBatches(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    maxChunkSize: number = 4000
  ): Promise<TranslationResult> {
    const chunks = this.splitTextForTranslation(text, maxChunkSize);

    if (chunks.length === 1) {
      // For single chunk, do direct translation
      try {
        const detectedLanguage = sourceLanguage === 'auto-detect' || !sourceLanguage
          ? await this.detectLanguage(text)
          : sourceLanguage;

        // Check if translation is needed
        if (detectedLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
          return {
            success: true,
            originalText: text,
            translatedText: text,
            sourceLanguage: detectedLanguage,
            targetLanguage,
            wordCount: this.countWords(text),
            translatedWordCount: this.countWords(text),
            confidence: 100,
            preservedElements: []
          };
        }

        const preservedElements = this.extractCharacterNames(text);
        const translatedText = await this.performTranslation(
          text,
          detectedLanguage,
          targetLanguage,
          true,
          preservedElements
        );

        const confidence = this.calculateTranslationConfidence(text, translatedText);

        return {
          success: true,
          originalText: text,
          translatedText,
          sourceLanguage: detectedLanguage,
          targetLanguage,
          wordCount: this.countWords(text),
          translatedWordCount: this.countWords(translatedText),
          preservedElements,
          confidence
        };
      } catch (error) {
        return {
          success: false,
          originalText: text,
          targetLanguage,
          wordCount: this.countWords(text),
          error: `Single chunk translation failed: ${(error as Error).message}`
        };
      }
    }

    try {
      const translatedChunks: string[] = [];
      let detectedLanguage = sourceLanguage || 'auto-detect';
      const preservedElements: string[] = [];

      // Extract names from the full text
      if (text.length > 0) {
        const names = this.extractCharacterNames(text);
        preservedElements.push(...names);
      }

      // Translate each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Detect language from first chunk if needed
        if (i === 0 && detectedLanguage === 'auto-detect') {
          detectedLanguage = await this.detectLanguage(chunk);
        }

        const translatedChunk = await this.performTranslation(
          chunk,
          detectedLanguage,
          targetLanguage,
          true,
          preservedElements
        );

        translatedChunks.push(translatedChunk);
      }

      const fullTranslation = translatedChunks.join('\n\n');
      const confidence = this.calculateTranslationConfidence(text, fullTranslation);

      return {
        success: true,
        originalText: text,
        translatedText: fullTranslation,
        sourceLanguage: detectedLanguage,
        targetLanguage,
        wordCount: this.countWords(text),
        translatedWordCount: this.countWords(fullTranslation),
        preservedElements,
        confidence
      };

    } catch (error) {
      return {
        success: false,
        originalText: text,
        targetLanguage,
        wordCount: this.countWords(text),
        error: `Batch translation failed: ${(error as Error).message}`
      };
    }
  }
}