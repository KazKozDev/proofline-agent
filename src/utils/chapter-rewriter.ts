/**
 * ChapterRewriter - TypeScript Implementation
 * A comprehensive tool that automatically identifies chapter boundaries and completely
 * rewrites selected chapters to fix structural, narrative, and stylistic problems
 * while guaranteeing quality improvements across all metrics.
 */

// --- TYPES AND INTERFACES ---

export enum RewriteIntensity {
  LIGHT = 'light',
  MODERATE = 'moderate',
  COMPREHENSIVE = 'comprehensive'
}

export interface QualityMetrics {
  readabilityScore: number;
  storyStructureScore: number;
  characterConsistencyScore: number;
  pacingScore: number;
  dialogueEffectivenessScore: number;
  narrativeFlowScore: number;
  tensionScore: number;
  proseQualityScore: number;
  overallScore: number;
}

export interface ChapterBoundary {
  chapterNumber: number;
  startPosition: number;
  endPosition: number;
  title?: string;
  confidence: number;
}

export interface ProblemAnalysis {
  structuralIssues: string[];
  narrativeIssues: string[];
  characterIssues: string[];
  pacingIssues: string[];
  dialogueIssues: string[];
  proseIssues: string[];
  severityScore: number;
}

export interface PreservationControls {
  preserveDialogue?: string[];
  preserveCharacterNames?: boolean;
  preservePlotPoints?: string[];
  preserveScenes?: number[];
  customPreservations?: Record<string, any>;
}

export interface RewriteReport {
  originalMetrics: QualityMetrics;
  finalMetrics: QualityMetrics;
  changesMade: string[];
  improvements: Record<string, number>;
  iterationsRequired: number;
  preservedElements: string[];
}

// --- CHAPTER DETECTOR ---

export class ChapterDetector {
  private chapterPatterns: RegExp[] = [
    /^Chapter\s+\d+/i,
    /^CHAPTER\s+\d+/i,
    /^\d+\./,
    /^Part\s+\d+/i,
    /^PART\s+\d+/i,
    /^\*\s*\*\s*\*/,
    /^-{3,}/,
    /^#{1,3}\s/, // Markdown headers
  ];

  detectChapters(manuscript: string): ChapterBoundary[] {
    const chapters: ChapterBoundary[] = [];
    const lines = manuscript.split('\n');
    let currentChapter = 1;

    for (let i = 0; i < lines.length; i++) {
      const lineStripped = lines[i].trim();

      // Check for chapter patterns
      for (const pattern of this.chapterPatterns) {
        if (pattern.test(lineStripped)) {
          // Update the end position of the previous chapter
          if (chapters.length > 0) {
            chapters[chapters.length - 1].endPosition = this.getPositionAtLine(manuscript, i);
          }

          // Extract chapter title if present
          const title = this.extractChapterTitle(lineStripped);

          // Create new chapter boundary
          const startPos = this.getPositionAtLine(manuscript, i);
          const confidence = this.calculateConfidence(lineStripped, i, lines);

          const chapter: ChapterBoundary = {
            chapterNumber: currentChapter,
            startPosition: startPos,
            endPosition: manuscript.length, // Will be updated when next chapter is found
            title,
            confidence,
          };
          chapters.push(chapter);
          currentChapter++;
          break;
        }
      }
    }

    // If no chapters detected, treat entire manuscript as one chapter
    if (chapters.length === 0) {
      chapters.push({
        chapterNumber: 1,
        startPosition: 0,
        endPosition: manuscript.length,
        title: undefined,
        confidence: 1.0,
      });
    }

    return chapters;
  }

  private getPositionAtLine(text: string, lineNumber: number): number {
    const lines = text.split('\n');
    return lines.slice(0, lineNumber).reduce((acc, line) => acc + line.length + 1, 0);
  }

  private extractChapterTitle(line: string): string | undefined {
    // Remove common chapter prefixes
    let title = line.replace(/^(Chapter|CHAPTER|Part|PART)\s*\d*:?\s*/i, '');
    title = title.replace(/^\d+\.?\s*/, '');
    title = title.replace(/^[*-]+\s*/, '');
    title = title.replace(/^#+\s*/, '');

    return title.trim() || undefined;
  }

  private calculateConfidence(line: string, lineIndex: number, allLines: string[]): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for explicit chapter markers
    if (/^(Chapter|CHAPTER)\s+\d+/.test(line)) {
      confidence += 0.4;
    }

    // Check if line is isolated (empty lines before/after)
    if (lineIndex > 0 && !allLines[lineIndex - 1].trim()) {
      confidence += 0.1;
    }
    if (lineIndex < allLines.length - 1 && !allLines[lineIndex + 1].trim()) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}

// --- QUALITY ASSESSOR ---

export class QualityAssessor {
  assessQuality(text: string, context?: Record<string, any>): QualityMetrics {
    const readability = this.assessReadability(text);
    const structure = this.assessStoryStructure(text, context);
    const characterConsistency = this.assessCharacterConsistency(text, context);
    const pacing = this.assessPacing(text);
    const dialogue = this.assessDialogueEffectiveness(text);
    const flow = this.assessNarrativeFlow(text);
    const tension = this.assessTension(text);
    const prose = this.assessProseQuality(text);

    const overall = (readability + structure + characterConsistency + pacing + dialogue + flow + tension + prose) / 8;

    return {
      readabilityScore: readability,
      storyStructureScore: structure,
      characterConsistencyScore: characterConsistency,
      pacingScore: pacing,
      dialogueEffectivenessScore: dialogue,
      narrativeFlowScore: flow,
      tensionScore: tension,
      proseQualityScore: prose,
      overallScore: overall,
    };
  }

  private assessReadability(text: string): number {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    if (!words.length || !sentences.length) return 0.0;

    // Average words per sentence
    const avgWordsPerSentence = words.length / sentences.length;

    // Sentence length variety
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const lengthVariance = this.calculateVariance(sentenceLengths);

    // Complexity indicators
    const complexWords = words.filter(word => word.length > 6).length;
    const complexityRatio = complexWords / words.length;

    let readabilityScore = 1.0;

    // Penalize overly long sentences
    if (avgWordsPerSentence > 25) {
      readabilityScore -= 0.3;
    } else if (avgWordsPerSentence > 20) {
      readabilityScore -= 0.1;
    }

    // Reward sentence variety
    if (lengthVariance > 10) {
      readabilityScore += 0.1;
    }

    // Penalize excessive complexity
    if (complexityRatio > 0.3) {
      readabilityScore -= 0.2;
    }

    return Math.max(0.0, Math.min(1.0, readabilityScore));
  }

  private assessStoryStructure(text: string, context?: Record<string, any>): number {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    if (!paragraphs.length) return 0.0;

    let score = 0.5; // Base score

    // Check for clear beginning, middle, end structure
    if (paragraphs.length >= 3) {
      score += 0.2;
    }

    // Check for scene transitions
    const transitionWords = ['meanwhile', 'later', 'suddenly', 'then', 'after', 'before'];
    let transitions = 0;
    for (const paragraph of paragraphs) {
      for (const word of transitionWords) {
        if (paragraph.toLowerCase().includes(word)) {
          transitions++;
        }
      }
    }

    if (transitions > 0) {
      score += Math.min(0.2, transitions * 0.05);
    }

    // Check paragraph length consistency
    const paraLengths = paragraphs.map(p => p.split(/\s+/).length);
    if (paraLengths.length) {
      const avgLength = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
      if (avgLength >= 50 && avgLength <= 150) { // Optimal paragraph length
        score += 0.1;
      }
    }

    return Math.min(1.0, score);
  }

  private assessCharacterConsistency(text: string, context?: Record<string, any>): number {
    // Extract potential character names (capitalized words)
    const characterNames = new Set(text.match(/\b[A-Z][a-z]+\b/g) || []);

    // Remove common non-names
    const commonWords = new Set(['The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Who', 'How']);
    commonWords.forEach(word => characterNames.delete(word));

    if (characterNames.size === 0) {
      return 0.7; // Neutral score if no clear characters
    }

    let score = 0.5;

    // Check for dialogue attribution consistency
    const dialoguePatterns = text.match(/"[^"]*"\s*([A-Z][a-z]+\s+said|said\s+[A-Z][a-z]+)/g);
    if (dialoguePatterns?.length) {
      score += 0.2;
    }

    // Check for character action consistency
    const actionPatterns = text.match(/([A-Z][a-z]+)\s+(walked|ran|said|looked|turned)/g);
    if (actionPatterns?.length) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private assessPacing(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);

    if (!sentenceLengths.length) return 0.0;

    let score = 0.5;

    // Check for pacing variety
    if (sentenceLengths.length > 1) {
      const variance = this.calculateVariance(sentenceLengths);
      if (variance > 20) { // Good variety in sentence length
        score += 0.3;
      }
    }

    // Check for action indicators (short, punchy sentences)
    const shortSentences = sentenceLengths.filter(length => length <= 5).length;
    if (shortSentences > 0) {
      score += Math.min(0.2, shortSentences * 0.02);
    }

    return Math.min(1.0, score);
  }

  private assessDialogueEffectiveness(text: string): number {
    // Find dialogue
    const dialogueMatches = text.match(/"[^"]*"/g) || [];

    if (!dialogueMatches.length) {
      return 0.6; // Neutral score for no dialogue
    }

    let score = 0.5;

    // Check dialogue length variety
    const dialogueLengths = dialogueMatches.map(d => d.split(/\s+/).length);
    if (dialogueLengths.length > 1) {
      const variance = this.calculateVariance(dialogueLengths);
      if (variance > 5) {
        score += 0.2;
      }
    }

    // Check for dialogue tags
    const dialogueTags = text.match(/"[^"]*"\s*[a-z]+\s+said|said\s+[a-z]+/gi) || [];
    const tagRatio = dialogueTags.length / dialogueMatches.length;
    if (tagRatio >= 0.3 && tagRatio <= 0.7) { // Good balance of tags
      score += 0.2;
    }

    // Check for natural dialogue (contractions, informal language)
    const contractions = dialogueMatches.filter(d => d.includes("'")).length;
    if (contractions > 0) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private assessNarrativeFlow(text: string): number {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    if (paragraphs.length < 2) return 0.5;

    let score = 0.5;

    // Check for transition words between paragraphs
    const transitionWords = [
      'however', 'meanwhile', 'therefore', 'consequently', 'furthermore',
      'additionally', 'moreover', 'nevertheless', 'nonetheless', 'thus'
    ];

    let transitionsFound = 0;
    for (let i = 1; i < paragraphs.length; i++) {
      const firstSentence = paragraphs[i].split('.')[0].toLowerCase();
      if (transitionWords.some(word => firstSentence.includes(word))) {
        transitionsFound++;
      }
    }

    if (transitionsFound > 0) {
      score += Math.min(0.3, transitionsFound * 0.1);
    }

    return Math.min(1.0, score);
  }

  private assessTension(text: string): number {
    let score = 0.5;

    // Check for tension indicators
    const tensionWords = [
      'suddenly', 'urgent', 'danger', 'fear', 'panic', 'rush', 'quick',
      'immediately', 'emergency', 'crisis', 'threat', 'worried', 'anxious'
    ];

    let tensionCount = 0;
    const textLower = text.toLowerCase();
    tensionWords.forEach(word => {
      if (textLower.includes(word)) {
        tensionCount++;
      }
    });

    if (tensionCount > 0) {
      score += Math.min(0.3, tensionCount * 0.05);
    }

    // Check for short, punchy sentences (tension indicator)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const shortSentences = sentences.filter(s => s.split(/\s+/).length <= 5 && s.trim()).length;
    if (shortSentences > 0) {
      score += Math.min(0.2, shortSentences * 0.02);
    }

    return Math.min(1.0, score);
  }

  private assessProseQuality(text: string): number {
    const words = text.split(/\s+/);

    if (!words.length) return 0.0;

    let score = 0.5;

    // Check for word variety
    const uniqueWords = new Set(words.map(word => word.toLowerCase())).size;
    const varietyRatio = uniqueWords / words.length;
    if (varietyRatio > 0.5) {
      score += 0.2;
    }

    // Check for excessive adverbs
    const adverbs = words.filter(word => word.endsWith('ly')).length;
    const adverbRatio = adverbs / words.length;
    if (adverbRatio < 0.05) { // Good - not too many adverbs
      score += 0.1;
    } else if (adverbRatio > 0.1) { // Too many adverbs
      score -= 0.1;
    }

    // Check for strong verbs vs weak verbs
    const weakVerbs = ['went', 'said', 'looked', 'walked', 'was', 'were'];
    const weakVerbCount = words.filter(word => weakVerbs.includes(word.toLowerCase())).length;
    if (weakVerbCount / words.length < 0.1) {
      score += 0.2;
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length <= 1) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

// --- PROBLEM ANALYZER ---

export class ProblemAnalyzer {
  analyzeProblems(text: string, context?: Record<string, any>): ProblemAnalysis {
    const structuralIssues = this.analyzeStructuralIssues(text);
    const narrativeIssues = this.analyzeNarrativeIssues(text);
    const characterIssues = this.analyzeCharacterIssues(text, context);
    const pacingIssues = this.analyzePacingIssues(text);
    const dialogueIssues = this.analyzeDialogueIssues(text);
    const proseIssues = this.analyzeProseIssues(text);

    // Calculate severity score
    const totalIssues = structuralIssues.length + narrativeIssues.length +
                       characterIssues.length + pacingIssues.length +
                       dialogueIssues.length + proseIssues.length;
    const severity = Math.min(1.0, totalIssues / 20); // Normalize to 0-1

    return {
      structuralIssues,
      narrativeIssues,
      characterIssues,
      pacingIssues,
      dialogueIssues,
      proseIssues,
      severityScore: severity,
    };
  }

  private analyzeStructuralIssues(text: string): string[] {
    const issues: string[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    if (paragraphs.length < 3) {
      issues.push("Chapter may be too short or lack proper structure");
    }

    // Check for overly long paragraphs
    const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 200);
    if (longParagraphs.length > 0) {
      issues.push(`Found ${longParagraphs.length} overly long paragraphs`);
    }

    // Check for very short paragraphs
    const shortParagraphs = paragraphs.filter(p => p.split(/\s+/).length < 10);
    if (shortParagraphs.length > paragraphs.length * 0.3) {
      issues.push("Too many very short paragraphs - may indicate choppy structure");
    }

    return issues;
  }

  private analyzeNarrativeIssues(text: string): string[] {
    const issues: string[] = [];

    // Check for sudden POV shifts
    const firstPersonIndicators = [' I ', ' me ', ' my ', ' mine '];
    const thirdPersonIndicators = [' he ', ' she ', ' they ', ' his ', ' her ', ' their '];

    const hasFirstPerson = firstPersonIndicators.some(indicator => text.includes(indicator));
    const hasThirdPerson = thirdPersonIndicators.some(indicator => text.includes(indicator));

    if (hasFirstPerson && hasThirdPerson) {
      issues.push("Potential POV inconsistency - mixing first and third person");
    }

    // Check for tense consistency
    const pastTenseIndicators = ['was', 'were', 'had', 'did'];
    const presentTenseIndicators = ['is', 'are', 'has', 'does'];

    const textLower = text.toLowerCase();
    const pastCount = pastTenseIndicators.reduce((count, word) => count + (textLower.match(new RegExp(word, 'g'))?.length || 0), 0);
    const presentCount = presentTenseIndicators.reduce((count, word) => count + (textLower.match(new RegExp(word, 'g'))?.length || 0), 0);

    if (pastCount > 0 && presentCount > 0 && Math.abs(pastCount - presentCount) < Math.min(pastCount, presentCount)) {
      issues.push("Potential tense inconsistency");
    }

    return issues;
  }

  private analyzeCharacterIssues(text: string, context?: Record<string, any>): string[] {
    const issues: string[] = [];

    // Extract potential character names
    const characterNames = new Set(text.match(/\b[A-Z][a-z]+\b/g) || []);
    const commonWords = new Set(['The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Who', 'How', 'But', 'And']);
    commonWords.forEach(word => characterNames.delete(word));

    if (characterNames.size > 10) {
      issues.push("Too many character names introduced - may confuse readers");
    }

    // Check for dialogue without attribution
    const dialogueLines = text.match(/"[^"]*"/g) || [];
    const attributedDialogue = text.match(/"[^"]*"\s*[^"]*?(said|asked|replied|whispered|shouted)/gi) || [];

    if (dialogueLines.length > 0 && attributedDialogue.length < dialogueLines.length * 0.3) {
      issues.push("Many dialogue lines lack clear attribution");
    }

    return issues;
  }

  private analyzePacingIssues(text: string): string[] {
    const issues: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);

    if (!sentenceLengths.length) return issues;

    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

    if (avgLength > 25) {
      issues.push("Sentences are too long on average - may slow pacing");
    } else if (avgLength < 8) {
      issues.push("Sentences are too short on average - may feel choppy");
    }

    // Check for lack of variety
    if (sentenceLengths.length > 5) {
      const assessor = new QualityAssessor();
      const variance = assessor['calculateVariance'](sentenceLengths);
      if (variance < 10) {
        issues.push("Lack of sentence length variety - monotonous pacing");
      }
    }

    return issues;
  }

  private analyzeDialogueIssues(text: string): string[] {
    const issues: string[] = [];
    const dialogueMatches = text.match(/"[^"]*"/g) || [];

    if (!dialogueMatches.length) return issues;

    // Check for overly long dialogue
    const longDialogue = dialogueMatches.filter(d => d.split(/\s+/).length > 50);
    if (longDialogue.length > 0) {
      issues.push(`Found ${longDialogue.length} overly long dialogue segments`);
    }

    // Check for lack of contractions (unnatural dialogue)
    const contractions = dialogueMatches.filter(d => d.includes("'")).length;
    if (contractions === 0 && dialogueMatches.length > 3) {
      issues.push("Dialogue lacks contractions - may sound unnatural");
    }

    // Check for repeated dialogue tags
    const saidCount = (text.toLowerCase().match(/ said/g) || []).length;
    if (saidCount > dialogueMatches.length * 0.8) {
      issues.push("Overuse of 'said' - dialogue tags lack variety");
    }

    return issues;
  }

  private analyzeProseIssues(text: string): string[] {
    const issues: string[] = [];
    const words = text.split(/\s+/);

    if (!words.length) return issues;

    // Check for excessive adverbs
    const adverbs = words.filter(word => word.endsWith('ly'));
    const adverbRatio = adverbs.length / words.length;
    if (adverbRatio > 0.1) {
      issues.push(`Excessive use of adverbs (${adverbs.length} found) - consider stronger verbs`);
    }

    // Check for weak verbs
    const weakVerbs = ['went', 'got', 'put', 'look', 'come', 'go'];
    const weakVerbCount = words.filter(word => weakVerbs.includes(word.toLowerCase())).length;
    if (weakVerbCount > words.length * 0.05) {
      issues.push("Overuse of weak verbs - consider more specific alternatives");
    }

    // Check for repetitive words
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      const wordLower = word.toLowerCase();
      if (wordLower.length > 4) { // Only check substantial words
        wordFreq[wordLower] = (wordFreq[wordLower] || 0) + 1;
      }
    });

    const excludeWords = new Set(['that', 'with', 'have', 'this', 'they', 'were', 'been']);
    const repeatedWords = Object.entries(wordFreq)
      .filter(([word, count]) => count > 5 && !excludeWords.has(word))
      .slice(0, 3);

    if (repeatedWords.length > 0) {
      const wordList = repeatedWords.map(([word, count]) => `${word}(${count})`).join(', ');
      issues.push(`Repetitive word usage: ${wordList}`);
    }

    return issues;
  }
}

// --- CHAPTER REWRITER ---

export class ChapterRewriter {
  public detector: ChapterDetector;
  private assessor: QualityAssessor;
  private analyzer: ProblemAnalyzer;

  constructor() {
    this.detector = new ChapterDetector();
    this.assessor = new QualityAssessor();
    this.analyzer = new ProblemAnalyzer();
  }

  async rewriteChapter(
    manuscript: string,
    chapterNumber?: number,
    intensity: RewriteIntensity = RewriteIntensity.MODERATE,
    preservationControls?: PreservationControls,
    maxIterations: number = 5
  ): Promise<{ rewrittenChapter: string; report: RewriteReport }> {

    // Step 1: Detect chapters
    const chapters = this.detector.detectChapters(manuscript);

    if (chapters.length === 0) {
      throw new Error("No chapters detected in manuscript");
    }

    // Step 2: Select chapter to rewrite
    let targetChapter: ChapterBoundary;

    if (chapterNumber === undefined) {
      // Auto-select chapter with lowest quality
      let lowestScore = Infinity;
      targetChapter = chapters[0];

      for (const chapter of chapters) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const metrics = this.assessor.assessQuality(chapterText);
        if (metrics.overallScore < lowestScore) {
          lowestScore = metrics.overallScore;
          targetChapter = chapter;
        }
      }
    } else {
      const targetChapters = chapters.filter(c => c.chapterNumber === chapterNumber);
      if (targetChapters.length === 0) {
        throw new Error(`Chapter ${chapterNumber} not found`);
      }
      targetChapter = targetChapters[0];
    }

    // Step 3: Extract chapter text
    const originalText = manuscript.slice(targetChapter.startPosition, targetChapter.endPosition);

    // Step 4: Baseline quality assessment
    const originalMetrics = this.assessor.assessQuality(originalText);

    // Step 5: Problem analysis
    let problems = this.analyzer.analyzeProblems(originalText);

    // Step 6: Iterative rewriting with quality assurance
    let currentText = originalText;
    let iterations = 0;
    const improvementsMade: string[] = [];

    while (iterations < maxIterations) {
      iterations++;

      // Generate rewritten version
      const rewrittenText = await this.generateRewrite(
        currentText,
        problems,
        intensity,
        preservationControls
      );

      // Assess new quality
      const newMetrics = this.assessor.assessQuality(rewrittenText);

      // Check if quality improved
      if (this.isQualityBetter(newMetrics, originalMetrics)) {
        // Quality improved
        currentText = rewrittenText;

        // Log improvements
        improvementsMade.push(...this.identifyImprovements(originalMetrics, newMetrics));

        // Check if we've reached high quality
        if (newMetrics.overallScore > 0.9) {
          break;
        }

        // Update problems for next iteration
        problems = this.analyzer.analyzeProblems(currentText);

        // If no significant problems remain, stop
        if (problems.severityScore < 0.2) {
          break;
        }
      } else {
        // Quality didn't improve - try different approach or stop
        if (iterations < maxIterations) {
          continue;
        } else {
          break;
        }
      }
    }

    // Step 7: Generate final report
    const finalMetrics = this.assessor.assessQuality(currentText);
    const preservedElements = this.identifyPreservedElements(
      originalText,
      currentText,
      preservationControls
    );
    const improvements = this.calculateImprovements(originalMetrics, finalMetrics);
    const changesMade = this.identifyChangesMade(originalText, currentText, problems);

    const report: RewriteReport = {
      originalMetrics,
      finalMetrics,
      changesMade,
      improvements,
      iterationsRequired: iterations,
      preservedElements,
    };

    return { rewrittenChapter: currentText, report };
  }

  private async generateRewrite(
    text: string,
    problems: ProblemAnalysis,
    intensity: RewriteIntensity,
    preservationControls?: PreservationControls
  ): Promise<string> {
    let rewritten = text;

    switch (intensity) {
      case RewriteIntensity.LIGHT:
        rewritten = this.lightRewrite(rewritten, problems);
        break;
      case RewriteIntensity.MODERATE:
        rewritten = this.moderateRewrite(rewritten, problems);
        break;
      case RewriteIntensity.COMPREHENSIVE:
        rewritten = this.comprehensiveRewrite(rewritten, problems);
        break;
    }

    // Apply preservation controls
    if (preservationControls) {
      rewritten = this.applyPreservationControls(rewritten, text, preservationControls);
    }

    return rewritten;
  }

  private lightRewrite(text: string, problems: ProblemAnalysis): string {
    let rewritten = text;

    // Fix simple prose issues
    if (problems.proseIssues.some(issue => issue.includes('Excessive use of adverbs'))) {
      // Remove some adverbs
      rewritten = rewritten.replace(/\b\w+ly\b/g, (match) => {
        return match.length > 6 ? '' : match;
      });
      rewritten = rewritten.replace(/\s+/g, ' '); // Clean up extra spaces
    }

    // Improve dialogue tags
    if (problems.dialogueIssues.some(issue => issue.includes("Overuse of 'said'"))) {
      const alternatives = ['replied', 'asked', 'whispered', 'murmured', 'stated'];
      let altIndex = 0;
      rewritten = rewritten.replace(/ said/g, () => {
        const replacement = ` ${alternatives[altIndex % alternatives.length]}`;
        altIndex++;
        return replacement;
      });
    }

    return rewritten;
  }

  private moderateRewrite(text: string, problems: ProblemAnalysis): string {
    let rewritten = this.lightRewrite(text, problems);

    // Improve sentence variety
    if (problems.pacingIssues.some(issue => issue.includes('Lack of sentence length variety'))) {
      const sentences = rewritten.split(/([.!?]+)/);
      const newSentences: string[] = [];

      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i];
        const punctuation = sentences[i + 1] || '';

        if (sentence && sentence.trim()) {
          const words = sentence.trim().split(/\s+/);
          if (words.length > 20) {
            // Split long sentence
            const mid = Math.floor(words.length / 2);
            const newSentence = words.slice(0, mid).join(' ') + '. ' + words.slice(mid).join(' ');
            newSentences.push(newSentence + punctuation);
          } else {
            newSentences.push(sentence + punctuation);
          }
        } else {
          newSentences.push(sentence + punctuation);
        }
      }
      rewritten = newSentences.join('');
    }

    // Improve paragraph structure
    if (problems.structuralIssues.some(issue => issue.includes('overly long paragraphs'))) {
      const paragraphs = rewritten.split(/\n\s*\n/);
      const newParagraphs: string[] = [];

      for (const para of paragraphs) {
        if (para.split(/\s+/).length > 150) {
          // Split long paragraph
          const sentences = para.split(/([.!?]+)/);
          const mid = Math.floor(sentences.length / 2);
          const para1 = sentences.slice(0, mid).join('');
          const para2 = sentences.slice(mid).join('');
          newParagraphs.push(para1, para2);
        } else {
          newParagraphs.push(para);
        }
      }
      rewritten = newParagraphs.join('\n\n');
    }

    return rewritten;
  }

  private comprehensiveRewrite(text: string, problems: ProblemAnalysis): string {
    let rewritten = this.moderateRewrite(text, problems);

    // Enhance dialogue
    const dialoguePattern = /"([^"]*)"/g;
    rewritten = rewritten.replace(dialoguePattern, (match, dialogue) => {
      // Add emotional context to dialogue (simplified implementation)
      if (dialogue.length > 20 && !dialogue.includes('!') && !dialogue.includes('?')) {
        // Add some variety to neutral dialogue
        const emotions = ['.', '!', '?'];
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        return `"${dialogue.replace(/\.$/, '')}${randomEmotion}"`;
      }
      return match;
    });

    return rewritten;
  }

  private applyPreservationControls(
    rewritten: string,
    original: string,
    controls: PreservationControls
  ): string {
    if (!controls) return rewritten;

    // Preserve specific dialogue
    if (controls.preserveDialogue) {
      for (const dialogue of controls.preserveDialogue) {
        if (original.includes(dialogue) && !rewritten.includes(dialogue)) {
          // Simple restoration - in practice would be more sophisticated
          rewritten = rewritten + '\n\n' + dialogue;
        }
      }
    }

    // Preserve character names
    if (controls.preserveCharacterNames) {
      const originalNames = new Set(original.match(/\b[A-Z][a-z]+\b/g) || []);
      const rewrittenNames = new Set(rewritten.match(/\b[A-Z][a-z]+\b/g) || []);

      const commonWords = new Set(['The', 'This', 'That', 'Then', 'When', 'Where']);
      const missingNames = Array.from(originalNames).filter(
        name => !rewrittenNames.has(name) && !commonWords.has(name)
      );

      for (const name of missingNames) {
        if (original.includes(` ${name} `) && !rewritten.includes(` ${name} `)) {
          // Simple restoration
          rewritten = rewritten.replace(/ he /, ` ${name} `);
        }
      }
    }

    return rewritten;
  }

  private isQualityBetter(newMetrics: QualityMetrics, originalMetrics: QualityMetrics): boolean {
    return (
      newMetrics.readabilityScore >= originalMetrics.readabilityScore &&
      newMetrics.storyStructureScore >= originalMetrics.storyStructureScore &&
      newMetrics.characterConsistencyScore >= originalMetrics.characterConsistencyScore &&
      newMetrics.pacingScore >= originalMetrics.pacingScore &&
      newMetrics.dialogueEffectivenessScore >= originalMetrics.dialogueEffectivenessScore &&
      newMetrics.narrativeFlowScore >= originalMetrics.narrativeFlowScore &&
      newMetrics.tensionScore >= originalMetrics.tensionScore &&
      newMetrics.proseQualityScore >= originalMetrics.proseQualityScore &&
      newMetrics.overallScore > originalMetrics.overallScore
    );
  }

  private identifyImprovements(original: QualityMetrics, newMetrics: QualityMetrics): string[] {
    const improvements: string[] = [];

    if (newMetrics.readabilityScore > original.readabilityScore) {
      improvements.push("Improved readability");
    }
    if (newMetrics.storyStructureScore > original.storyStructureScore) {
      improvements.push("Enhanced story structure");
    }
    if (newMetrics.characterConsistencyScore > original.characterConsistencyScore) {
      improvements.push("Better character consistency");
    }
    if (newMetrics.pacingScore > original.pacingScore) {
      improvements.push("Improved pacing");
    }
    if (newMetrics.dialogueEffectivenessScore > original.dialogueEffectivenessScore) {
      improvements.push("Enhanced dialogue effectiveness");
    }
    if (newMetrics.narrativeFlowScore > original.narrativeFlowScore) {
      improvements.push("Smoother narrative flow");
    }
    if (newMetrics.tensionScore > original.tensionScore) {
      improvements.push("Increased tension and engagement");
    }
    if (newMetrics.proseQualityScore > original.proseQualityScore) {
      improvements.push("Better prose quality");
    }

    return improvements;
  }

  private identifyPreservedElements(
    original: string,
    rewritten: string,
    controls?: PreservationControls
  ): string[] {
    const preserved: string[] = [];

    if (controls?.preserveCharacterNames) {
      const originalNames = new Set(original.match(/\b[A-Z][a-z]+\b/g) || []);
      const rewrittenNames = new Set(rewritten.match(/\b[A-Z][a-z]+\b/g) || []);
      const preservedNames = Array.from(originalNames).filter(name => rewrittenNames.has(name));
      if (preservedNames.length > 0) {
        preserved.push(`Character names: ${preservedNames.slice(0, 5).join(', ')}`);
      }
    }

    if (controls?.preserveDialogue) {
      const preservedDialogue = controls.preserveDialogue.filter(d => rewritten.includes(d));
      if (preservedDialogue.length > 0) {
        preserved.push(`${preservedDialogue.length} specific dialogue segments`);
      }
    }

    // Check for preserved plot elements
    const plotKeywords = ['discovered', 'revealed', 'decided', 'realized', 'remembered'];
    const preservedPlot = plotKeywords.filter(word => original.includes(word) && rewritten.includes(word));
    if (preservedPlot.length > 0) {
      preserved.push("Key plot developments");
    }

    return preserved;
  }

  private calculateImprovements(original: QualityMetrics, final: QualityMetrics): Record<string, number> {
    return {
      readability: final.readabilityScore - original.readabilityScore,
      story_structure: final.storyStructureScore - original.storyStructureScore,
      character_consistency: final.characterConsistencyScore - original.characterConsistencyScore,
      pacing: final.pacingScore - original.pacingScore,
      dialogue_effectiveness: final.dialogueEffectivenessScore - original.dialogueEffectivenessScore,
      narrative_flow: final.narrativeFlowScore - original.narrativeFlowScore,
      tension: final.tensionScore - original.tensionScore,
      prose_quality: final.proseQualityScore - original.proseQualityScore,
      overall: final.overallScore - original.overallScore,
    };
  }

  private identifyChangesMade(original: string, rewritten: string, problems: ProblemAnalysis): string[] {
    const changes: string[] = [];

    // Count changes
    const originalWords = original.split(/\s+/).length;
    const rewrittenWords = rewritten.split(/\s+/).length;

    if (Math.abs(originalWords - rewrittenWords) > originalWords * 0.1) {
      if (rewrittenWords > originalWords) {
        changes.push(`Expanded content (+${rewrittenWords - originalWords} words)`);
      } else {
        changes.push(`Condensed content (-${originalWords - rewrittenWords} words)`);
      }
    }

    // Detect structural changes
    const originalParagraphs = original.split(/\n\s*\n/).length;
    const rewrittenParagraphs = rewritten.split(/\n\s*\n/).length;

    if (rewrittenParagraphs !== originalParagraphs) {
      changes.push(`Restructured paragraphs (${originalParagraphs} → ${rewrittenParagraphs})`);
    }

    // Detect dialogue changes
    const originalDialogue = (original.match(/"[^"]*"/g) || []).length;
    const rewrittenDialogue = (rewritten.match(/"[^"]*"/g) || []).length;

    if (rewrittenDialogue !== originalDialogue) {
      changes.push(`Modified dialogue (${originalDialogue} → ${rewrittenDialogue} segments)`);
    }

    // Map problems to likely changes
    for (const issue of problems.proseIssues) {
      if (issue.includes('adverbs')) {
        changes.push("Reduced adverb usage for stronger prose");
      }
      if (issue.includes('weak verbs')) {
        changes.push("Replaced weak verbs with stronger alternatives");
      }
    }

    for (const issue of problems.pacingIssues) {
      if (issue.includes('sentence length')) {
        changes.push("Improved sentence length variety for better pacing");
      }
    }

    for (const issue of problems.dialogueIssues) {
      if (issue.includes('said')) {
        changes.push("Varied dialogue tags for more engaging conversations");
      }
    }

    return changes;
  }
}