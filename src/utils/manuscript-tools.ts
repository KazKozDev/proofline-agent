/**
 * Essential Core Tools for Manuscript Editing
 * Focused, efficient tools for large manuscript processing
 */

// --- TYPES ---

export interface ChapterBoundary {
  chapterNumber: number;
  startPosition: number;
  endPosition: number;
  title?: string;
  confidence: number;
  wordCount: number;
}

export interface CharacterAppearance {
  name: string;
  chapters: number[];
  firstMention: number;
  totalMentions: number;
}

export interface ManuscriptIndex {
  chapters: ChapterBoundary[];
  characters: CharacterAppearance[];
  totalWordCount: number;
  averageChapterLength: number;
}

export interface CharacterProfile {
  name: string;
  traits: string[];
  speechPatterns: string[];
  behaviorRules: string[];
  emotionalState: string;
  knowledgeState: string[];
  lastChapterAppearance: number;
}

export interface ChapterContext {
  targetChapter: ChapterBoundary;
  previousChapter?: ChapterBoundary;
  nextChapter?: ChapterBoundary;
  activeCharacters: CharacterProfile[];
  plotContinuity: string[];
}

export interface SequenceValidationResult {
  isValid: boolean;
  issues: string[];
  characterInconsistencies: string[];
  timelineIssues: string[];
  emotionalJumps: string[];
  knowledgeGaps: string[];
}

// --- NEW INTERFACES FOR WHOLE-BOOK EDITING ---

export interface PlotThread {
  id: string;
  name: string;
  startChapter: number;
  endChapter: number;
  keyEvents: PlotEvent[];
  characters: string[];
  status: 'active' | 'resolved' | 'abandoned';
}

export interface PlotEvent {
  chapter: number;
  position: number;
  description: string;
  importance: 'major' | 'minor' | 'setup' | 'payoff';
  relatedThreads: string[];
}

export interface BookStructure {
  index: ManuscriptIndex;
  plotThreads: PlotThread[];
  characterArcs: CharacterArc[];
  pacing: PacingAnalysis;
  thematicElements: ThematicElement[];
}

export interface CharacterArc {
  character: string;
  startState: string;
  endState: string;
  milestones: ArcMilestone[];
  consistency: number; // 0-1 score
}

export interface ArcMilestone {
  chapter: number;
  event: string;
  growth: string;
  emotionalState: string;
}

export interface PacingAnalysis {
  overall: 'slow' | 'moderate' | 'fast' | 'uneven';
  chapterPacing: ChapterPacing[];
  tensionCurve: number[]; // 0-1 per chapter
  actionToDialogueRatio: number;
}

export interface ChapterPacing {
  chapterNumber: number;
  pace: 'slow' | 'moderate' | 'fast';
  wordCount: number;
  dialoguePercentage: number;
  actionDensity: number;
}

export interface ThematicElement {
  theme: string;
  chapters: number[];
  strength: number; // 0-1
  evolution: string[];
}

export interface WholeBookRewriteOptions {
  targetQuality: number; // 0-1
  preserveStructure: boolean;
  enhancePlotConsistency: boolean;
  improveCharacterArcs: boolean;
  balancePacing: boolean;
  strengthenThemes: string[];
  preserveDialogue: string[];
  preservePlotPoints: string[];
}

export interface WholeBookRewriteResult {
  success: boolean;
  rewrittenManuscript?: string;
  originalQuality: number;
  newQuality: number;
  chaptersModified: number[];
  changesSummary: string[];
  plotThreadsImproved: string[];
  characterArcsEnhanced: string[];
  error?: string;
}

// --- MANUSCRIPT INDEXER TOOL ---

export class ManuscriptIndexer {
  private chapterPatterns = [
    /^Chapter\s+\d+/i,
    /^CHAPTER\s+\d+/i,
    /^\d+\./,
    /^Part\s+\d+/i,
    /^PART\s+\d+/i,
    /^\*\s*\*\s*\*/,
    /^-{3,}/,
    /^#{1,3}\s/, // Markdown headers
  ];

  createIndex(manuscript: string): ManuscriptIndex {
    const chapters = this.detectChapters(manuscript);
    const characters = this.indexCharacters(manuscript, chapters);

    const totalWordCount = manuscript.split(/\s+/).length;
    const averageChapterLength = chapters.length > 0
      ? Math.round(totalWordCount / chapters.length)
      : 0;

    return {
      chapters,
      characters,
      totalWordCount,
      averageChapterLength,
    };
  }

  private detectChapters(manuscript: string): ChapterBoundary[] {
    const chapters: ChapterBoundary[] = [];
    const lines = manuscript.split('\n');
    let currentChapter = 1;

    for (let i = 0; i < lines.length; i++) {
      const lineStripped = lines[i].trim();

      for (const pattern of this.chapterPatterns) {
        if (pattern.test(lineStripped)) {
          // Update end position of previous chapter
          if (chapters.length > 0) {
            chapters[chapters.length - 1].endPosition = this.getPositionAtLine(manuscript, i);
          }

          const title = this.extractChapterTitle(lineStripped);
          const startPos = this.getPositionAtLine(manuscript, i);
          const confidence = this.calculateConfidence(lineStripped, i, lines);

          const chapter: ChapterBoundary = {
            chapterNumber: currentChapter,
            startPosition: startPos,
            endPosition: manuscript.length, // Will be updated
            title,
            confidence,
            wordCount: 0, // Will be calculated
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
        title: 'Full Manuscript',
        confidence: 1.0,
        wordCount: manuscript.split(/\s+/).length,
      });
    } else {
      // Calculate word counts for each chapter
      chapters.forEach(chapter => {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        chapter.wordCount = chapterText.split(/\s+/).length;
      });
    }

    return chapters;
  }

  private getPositionAtLine(text: string, lineNumber: number): number {
    const lines = text.split('\n');
    return lines.slice(0, lineNumber).reduce((acc, line) => acc + line.length + 1, 0);
  }

  private extractChapterTitle(line: string): string | undefined {
    let title = line.replace(/^(Chapter|CHAPTER|Part|PART)\s*\d*:?\s*/i, '');
    title = title.replace(/^\d+\.?\s*/, '');
    title = title.replace(/^[*-]+\s*/, '');
    title = title.replace(/^#+\s*/, '');
    return title.trim() || undefined;
  }

  private calculateConfidence(line: string, lineIndex: number, allLines: string[]): number {
    let confidence = 0.5;

    if (/^(Chapter|CHAPTER)\s+\d+/.test(line)) {
      confidence += 0.4;
    }

    if (lineIndex > 0 && !allLines[lineIndex - 1].trim()) {
      confidence += 0.1;
    }
    if (lineIndex < allLines.length - 1 && !allLines[lineIndex + 1].trim()) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private indexCharacters(manuscript: string, chapters: ChapterBoundary[]): CharacterAppearance[] {
    // Extract potential character names (proper nouns)
    const characterCandidates = new Set<string>();
    const words = manuscript.match(/\b[A-Z][a-z]+\b/g) || [];

    // Filter out common non-character words
    const commonWords = new Set([
      'The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Who', 'How',
      'But', 'And', 'Or', 'If', 'So', 'Yet', 'For', 'Nor', 'At', 'By', 'In',
      'On', 'To', 'Up', 'As', 'It', 'He', 'She', 'We', 'They', 'I', 'You',
      'Chapter', 'Part', 'Book', 'Page', 'Mr', 'Mrs', 'Ms', 'Dr', 'Professor'
    ]);

    // Count occurrences and filter for likely character names
    const nameCounts: Record<string, number> = {};
    words.forEach(word => {
      if (!commonWords.has(word) && word.length > 2) {
        nameCounts[word] = (nameCounts[word] || 0) + 1;
      }
    });

    // Keep names that appear at least 3 times (likely characters)
    const likelyCharacters = Object.entries(nameCounts)
      .filter(([_, count]) => count >= 3)
      .map(([name]) => name);

    // Map characters to chapters
    const characterAppearances: CharacterAppearance[] = [];

    likelyCharacters.forEach(name => {
      const appearances: number[] = [];
      let firstMention = -1;
      let totalMentions = 0;

      chapters.forEach(chapter => {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const mentions = (chapterText.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;

        if (mentions > 0) {
          appearances.push(chapter.chapterNumber);
          totalMentions += mentions;

          if (firstMention === -1) {
            firstMention = chapter.chapterNumber;
          }
        }
      });

      if (appearances.length > 0) {
        characterAppearances.push({
          name,
          chapters: appearances,
          firstMention,
          totalMentions,
        });
      }
    });

    return characterAppearances.sort((a, b) => b.totalMentions - a.totalMentions);
  }
}

// --- ENHANCED CONTEXT CACHE TOOL ---

export class ContextCache {
  private cache: Map<string, any> = new Map();
  private readonly maxCacheSize = 10; // Keep last 10 contexts
  private structureAnalyzer: BookStructureAnalyzer;

  constructor() {
    this.structureAnalyzer = new BookStructureAnalyzer();
  }

  loadContext(manuscript: string, targetChapter: number, manuscriptIndex: ManuscriptIndex): ChapterContext {
    const cacheKey = `chapter_${targetChapter}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const target = manuscriptIndex.chapters.find(c => c.chapterNumber === targetChapter);
    if (!target) {
      throw new Error(`Chapter ${targetChapter} not found`);
    }

    const previous = manuscriptIndex.chapters.find(c => c.chapterNumber === targetChapter - 1);
    const next = manuscriptIndex.chapters.find(c => c.chapterNumber === targetChapter + 1);

    // Enhanced: Get wider context range for better inter-chapter relationships
    const contextRange = 2; // Look 2 chapters back and forward
    const relevantChapters = [];
    for (let i = targetChapter - contextRange; i <= targetChapter + contextRange; i++) {
      if (i > 0 && i <= manuscriptIndex.chapters.length) {
        relevantChapters.push(i);
      }
    }

    const activeCharacters = manuscriptIndex.characters
      .filter(char => char.chapters.some(ch => relevantChapters.includes(ch)))
      .map(char => this.buildEnhancedCharacterProfile(char, manuscript, manuscriptIndex, targetChapter));

    const context: ChapterContext = {
      targetChapter: target,
      previousChapter: previous,
      nextChapter: next,
      activeCharacters,
      plotContinuity: this.extractEnhancedPlotContinuity(manuscript, target, previous, next, manuscriptIndex),
    };

    // Cache management
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, context);
    return context;
  }

  // Enhanced method for better character profiling
  private buildEnhancedCharacterProfile(
    char: CharacterAppearance,
    manuscript: string,
    index: ManuscriptIndex,
    currentChapter: number
  ): CharacterProfile {
    const lastAppearance = Math.max(...char.chapters);

    // Analyze character's recent emotional trajectory
    const recentChapters = char.chapters.filter(ch => Math.abs(ch - currentChapter) <= 2);
    const emotionalTrajectory = this.analyzeEmotionalTrajectory(char, manuscript, index, recentChapters);

    return {
      name: char.name,
      traits: this.extractTraitsFromContext(char, manuscript, index, recentChapters),
      speechPatterns: this.extractSpeechPatternsFromContext(char, manuscript, recentChapters),
      behaviorRules: this.extractBehaviorRulesFromContext(char, manuscript, recentChapters),
      emotionalState: emotionalTrajectory.current,
      knowledgeState: this.extractKnowledgeStateFromContext(char, manuscript, index, currentChapter),
      lastChapterAppearance: lastAppearance,
    };
  }

  private analyzeEmotionalTrajectory(
    char: CharacterAppearance,
    manuscript: string,
    index: ManuscriptIndex,
    recentChapters: number[]
  ): { current: string; trend: string } {
    const emotions = ['happy', 'sad', 'angry', 'afraid', 'calm', 'excited', 'worried'];
    const emotionalData: { chapter: number; emotions: string[] }[] = [];

    recentChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const foundEmotions = emotions.filter(emotion => {
          const regex = new RegExp(`${char.name}[^.!?]*\\b${emotion}\\b`, 'gi');
          return regex.test(chapterText);
        });
        if (foundEmotions.length > 0) {
          emotionalData.push({ chapter: chapterNum, emotions: foundEmotions });
        }
      }
    });

    if (emotionalData.length === 0) return { current: 'neutral', trend: 'stable' };

    const latest = emotionalData[emotionalData.length - 1];
    return {
      current: latest.emotions[0] || 'neutral',
      trend: emotionalData.length > 1 ? 'changing' : 'stable'
    };
  }

  private extractTraitsFromContext(
    char: CharacterAppearance,
    manuscript: string,
    index: ManuscriptIndex,
    chapters: number[]
  ): string[] {
    const traits: string[] = [];
    const traitWords = [
      'brave', 'cowardly', 'wise', 'foolish', 'kind', 'cruel', 'honest', 'dishonest',
      'patient', 'impatient', 'strong', 'weak', 'confident', 'insecure'
    ];

    chapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        traitWords.forEach(trait => {
          const regex = new RegExp(`${char.name}[^.!?]*\\b${trait}\\b`, 'gi');
          if (regex.test(chapterText) && !traits.includes(trait)) {
            traits.push(trait);
          }
        });
      }
    });

    return traits;
  }

  private extractSpeechPatternsFromContext(
    char: CharacterAppearance,
    manuscript: string,
    chapters: number[]
  ): string[] {
    const patterns: string[] = [];

    // Look for dialogue patterns in recent chapters
    const dialogueRegex = new RegExp(`"([^"]+),"?\\s*${char.name}\\s+(said|asked|replied)`, 'gi');
    let allDialogue = '';

    chapters.forEach(chapterNum => {
      // This is simplified - in reality we'd need chapter boundaries
      const matches = manuscript.match(dialogueRegex) || [];
      allDialogue += matches.join(' ');
    });

    if (allDialogue.length > 0) {
      if ((allDialogue.match(/\?/g) || []).length > 3) patterns.push('inquisitive speaker');
      if (allDialogue.includes("'")) patterns.push('uses contractions');
      if ((allDialogue.match(/!/g) || []).length > 2) patterns.push('emphatic speaker');
    }

    return patterns;
  }

  private extractBehaviorRulesFromContext(
    char: CharacterAppearance,
    manuscript: string,
    chapters: number[]
  ): string[] {
    const rules: string[] = [];
    const behaviorKeywords = ['always', 'never', 'usually', 'rarely', 'often'];

    chapters.forEach(chapterNum => {
      behaviorKeywords.forEach(keyword => {
        const regex = new RegExp(`${char.name}\\s+${keyword}\\s+([^.!?]+)[.!?]`, 'gi');
        const matches = manuscript.match(regex);
        if (matches) {
          rules.push(...matches.map(m => m.trim()));
        }
      });
    });

    return [...new Set(rules)]; // Remove duplicates
  }

  private extractKnowledgeStateFromContext(
    char: CharacterAppearance,
    manuscript: string,
    index: ManuscriptIndex,
    currentChapter: number
  ): string[] {
    const knowledge: string[] = [];
    const knowledgeVerbs = ['knew', 'learned', 'discovered', 'realized', 'understood', 'found out'];

    // Look at chapters up to current chapter
    const relevantChapters = char.chapters.filter(ch => ch <= currentChapter);

    relevantChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        knowledgeVerbs.forEach(verb => {
          const regex = new RegExp(`${char.name}\\s+${verb}\\s+([^.!?]+)[.!?]`, 'gi');
          const matches = chapterText.match(regex);
          if (matches) {
            knowledge.push(...matches.map(m => `Chapter ${chapterNum}: ${m.trim()}`));
          }
        });
      }
    });

    return knowledge;
  }

  private buildCharacterProfile(
    char: CharacterAppearance,
    manuscript: string,
    index: ManuscriptIndex
  ): CharacterProfile {
    // Basic profile extraction - simplified for efficiency
    const lastAppearance = Math.max(...char.chapters);

    return {
      name: char.name,
      traits: [], // Would be extracted through NLP
      speechPatterns: [], // Would analyze dialogue
      behaviorRules: [], // Would track consistent behaviors
      emotionalState: 'neutral', // Would track from context
      knowledgeState: [], // What character knows
      lastChapterAppearance: lastAppearance,
    };
  }

  // Enhanced plot continuity extraction
  private extractEnhancedPlotContinuity(
    manuscript: string,
    target: ChapterBoundary,
    previous?: ChapterBoundary,
    next?: ChapterBoundary,
    index?: ManuscriptIndex
  ): string[] {
    const continuityItems: string[] = [];

    if (previous) {
      const prevText = manuscript.slice(previous.startPosition, previous.endPosition);
      const targetText = manuscript.slice(target.startPosition, target.endPosition);

      // Look for connecting elements
      const prevLastSentences = prevText.split(/[.!?]+/).slice(-3);
      const targetFirstSentences = targetText.split(/[.!?]+/).slice(0, 3);

      // Enhanced continuity tracking
      prevLastSentences.forEach(sentence => {
        if (sentence.trim()) {
          continuityItems.push(`Previous chapter ended with: "${sentence.trim()}"`);
        }
      });

      // Check for unresolved tensions or cliffhangers
      const tensionWords = ['sudden', 'unexpected', 'shocked', 'realized', 'discovered'];
      tensionWords.forEach(word => {
        if (prevText.toLowerCase().includes(word)) {
          continuityItems.push(`Tension element from previous chapter: ${word}`);
        }
      });

      // Look for repeated themes or motifs
      const themeWords = ['freedom', 'loyalty', 'betrayal', 'love', 'power', 'sacrifice'];
      themeWords.forEach(theme => {
        if (prevText.toLowerCase().includes(theme) && targetText.toLowerCase().includes(theme)) {
          continuityItems.push(`Continuing theme: ${theme}`);
        }
      });
    }

    if (next && index) {
      // Look ahead for foreshadowing opportunities
      const nextText = manuscript.slice(next.startPosition, next.endPosition);
      const foreshadowWords = ['destiny', 'fate', 'future', 'prophecy', 'warning'];

      foreshadowWords.forEach(word => {
        if (nextText.toLowerCase().includes(word)) {
          continuityItems.push(`Foreshadowing opportunity: ${word} appears in next chapter`);
        }
      });
    }

    return continuityItems;
  }

  private extractPlotContinuity(
    manuscript: string,
    target: ChapterBoundary,
    previous?: ChapterBoundary
  ): string[] {
    const continuityItems: string[] = [];

    if (previous) {
      const prevText = manuscript.slice(previous.startPosition, previous.endPosition);
      const targetText = manuscript.slice(target.startPosition, target.endPosition);

      // Look for connecting elements
      const prevLastSentences = prevText.split(/[.!?]+/).slice(-3);
      const targetFirstSentences = targetText.split(/[.!?]+/).slice(0, 3);

      // Simple continuity tracking
      prevLastSentences.forEach(sentence => {
        if (sentence.trim()) {
          continuityItems.push(`Previous chapter ended with: "${sentence.trim()}"`);
        }
      });
    }

    return continuityItems;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// --- CHARACTER PROFILE BUILDER TOOL ---

export class CharacterProfileBuilder {
  buildProfile(
    characterName: string,
    manuscript: string,
    manuscriptIndex: ManuscriptIndex
  ): CharacterProfile {
    const character = manuscriptIndex.characters.find(c => c.name === characterName);
    if (!character) {
      throw new Error(`Character ${characterName} not found in manuscript`);
    }

    const profile: CharacterProfile = {
      name: characterName,
      traits: this.extractTraits(characterName, manuscript),
      speechPatterns: this.extractSpeechPatterns(characterName, manuscript),
      behaviorRules: this.extractBehaviorRules(characterName, manuscript),
      emotionalState: this.determineEmotionalState(characterName, manuscript),
      knowledgeState: this.extractKnowledgeState(characterName, manuscript),
      lastChapterAppearance: Math.max(...character.chapters),
    };

    return profile;
  }

  private extractTraits(characterName: string, manuscript: string): string[] {
    const traits: string[] = [];

    // Look for descriptive patterns near character name
    const namePattern = new RegExp(`${characterName}[^.!?]*[.!?]`, 'gi');
    const mentions = manuscript.match(namePattern) || [];

    // Simple trait extraction
    const traitWords = [
      'tall', 'short', 'kind', 'cruel', 'smart', 'wise', 'young', 'old',
      'strong', 'weak', 'beautiful', 'ugly', 'brave', 'cowardly', 'honest',
      'dishonest', 'patient', 'impatient', 'calm', 'nervous', 'confident'
    ];

    mentions.forEach(mention => {
      traitWords.forEach(trait => {
        if (mention.toLowerCase().includes(trait)) {
          traits.push(trait);
        }
      });
    });

    return [...new Set(traits)]; // Remove duplicates
  }

  private extractSpeechPatterns(characterName: string, manuscript: string): string[] {
    const patterns: string[] = [];

    // Find dialogue attributed to this character
    const dialoguePattern = new RegExp(`"([^"]+),"?\\s*${characterName}\\s+(said|asked|replied|whispered|shouted)`, 'gi');
    const matches = manuscript.match(dialoguePattern) || [];

    if (matches.length > 0) {
      // Analyze common speech patterns
      const allDialogue = matches.join(' ').toLowerCase();

      if (allDialogue.includes(' aye ') || allDialogue.includes(' yea ')) {
        patterns.push('uses archaic affirmatives');
      }
      if (allDialogue.includes("'") && allDialogue.includes("n't")) {
        patterns.push('uses contractions frequently');
      }
      if ((allDialogue.match(/\?/g) || []).length > matches.length * 0.3) {
        patterns.push('asks many questions');
      }
    }

    return patterns;
  }

  private extractBehaviorRules(characterName: string, manuscript: string): string[] {
    const rules: string[] = [];

    // Look for consistent behavioral patterns
    const actionPattern = new RegExp(`${characterName}\\s+(always|never|often|rarely)\\s+([^.!?]+)[.!?]`, 'gi');
    const behaviorMatches = manuscript.match(actionPattern) || [];

    behaviorMatches.forEach(match => {
      rules.push(match.trim());
    });

    return rules;
  }

  private determineEmotionalState(characterName: string, manuscript: string): string {
    // Simple emotion detection from recent context
    const emotionWords = {
      happy: ['happy', 'joy', 'smile', 'laugh', 'cheerful', 'pleased'],
      sad: ['sad', 'cry', 'weep', 'sorrow', 'grief', 'tears'],
      angry: ['angry', 'rage', 'fury', 'mad', 'furious', 'irritated'],
      afraid: ['afraid', 'fear', 'scared', 'terrified', 'panic', 'worried'],
      calm: ['calm', 'peaceful', 'serene', 'relaxed', 'composed']
    };

    const recentMentions = manuscript.match(new RegExp(`${characterName}[^.!?]{0,100}[.!?]`, 'gi')) || [];
    const recentText = recentMentions.slice(-5).join(' ').toLowerCase();

    for (const [emotion, words] of Object.entries(emotionWords)) {
      if (words.some(word => recentText.includes(word))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private extractKnowledgeState(characterName: string, manuscript: string): string[] {
    const knowledge: string[] = [];

    // Look for what the character knows or learns
    const knowledgePatterns = [
      new RegExp(`${characterName}\\s+(knew|knows|learned|discovered|realized|found out)\\s+([^.!?]+)[.!?]`, 'gi'),
      new RegExp(`${characterName}\\s+(was told|heard|saw|witnessed)\\s+([^.!?]+)[.!?]`, 'gi')
    ];

    knowledgePatterns.forEach(pattern => {
      const matches = manuscript.match(pattern) || [];
      matches.forEach(match => {
        knowledge.push(match.trim());
      });
    });

    return knowledge;
  }
}

// --- CHAPTER REWRITER TOOL ---

export interface RewriteResult {
  success: boolean;
  rewrittenText?: string;
  originalQuality: number;
  newQuality: number;
  changesSummary: string[];
  error?: string;
}

export class ChapterRewriter {
  private structureAnalyzer: BookStructureAnalyzer;
  private globalEditor: GlobalManuscriptEditor;

  constructor() {
    this.structureAnalyzer = new BookStructureAnalyzer();
    this.globalEditor = new GlobalManuscriptEditor();
  }

  // Enhanced method for whole book rewriting
  rewriteWholeBook(
    manuscript: string,
    manuscriptIndex: ManuscriptIndex,
    options: WholeBookRewriteOptions
  ): WholeBookRewriteResult {
    try {
      // Analyze book structure
      const bookStructure = this.structureAnalyzer.analyzeStructure(manuscript, manuscriptIndex);

      // Calculate original quality
      const originalQuality = this.assessBookQuality(manuscript, bookStructure);

      let result = manuscript;
      const changesSummary: string[] = [];
      const chaptersModified: number[] = [];
      const plotThreadsImproved: string[] = [];
      const characterArcsEnhanced: string[] = [];

      // Global character consistency
      if (options.improveCharacterArcs) {
        bookStructure.characterArcs.forEach(arc => {
          if (arc.consistency < 0.7) {
            const { manuscript: improved, improvements } = this.improveCharacterArc(result, arc, bookStructure);
            result = improved;
            characterArcsEnhanced.push(arc.character);
            changesSummary.push(...improvements);
          }
        });
      }

      // Plot consistency improvements
      if (options.enhancePlotConsistency) {
        const { manuscript: improved, improvements } = this.globalEditor.enhancePlotConsistency(result, bookStructure);
        result = improved;
        plotThreadsImproved.push(...bookStructure.plotThreads.map(t => t.name));
        changesSummary.push(...improvements);
      }

      // Pacing adjustments
      if (options.balancePacing) {
        const { manuscript: improved, changes } = this.balanceBookPacing(result, bookStructure);
        result = improved;
        changesSummary.push(...changes);
      }

      // Chapter-by-chapter improvements if needed
      manuscriptIndex.chapters.forEach(chapter => {
        const chapterQuality = this.assessChapterQuality(result, chapter);
        if (chapterQuality < options.targetQuality) {
          const contextCache = new ContextCache();
          const chapterResult = this.rewrite(
            result,
            chapter.chapterNumber,
            chapterQuality < 0.5 ? 'comprehensive' : 'moderate',
            options.preserveDialogue,
            manuscriptIndex,
            contextCache
          );

          if (chapterResult.success && chapterResult.newQuality > chapterQuality) {
            // Update the manuscript with improved chapter
            const startPos = chapter.startPosition;
            const endPos = chapter.endPosition;
            result = result.slice(0, startPos) + chapterResult.rewrittenText + result.slice(endPos);
            chaptersModified.push(chapter.chapterNumber);
            changesSummary.push(...chapterResult.changesSummary.map(c => `Chapter ${chapter.chapterNumber}: ${c}`));
          }
        }
      });

      // Theme strengthening
      if (options.strengthenThemes.length > 0) {
        const { manuscript: improved, changes } = this.strengthenThemes(result, bookStructure, options.strengthenThemes);
        result = improved;
        changesSummary.push(...changes);
      }

      // Structure preservation check
      if (options.preserveStructure) {
        result = this.preserveBookStructure(result, manuscript, bookStructure);
      }

      // Calculate final quality
      const finalStructure = this.structureAnalyzer.analyzeStructure(result, manuscriptIndex);
      const newQuality = this.assessBookQuality(result, finalStructure);

      return {
        success: true,
        rewrittenManuscript: result,
        originalQuality,
        newQuality,
        chaptersModified,
        changesSummary,
        plotThreadsImproved,
        characterArcsEnhanced
      };

    } catch (error) {
      return {
        success: false,
        originalQuality: 0,
        newQuality: 0,
        chaptersModified: [],
        changesSummary: [],
        plotThreadsImproved: [],
        characterArcsEnhanced: [],
        error: (error as Error).message
      };
    }
  }

  private assessBookQuality(manuscript: string, structure: BookStructure): number {
    let score = 0;

    // Plot consistency (25% of score)
    const plotScore = structure.plotThreads.filter(t => t.status === 'resolved').length /
                      Math.max(1, structure.plotThreads.length);
    score += plotScore * 0.25;

    // Character arc consistency (25% of score)
    const arcScore = structure.characterArcs.reduce((sum, arc) => sum + arc.consistency, 0) /
                     Math.max(1, structure.characterArcs.length);
    score += arcScore * 0.25;

    // Pacing quality (25% of score)
    const pacingScore = structure.pacing.overall === 'uneven' ? 0.3 :
                       structure.pacing.overall === 'moderate' ? 1.0 : 0.7;
    score += pacingScore * 0.25;

    // Overall chapter quality (25% of score)
    const chapterQualities = structure.index.chapters.map(chapter => {
      const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
      return this.assessQuality(chapterText);
    });
    const avgChapterQuality = chapterQualities.reduce((sum, q) => sum + q, 0) / chapterQualities.length;
    score += avgChapterQuality * 0.25;

    return Math.min(1.0, score);
  }

  private assessChapterQuality(manuscript: string, chapter: ChapterBoundary): number {
    const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
    return this.assessQuality(chapterText);
  }

  private improveCharacterArc(
    manuscript: string,
    arc: CharacterArc,
    structure: BookStructure
  ): { manuscript: string; improvements: string[] } {
    let result = manuscript;
    const improvements: string[] = [];

    // Add missing character development if arc lacks milestones
    if (arc.milestones.length < 2) {
      const characterChapters = structure.index.characters
        .find(c => c.name === arc.character)?.chapters || [];

      if (characterChapters.length >= 2) {
        const midChapter = characterChapters[Math.floor(characterChapters.length / 2)];
        const chapter = structure.index.chapters.find(c => c.chapterNumber === midChapter);

        if (chapter) {
          const insertion = `\n\n${arc.character} paused, reflecting on how much had changed since this journey began.`;
          const insertPoint = chapter.endPosition - 100; // Near end of chapter
          result = result.slice(0, insertPoint) + insertion + result.slice(insertPoint);
          improvements.push(`Added character development moment for ${arc.character} in Chapter ${midChapter}`);
        }
      }
    }

    return { manuscript: result, improvements };
  }

  private balanceBookPacing(manuscript: string, structure: BookStructure): { manuscript: string; changes: string[] } {
    let result = manuscript;
    const changes: string[] = [];

    // Identify pacing issues
    const fastChapters = structure.pacing.chapterPacing.filter(p => p.pace === 'fast');
    const slowChapters = structure.pacing.chapterPacing.filter(p => p.pace === 'slow');

    // Balance by adjusting extreme chapters
    if (fastChapters.length > slowChapters.length * 2) {
      // Too many fast chapters, slow some down
      fastChapters.slice(0, 2).forEach(fastChapter => {
        const chapter = structure.index.chapters.find(c => c.chapterNumber === fastChapter.chapterNumber);
        if (chapter) {
          const chapterText = result.slice(chapter.startPosition, chapter.endPosition);
          const slowerText = this.addReflectiveMoments(chapterText);
          result = result.slice(0, chapter.startPosition) + slowerText + result.slice(chapter.endPosition);
          changes.push(`Added reflective moments to Chapter ${fastChapter.chapterNumber} to balance pacing`);
        }
      });
    }

    return { manuscript: result, changes };
  }

  private addReflectiveMoments(text: string): string {
    const paragraphs = text.split('\n\n');
    const reflectivePhrases = [
      '\n\nThere was a moment of quiet contemplation.',
      '\n\nThe weight of recent events settled in.',
      '\n\nTime seemed to slow as the implications became clear.'
    ];

    // Add reflective moments after action-heavy paragraphs
    for (let i = 1; i < paragraphs.length; i++) {
      const prevParagraph = paragraphs[i - 1];
      const actionWords = ['ran', 'jumped', 'fought', 'rushed', 'dashed'];

      if (actionWords.some(word => prevParagraph.toLowerCase().includes(word))) {
        const reflection = reflectivePhrases[Math.floor(Math.random() * reflectivePhrases.length)];
        paragraphs[i] = reflection + '\n\n' + paragraphs[i];
        break; // Only add one per chapter
      }
    }

    return paragraphs.join('\n\n');
  }

  private strengthenThemes(
    manuscript: string,
    structure: BookStructure,
    targetThemes: string[]
  ): { manuscript: string; changes: string[] } {
    let result = manuscript;
    const changes: string[] = [];

    targetThemes.forEach(targetTheme => {
      const themeElement = structure.thematicElements.find(t => t.theme === targetTheme);

      if (!themeElement || themeElement.strength < 0.5) {
        // Theme is weak or missing, strengthen it
        const chaptersToEnhance = themeElement?.chapters.slice(0, 2) || [1, Math.floor(structure.index.chapters.length / 2)];

        chaptersToEnhance.forEach(chapterNum => {
          const chapter = structure.index.chapters.find(c => c.chapterNumber === chapterNum);
          if (chapter) {
            const enhancement = this.getThemeEnhancement(targetTheme);
            const insertPoint = chapter.endPosition - 50;
            result = result.slice(0, insertPoint) + enhancement + result.slice(insertPoint);
            changes.push(`Strengthened ${targetTheme} theme in Chapter ${chapterNum}`);
          }
        });
      }
    });

    return { manuscript: result, changes };
  }

  private getThemeEnhancement(theme: string): string {
    const enhancements = {
      'love': '\n\nThe bonds between them had grown stronger through shared trials.',
      'betrayal': '\n\nTrust, once broken, would not be easily mended.',
      'power': '\n\nWith great authority came the weight of consequence.',
      'growth': '\n\nEach challenge had forged them into someone new.',
      'justice': '\n\nThe right path was rarely the easy one.'
    };

    return enhancements[theme as keyof typeof enhancements] || '\n\nThe deeper meaning became clear.';
  }

  private preserveBookStructure(
    rewritten: string,
    _original: string,
    structure: BookStructure
  ): string {
    // Ensure chapter boundaries are preserved
    let result = rewritten;

    structure.index.chapters.forEach(chapter => {
      if (chapter.title) {
        // Ensure chapter titles are preserved
        const titlePattern = new RegExp(chapter.title, 'gi');
        if (!titlePattern.test(result)) {
          // Re-insert chapter title if missing
          const chapterStart = result.slice(chapter.startPosition, chapter.startPosition + 100);
          if (!chapterStart.includes(chapter.title)) {
            const insertion = `Chapter ${chapter.chapterNumber}: ${chapter.title}\n\n`;
            result = result.slice(0, chapter.startPosition) + insertion + result.slice(chapter.startPosition);
          }
        }
      }
    });

    return result;
  }

  rewrite(
    manuscript: string,
    chapterNumber: number,
    intensity: 'light' | 'moderate' | 'comprehensive',
    preserveDialogue: string[] = [],
    manuscriptIndex: ManuscriptIndex,
    contextCache: ContextCache
  ): RewriteResult {
    try {
      const targetChapter = manuscriptIndex.chapters.find(c => c.chapterNumber === chapterNumber);
      if (!targetChapter) {
        return {
          success: false,
          originalQuality: 0,
          newQuality: 0,
          changesSummary: [],
          error: `Chapter ${chapterNumber} not found`
        };
      }

      const originalText = manuscript.slice(targetChapter.startPosition, targetChapter.endPosition);
      const context = contextCache.loadContext(manuscript, chapterNumber, manuscriptIndex);

      // Calculate original quality score
      const originalQuality = this.assessQuality(originalText);

      // Perform rewriting based on intensity
      let rewrittenText: string;
      let changesSummary: string[] = [];

      switch (intensity) {
        case 'light':
          ({ text: rewrittenText, changes: changesSummary } = this.lightRewrite(originalText, preserveDialogue));
          break;
        case 'comprehensive':
          ({ text: rewrittenText, changes: changesSummary } = this.comprehensiveRewrite(originalText, context, preserveDialogue));
          break;
        default: // moderate
          ({ text: rewrittenText, changes: changesSummary } = this.moderateRewrite(originalText, context, preserveDialogue));
      }

      // Calculate new quality score
      const newQuality = this.assessQuality(rewrittenText);

      return {
        success: true,
        rewrittenText,
        originalQuality,
        newQuality,
        changesSummary
      };

    } catch (error) {
      return {
        success: false,
        originalQuality: 0,
        newQuality: 0,
        changesSummary: [],
        error: (error as Error).message
      };
    }
  }

  private assessQuality(text: string): number {
    let score = 0.5; // Base score

    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    if (words.length === 0 || sentences.length === 0) return 0;

    // Sentence length variety (good pacing)
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

    if (avgLength >= 10 && avgLength <= 20) {
      score += 0.2; // Good average sentence length
    }

    if (sentenceLengths.length > 3) {
      const variance = this.calculateVariance(sentenceLengths);
      if (variance > 20) {
        score += 0.1; // Good sentence variety
      }
    }

    // Word variety
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const varietyRatio = uniqueWords / words.length;
    if (varietyRatio > 0.5) {
      score += 0.1;
    }

    // Dialogue presence
    const dialogueCount = (text.match(/"/g) || []).length;
    if (dialogueCount > 0 && dialogueCount % 2 === 0) {
      score += 0.1; // Has balanced dialogue
    }

    // Paragraph structure
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paragraphs.length >= 3 && paragraphs.length <= 15) {
      score += 0.1; // Good paragraph count
    }

    return Math.min(1.0, score);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length <= 1) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private lightRewrite(text: string, _preserveDialogue: string[]): { text: string; changes: string[] } {
    let rewritten = text;
    const changes: string[] = [];

    // Fix excessive adverbs
    const adverbsBefore = (rewritten.match(/\b\w+ly\b/g) || []).length;
    rewritten = rewritten.replace(/\b\w+ly\s+/g, (match) => {
      return Math.random() > 0.3 ? '' : match; // Remove 70% of adverbs
    });
    rewritten = rewritten.replace(/\s+/g, ' '); // Clean up spaces

    const adverbsAfter = (rewritten.match(/\b\w+ly\b/g) || []).length;
    if (adverbsBefore > adverbsAfter) {
      changes.push(`Reduced excessive adverbs from ${adverbsBefore} to ${adverbsAfter}`);
    }

    // Vary dialogue tags
    const saidCount = (rewritten.match(/\ssaid\s/gi) || []).length;
    if (saidCount > 3) {
      const alternatives = ['replied', 'asked', 'whispered', 'murmured', 'stated'];
      let replacements = 0;

      alternatives.forEach(alt => {
        if (replacements < saidCount / 2) {
          rewritten = rewritten.replace(/\ssaid\s/i, ` ${alt} `);
          replacements++;
        }
      });

      if (replacements > 0) {
        changes.push(`Varied dialogue tags (replaced ${replacements} instances of "said")`);
      }
    }

    return { text: rewritten, changes };
  }

  private moderateRewrite(text: string, _context: any, preserveDialogue: string[]): { text: string; changes: string[] } {
    let { text: rewritten, changes } = this.lightRewrite(text, preserveDialogue);

    // Improve sentence structure
    const sentences = rewritten.split(/([.!?]+)/);
    const newSentences: string[] = [];
    let structureChanges = 0;

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';

      if (sentence && sentence.trim()) {
        const words = sentence.trim().split(/\s+/);

        // Split overly long sentences
        if (words.length > 25) {
          const midPoint = Math.floor(words.length / 2);
          const part1 = words.slice(0, midPoint).join(' ');
          const part2 = words.slice(midPoint).join(' ');
          newSentences.push(part1 + '. ' + part2 + punctuation);
          structureChanges++;
        } else {
          newSentences.push(sentence + punctuation);
        }
      } else {
        newSentences.push(sentence + punctuation);
      }
    }

    rewritten = newSentences.join('');
    if (structureChanges > 0) {
      changes.push(`Improved sentence structure (split ${structureChanges} overly long sentences)`);
    }

    // Improve paragraph breaks
    const paragraphs = rewritten.split(/\n\s*\n/);
    const newParagraphs: string[] = [];
    let paragraphChanges = 0;

    paragraphs.forEach(para => {
      const wordCount = para.split(/\s+/).length;

      if (wordCount > 150) {
        // Split long paragraphs
        const sentences = para.split(/([.!?]+)/);
        const midPoint = Math.floor(sentences.length / 4) * 2; // Split at sentence boundary

        const para1 = sentences.slice(0, midPoint).join('');
        const para2 = sentences.slice(midPoint).join('');

        newParagraphs.push(para1, para2);
        paragraphChanges++;
      } else {
        newParagraphs.push(para);
      }
    });

    if (paragraphChanges > 0) {
      rewritten = newParagraphs.join('\n\n');
      changes.push(`Improved paragraph structure (split ${paragraphChanges} overly long paragraphs)`);
    }

    return { text: rewritten, changes };
  }

  private comprehensiveRewrite(text: string, context: any, _preserveDialogue: string[]): { text: string; changes: string[] } {
    let { text: rewritten, changes } = this.moderateRewrite(text, context, []);

    // Enhance descriptions
    const simpleDescriptions = rewritten.match(/\b(he|she|it)\s+(walked|ran|went|looked|turned)\b/gi) || [];
    let descriptionsEnhanced = 0;

    simpleDescriptions.forEach(match => {
      const enhancements = {
        'walked': 'strolled',
        'ran': 'dashed',
        'went': 'moved',
        'looked': 'gazed',
        'turned': 'pivoted'
      };

      const verb = match.split(' ')[1].toLowerCase();
      if (enhancements[verb]) {
        rewritten = rewritten.replace(match, match.replace(verb, enhancements[verb]));
        descriptionsEnhanced++;
      }
    });

    if (descriptionsEnhanced > 0) {
      changes.push(`Enhanced descriptions (improved ${descriptionsEnhanced} action verbs)`);
    }

    // Add transition words for better flow
    const paragraphs = rewritten.split(/\n\s*\n/);
    const transitions = ['However', 'Meanwhile', 'Furthermore', 'Consequently', 'Nevertheless'];
    let transitionsAdded = 0;

    for (let i = 1; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      const firstWord = para.split(' ')[0];

      // Add transition if paragraph starts abruptly
      if (firstWord && /^[A-Z]/.test(firstWord) && !transitions.includes(firstWord) && Math.random() > 0.7) {
        const transition = transitions[Math.floor(Math.random() * transitions.length)];
        paragraphs[i] = transition + ', ' + para.charAt(0).toLowerCase() + para.slice(1);
        transitionsAdded++;
      }
    }

    if (transitionsAdded > 0) {
      rewritten = paragraphs.join('\n\n');
      changes.push(`Improved narrative flow (added ${transitionsAdded} transition phrases)`);
    }

    return { text: rewritten, changes };
  }
}

// --- CHAPTER SEQUENCE VALIDATOR TOOL ---

// --- BOOK STRUCTURE ANALYZER ---

export class BookStructureAnalyzer {
  analyzeStructure(manuscript: string, index: ManuscriptIndex): BookStructure {
    const plotThreads = this.extractPlotThreads(manuscript, index);
    const characterArcs = this.analyzeCharacterArcs(manuscript, index);
    const pacing = this.analyzePacing(manuscript, index);
    const thematicElements = this.extractThemes(manuscript, index);

    return {
      index,
      plotThreads,
      characterArcs,
      pacing,
      thematicElements
    };
  }

  private extractPlotThreads(manuscript: string, index: ManuscriptIndex): PlotThread[] {
    const threads: PlotThread[] = [];

    // Main plot thread
    const mainThread: PlotThread = {
      id: 'main',
      name: 'Main Plot',
      startChapter: 1,
      endChapter: index.chapters.length,
      keyEvents: this.extractMainPlotEvents(manuscript, index),
      characters: index.characters.slice(0, 3).map(c => c.name),
      status: 'active'
    };
    threads.push(mainThread);

    // Character subplots
    index.characters.forEach(char => {
      if (char.chapters.length >= 3) {
        const subplot: PlotThread = {
          id: `subplot_${char.name.toLowerCase()}`,
          name: `${char.name} Arc`,
          startChapter: Math.min(...char.chapters),
          endChapter: Math.max(...char.chapters),
          keyEvents: this.extractCharacterEvents(manuscript, char, index),
          characters: [char.name],
          status: Math.max(...char.chapters) === index.chapters.length ? 'resolved' : 'active'
        };
        threads.push(subplot);
      }
    });

    return threads;
  }

  private extractMainPlotEvents(manuscript: string, index: ManuscriptIndex): PlotEvent[] {
    const events: PlotEvent[] = [];
    const plotKeywords = ['discovered', 'revealed', 'decided', 'confronted', 'realized', 'defeated', 'rescued', 'escaped'];

    index.chapters.forEach((chapter, idx) => {
      const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

      plotKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = chapterText.match(regex);
        if (matches && matches.length > 0) {
          events.push({
            chapter: chapter.chapterNumber,
            position: chapter.startPosition,
            description: `Key event involving "${keyword}"`,
            importance: idx < 2 ? 'setup' : idx > index.chapters.length - 3 ? 'payoff' : 'major',
            relatedThreads: ['main']
          });
        }
      });
    });

    return events;
  }

  private extractCharacterEvents(manuscript: string, character: CharacterAppearance, index: ManuscriptIndex): PlotEvent[] {
    const events: PlotEvent[] = [];
    const emotionKeywords = ['angry', 'sad', 'happy', 'confused', 'determined', 'afraid'];

    character.chapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

        emotionKeywords.forEach(emotion => {
          const regex = new RegExp(`${character.name}[^.!?]*\\b${emotion}\\b`, 'gi');
          const matches = chapterText.match(regex);
          if (matches) {
            events.push({
              chapter: chapterNum,
              position: chapter.startPosition,
              description: `${character.name} emotional moment: ${emotion}`,
              importance: 'minor',
              relatedThreads: [`subplot_${character.name.toLowerCase()}`]
            });
          }
        });
      }
    });

    return events;
  }

  private analyzeCharacterArcs(manuscript: string, index: ManuscriptIndex): CharacterArc[] {
    return index.characters.slice(0, 5).map(character => {
      const milestones = this.extractArcMilestones(manuscript, character, index);

      return {
        character: character.name,
        startState: this.determineInitialState(manuscript, character, index),
        endState: this.determineFinalState(manuscript, character, index),
        milestones,
        consistency: this.calculateArcConsistency(milestones)
      };
    });
  }

  private extractArcMilestones(manuscript: string, character: CharacterAppearance, index: ManuscriptIndex): ArcMilestone[] {
    const milestones: ArcMilestone[] = [];
    const growthKeywords = ['learned', 'changed', 'realized', 'understood', 'became', 'grew'];

    character.chapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

        growthKeywords.forEach(keyword => {
          const regex = new RegExp(`${character.name}[^.!?]*\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
          const matches = chapterText.match(regex);
          if (matches && matches.length > 0) {
            milestones.push({
              chapter: chapterNum,
              event: `Growth moment: ${keyword}`,
              growth: matches[0].trim(),
              emotionalState: 'developing'
            });
          }
        });
      }
    });

    return milestones;
  }

  private determineInitialState(manuscript: string, character: CharacterAppearance, index: ManuscriptIndex): string {
    const firstChapter = index.chapters.find(c => c.chapterNumber === character.firstMention);
    if (firstChapter) {
      const firstText = manuscript.slice(firstChapter.startPosition, firstChapter.endPosition);
      // Simplified state determination
      if (firstText.includes(character.name) && firstText.toLowerCase().includes('young')) return 'naive';
      if (firstText.includes(character.name) && firstText.toLowerCase().includes('experienced')) return 'worldly';
    }
    return 'unknown';
  }

  private determineFinalState(manuscript: string, character: CharacterAppearance, index: ManuscriptIndex): string {
    const lastChapter = index.chapters.find(c => c.chapterNumber === Math.max(...character.chapters));
    if (lastChapter) {
      const lastText = manuscript.slice(lastChapter.startPosition, lastChapter.endPosition);
      // Simplified state determination
      if (lastText.includes(character.name) && lastText.toLowerCase().includes('wise')) return 'mature';
      if (lastText.includes(character.name) && lastText.toLowerCase().includes('confident')) return 'confident';
    }
    return 'evolved';
  }

  private calculateArcConsistency(milestones: ArcMilestone[]): number {
    if (milestones.length === 0) return 0.5;
    // Simple consistency calculation - could be enhanced
    return Math.min(1.0, milestones.length / 5); // More milestones = more consistent
  }

  private analyzePacing(manuscript: string, index: ManuscriptIndex): PacingAnalysis {
    const chapterPacing = index.chapters.map(chapter => {
      const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
      return this.analyzeChapterPacing(chapterText, chapter.chapterNumber);
    });

    const tensionCurve = this.calculateTensionCurve(manuscript, index);
    const actionToDialogueRatio = this.calculateActionDialogueRatio(manuscript);

    return {
      overall: this.determineOverallPacing(chapterPacing),
      chapterPacing,
      tensionCurve,
      actionToDialogueRatio
    };
  }

  private analyzeChapterPacing(text: string, chapterNumber: number): ChapterPacing {
    const words = text.split(/\s+/).filter(Boolean);
    const dialogueMatches = text.match(/"/g) || [];
    const dialoguePercentage = (dialogueMatches.length / 2) / words.length;

    const actionWords = ['ran', 'jumped', 'fought', 'chased', 'escaped', 'attacked', 'grabbed'];
    const actionCount = actionWords.reduce((count, word) =>
      count + (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
    );
    const actionDensity = actionCount / words.length;

    let pace: 'slow' | 'moderate' | 'fast';
    if (actionDensity > 0.01) pace = 'fast';
    else if (dialoguePercentage > 0.3) pace = 'moderate';
    else pace = 'slow';

    return {
      chapterNumber,
      pace,
      wordCount: words.length,
      dialoguePercentage,
      actionDensity
    };
  }

  private calculateTensionCurve(manuscript: string, index: ManuscriptIndex): number[] {
    const tensionWords = ['danger', 'crisis', 'urgent', 'threat', 'fear', 'panic', 'worried', 'anxious'];

    return index.chapters.map(chapter => {
      const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
      const wordCount = chapterText.split(/\s+/).length;

      const tensionCount = tensionWords.reduce((count, word) =>
        count + (chapterText.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
      );

      return Math.min(1.0, tensionCount / (wordCount / 100)); // Normalize
    });
  }

  private calculateActionDialogueRatio(manuscript: string): number {
    const words = manuscript.split(/\s+/).length;
    const dialogueWords = (manuscript.match(/"/g) || []).length / 2 * 10; // Estimate
    return dialogueWords / words;
  }

  private determineOverallPacing(chapterPacing: ChapterPacing[]): 'slow' | 'moderate' | 'fast' | 'uneven' {
    const paceMap = { slow: 0, moderate: 1, fast: 2 };
    const paceValues = chapterPacing.map(p => paceMap[p.pace]);
    const variance = this.calculateVariance(paceValues);

    if (variance > 0.5) return 'uneven';

    const avgPace = paceValues.reduce((a, b) => a + b, 0) / paceValues.length;
    if (avgPace < 0.7) return 'slow';
    if (avgPace > 1.3) return 'fast';
    return 'moderate';
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length <= 1) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private extractThemes(manuscript: string, index: ManuscriptIndex): ThematicElement[] {
    const themes: ThematicElement[] = [];
    const themeKeywords = {
      'love': ['love', 'heart', 'romance', 'affection', 'devotion'],
      'betrayal': ['betrayed', 'backstab', 'deceived', 'trusted', 'loyal'],
      'power': ['power', 'control', 'authority', 'dominance', 'rule'],
      'growth': ['change', 'learn', 'grow', 'mature', 'develop'],
      'justice': ['justice', 'fair', 'right', 'wrong', 'moral']
    };

    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const chapters: number[] = [];
      let totalStrength = 0;

      index.chapters.forEach(chapter => {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const wordCount = chapterText.split(/\s+/).length;

        const themeCount = keywords.reduce((count, keyword) =>
          count + (chapterText.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length, 0
        );

        if (themeCount > 0) {
          chapters.push(chapter.chapterNumber);
          totalStrength += themeCount / wordCount;
        }
      });

      if (chapters.length > 0) {
        themes.push({
          theme,
          chapters,
          strength: totalStrength / chapters.length,
          evolution: [`Appears in ${chapters.length} chapters`]
        });
      }
    });

    return themes.sort((a, b) => b.strength - a.strength);
  }
}

// --- GLOBAL MANUSCRIPT EDITOR ---

export class GlobalManuscriptEditor {
  replaceCharacterGlobally(
    manuscript: string,
    index: ManuscriptIndex,
    oldName: string,
    newName: string
  ): { manuscript: string; changes: number } {
    let changes = 0;
    let result = manuscript;

    // Replace with word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    const matches = result.match(regex) || [];
    changes = matches.length;

    result = result.replace(regex, newName);

    return { manuscript: result, changes };
  }

  replaceDialoguePattern(
    manuscript: string,
    oldPattern: string,
    newPattern: string
  ): { manuscript: string; changes: number } {
    let changes = 0;
    let result = manuscript;

    // Find dialogue and replace pattern within quotes
    const dialogueRegex = /"([^"]*)"/g;
    result = result.replace(dialogueRegex, (match, dialogue) => {
      if (dialogue.includes(oldPattern)) {
        changes++;
        return `"${dialogue.replace(new RegExp(oldPattern, 'g'), newPattern)}"`;
      }
      return match;
    });

    return { manuscript: result, changes };
  }

  enhancePlotConsistency(
    manuscript: string,
    structure: BookStructure
  ): { manuscript: string; improvements: string[] } {
    let result = manuscript;
    const improvements: string[] = [];

    // Ensure plot threads are properly connected
    structure.plotThreads.forEach(thread => {
      if (thread.status === 'abandoned' && thread.keyEvents.length > 0) {
        // Add resolution hints
        const lastChapter = structure.index.chapters.find(c => c.chapterNumber === thread.endChapter);
        if (lastChapter) {
          // Simple improvement - add a reference to the thread
          const insertion = `\n\nThe matter of ${thread.name.toLowerCase()} remained unresolved.`;
          const insertionPoint = lastChapter.endPosition - 1;
          result = result.slice(0, insertionPoint) + insertion + result.slice(insertionPoint);
          improvements.push(`Added resolution reference for ${thread.name}`);
        }
      }
    });

    return { manuscript: result, improvements };
  }

  balanceChapterLengths(
    manuscript: string,
    index: ManuscriptIndex,
    targetLength: number = 2000
  ): { manuscript: string; changes: string[] } {
    let result = manuscript;
    const changes: string[] = [];
    const tolerance = targetLength * 0.3; // 30% tolerance

    index.chapters.forEach((chapter) => {
      if (chapter.wordCount < targetLength - tolerance) {
        // Chapter too short - add expansion
        const chapterText = result.slice(chapter.startPosition, chapter.endPosition);
        const expandedText = this.expandChapter(chapterText, targetLength - chapter.wordCount);
        result = result.slice(0, chapter.startPosition) + expandedText + result.slice(chapter.endPosition);
        changes.push(`Expanded Chapter ${chapter.chapterNumber} (+${targetLength - chapter.wordCount} words)`);
      } else if (chapter.wordCount > targetLength + tolerance) {
        // Chapter too long - add scene break suggestion
        const chapterText = result.slice(chapter.startPosition, chapter.endPosition);
        const condensedText = this.condenseChapter(chapterText, chapter.wordCount - targetLength);
        result = result.slice(0, chapter.startPosition) + condensedText + result.slice(chapter.endPosition);
        changes.push(`Condensed Chapter ${chapter.chapterNumber} (-${chapter.wordCount - targetLength} words)`);
      }
    });

    return { manuscript: result, changes };
  }

  private expandChapter(text: string, wordsNeeded: number): string {
    // Simple expansion by adding descriptive details
    const sentences = text.split(/([.!?]+)/);
    let wordsAdded = 0;
    const expansions = [
      ', taking a moment to observe the surroundings',
      ', feeling the weight of the decision',
      ', with careful consideration',
      ', noting the subtle changes in atmosphere'
    ];

    for (let i = 0; i < sentences.length && wordsAdded < wordsNeeded; i += 2) {
      if (sentences[i] && sentences[i].trim() && Math.random() > 0.7) {
        const expansion = expansions[Math.floor(Math.random() * expansions.length)];
        sentences[i] += expansion;
        wordsAdded += expansion.split(/\s+/).length;
      }
    }

    return sentences.join('');
  }

  private condenseChapter(text: string, wordsToRemove: number): string {
    // Simple condensation by removing redundant adverbs and phrases
    let result = text;
    let wordsRemoved = 0;

    // Remove excessive adverbs
    const adverbs = result.match(/\b\w+ly\b/g) || [];
    const adverbsToRemove = Math.min(adverbs.length, Math.floor(wordsToRemove / 2));

    for (let i = 0; i < adverbsToRemove; i++) {
      result = result.replace(/\b\w+ly\s+/, '');
      wordsRemoved++;
    }

    // Remove redundant phrases
    const redundantPhrases = [
      /\s*,\s*in fact,?\s*/g,
      /\s*,\s*actually,?\s*/g,
      /\s*,\s*really,?\s*/g
    ];

    redundantPhrases.forEach(phrase => {
      const matches = result.match(phrase) || [];
      result = result.replace(phrase, ' ');
      wordsRemoved += matches.length * 2; // Approximate
    });

    return result;
  }
}

// --- STRUCTURED MANUSCRIPT SEARCH SYSTEM ---

export interface SearchQuery {
  type: 'character' | 'theme' | 'plot' | 'dialogue' | 'scene' | 'emotion';
  target: string;
  context?: {
    chapters?: number[];
    characters?: string[];
    timeframe?: 'recent' | 'early' | 'all';
  };
}

export interface SearchResult {
  chapter: number;
  position: number;
  content: string;
  relevanceScore: number;
  contextType: string;
  relatedElements: string[];
}

export class StructuredManuscriptSearch {
  private indexer: ManuscriptIndexer;
  private structureAnalyzer: BookStructureAnalyzer;

  constructor() {
    this.indexer = new ManuscriptIndexer();
    this.structureAnalyzer = new BookStructureAnalyzer();
  }

  search(
    manuscript: string,
    index: ManuscriptIndex,
    query: SearchQuery,
    maxResults: number = 5
  ): SearchResult[] {
    const structure = this.structureAnalyzer.analyzeStructure(manuscript, index);

    switch (query.type) {
      case 'character':
        return this.searchCharacterMentions(manuscript, index, query, maxResults);
      case 'theme':
        return this.searchThematicElements(manuscript, structure, query, maxResults);
      case 'plot':
        return this.searchPlotElements(manuscript, structure, query, maxResults);
      case 'dialogue':
        return this.searchDialogue(manuscript, index, query, maxResults);
      case 'scene':
        return this.searchScenes(manuscript, index, query, maxResults);
      case 'emotion':
        return this.searchEmotionalMoments(manuscript, index, query, maxResults);
      default:
        return this.searchGeneral(manuscript, index, query, maxResults);
    }
  }

  private searchCharacterMentions(
    manuscript: string,
    index: ManuscriptIndex,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const character = index.characters.find(c => c.name.toLowerCase() === query.target.toLowerCase());

    if (!character) return results;

    const targetChapters = query.context?.chapters || character.chapters;

    targetChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const mentions = this.findCharacterMentions(chapterText, character.name, chapter.startPosition);

        mentions.forEach(mention => {
          results.push({
            chapter: chapterNum,
            position: mention.position,
            content: mention.content,
            relevanceScore: mention.score,
            contextType: 'character_mention',
            relatedElements: [character.name]
          });
        });
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private findCharacterMentions(
    text: string,
    characterName: string,
    basePosition: number
  ): Array<{ position: number; content: string; score: number }> {
    const mentions = [];
    const regex = new RegExp(`[^.!?]*\\b${characterName}\\b[^.!?]*[.!?]`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const content = match[0].trim();
      const position = basePosition + match.index;

      // Score based on context richness
      let score = 0.5;
      if (content.includes('"')) score += 0.3; // Dialogue
      if (content.includes('felt') || content.includes('thought')) score += 0.2; // Internal state
      if (content.length > 50) score += 0.1; // Detailed mention

      mentions.push({ position, content, score });
    }

    return mentions;
  }

  private searchThematicElements(
    manuscript: string,
    structure: BookStructure,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const theme = structure.thematicElements.find(t =>
      t.theme.toLowerCase().includes(query.target.toLowerCase())
    );

    if (!theme) return results;

    const targetChapters = query.context?.chapters || theme.chapters;

    targetChapters.forEach(chapterNum => {
      const chapter = structure.index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const themeInstances = this.findThemeInstances(chapterText, query.target, chapter.startPosition);

        themeInstances.forEach(instance => {
          results.push({
            chapter: chapterNum,
            position: instance.position,
            content: instance.content,
            relevanceScore: instance.score * theme.strength,
            contextType: 'theme',
            relatedElements: [theme.theme]
          });
        });
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private findThemeInstances(
    text: string,
    theme: string,
    basePosition: number
  ): Array<{ position: number; content: string; score: number }> {
    const instances = [];
    const themeKeywords = this.getThemeKeywords(theme);

    themeKeywords.forEach(keyword => {
      const regex = new RegExp(`[^.!?]*\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const content = match[0].trim();
        const position = basePosition + match.index;

        let score = 0.4;
        // Higher score for richer thematic context
        if (content.length > 80) score += 0.2;
        if (themeKeywords.some(k => k !== keyword && content.toLowerCase().includes(k))) score += 0.3;

        instances.push({ position, content, score });
      }
    });

    return instances;
  }

  private getThemeKeywords(theme: string): string[] {
    const themeMap: Record<string, string[]> = {
      'love': ['love', 'heart', 'romance', 'affection', 'devotion', 'passion'],
      'betrayal': ['betrayed', 'backstab', 'deceived', 'trusted', 'loyal', 'treachery'],
      'power': ['power', 'control', 'authority', 'dominance', 'rule', 'command'],
      'growth': ['change', 'learn', 'grow', 'mature', 'develop', 'evolve'],
      'justice': ['justice', 'fair', 'right', 'wrong', 'moral', 'ethical'],
      'freedom': ['freedom', 'liberty', 'escape', 'prison', 'bound', 'free'],
      'sacrifice': ['sacrifice', 'give up', 'loss', 'cost', 'price', 'surrender']
    };

    return themeMap[theme.toLowerCase()] || [theme];
  }

  private searchPlotElements(
    manuscript: string,
    structure: BookStructure,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const plotKeywords = ['discovered', 'revealed', 'decided', 'confronted', 'realized', 'defeated'];

    const targetChapters = query.context?.chapters ||
      structure.index.chapters.map(c => c.chapterNumber);

    targetChapters.forEach(chapterNum => {
      const chapter = structure.index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

        plotKeywords.forEach(keyword => {
          if (query.target.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(query.target.toLowerCase())) {
            const regex = new RegExp(`[^.!?]*\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
            let match;

            while ((match = regex.exec(chapterText)) !== null) {
              const content = match[0].trim();
              const position = chapter.startPosition + match.index;

              let score = 0.6; // Plot elements are inherently important
              if (content.length > 60) score += 0.2;

              results.push({
                chapter: chapterNum,
                position,
                content,
                relevanceScore: score,
                contextType: 'plot_event',
                relatedElements: [keyword]
              });
            }
          }
        });
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private searchDialogue(
    manuscript: string,
    index: ManuscriptIndex,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const targetChapters = query.context?.chapters ||
      index.chapters.map(c => c.chapterNumber);

    targetChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const dialogueMatches = this.findDialogueMatches(chapterText, query.target, chapter.startPosition);

        dialogueMatches.forEach(match => {
          results.push({
            chapter: chapterNum,
            position: match.position,
            content: match.content,
            relevanceScore: match.score,
            contextType: 'dialogue',
            relatedElements: match.speaker ? [match.speaker] : []
          });
        });
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private findDialogueMatches(
    text: string,
    target: string,
    basePosition: number
  ): Array<{ position: number; content: string; score: number; speaker?: string }> {
    const matches = [];
    const dialogueRegex = /"([^"]+)"([^.!?]*[.!?])/g;
    let match;

    while ((match = dialogueRegex.exec(text)) !== null) {
      const dialogue = match[1];
      const attribution = match[2];

      if (dialogue.toLowerCase().includes(target.toLowerCase())) {
        const position = basePosition + match.index;
        const content = match[0].trim();

        let score = 0.7; // Dialogue is highly relevant
        if (dialogue.length > 30) score += 0.2;

        // Extract speaker if present
        const speakerMatch = attribution.match(/([A-Z][a-z]+)\s+(said|asked|replied)/);
        const speaker = speakerMatch ? speakerMatch[1] : undefined;

        matches.push({ position, content, score, speaker });
      }
    }

    return matches;
  }

  private searchScenes(
    manuscript: string,
    index: ManuscriptIndex,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const sceneMarkers = ['meanwhile', 'later', 'suddenly', 'across town', 'that evening', 'the next day'];

    const targetChapters = query.context?.chapters ||
      index.chapters.map(c => c.chapterNumber);

    targetChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

        // Look for scene breaks and setting descriptions
        const sceneRegex = new RegExp(`(${sceneMarkers.join('|')})[^.!?]*[.!?]`, 'gi');
        let match;

        while ((match = sceneRegex.exec(chapterText)) !== null) {
          if (match[0].toLowerCase().includes(query.target.toLowerCase())) {
            const position = chapter.startPosition + match.index;
            const content = match[0].trim();

            results.push({
              chapter: chapterNum,
              position,
              content,
              relevanceScore: 0.6,
              contextType: 'scene',
              relatedElements: ['scene_transition']
            });
          }
        }
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private searchEmotionalMoments(
    manuscript: string,
    index: ManuscriptIndex,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const emotions = ['happy', 'sad', 'angry', 'afraid', 'excited', 'worried', 'confused', 'determined'];

    const targetChapters = query.context?.chapters ||
      index.chapters.map(c => c.chapterNumber);

    targetChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);

        emotions.forEach(emotion => {
          if (query.target.toLowerCase().includes(emotion) || emotion.includes(query.target.toLowerCase())) {
            const regex = new RegExp(`[^.!?]*\\b${emotion}\\b[^.!?]*[.!?]`, 'gi');
            let match;

            while ((match = regex.exec(chapterText)) !== null) {
              const content = match[0].trim();
              const position = chapter.startPosition + match.index;

              results.push({
                chapter: chapterNum,
                position,
                content,
                relevanceScore: 0.5,
                contextType: 'emotion',
                relatedElements: [emotion]
              });
            }
          }
        });
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private searchGeneral(
    manuscript: string,
    index: ManuscriptIndex,
    query: SearchQuery,
    maxResults: number
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const targetChapters = query.context?.chapters ||
      index.chapters.map(c => c.chapterNumber);

    targetChapters.forEach(chapterNum => {
      const chapter = index.chapters.find(c => c.chapterNumber === chapterNum);
      if (chapter) {
        const chapterText = manuscript.slice(chapter.startPosition, chapter.endPosition);
        const regex = new RegExp(`[^.!?]*\\b${query.target}\\b[^.!?]*[.!?]`, 'gi');
        let match;

        while ((match = regex.exec(chapterText)) !== null) {
          const content = match[0].trim();
          const position = chapter.startPosition + match.index;

          results.push({
            chapter: chapterNum,
            position,
            content,
            relevanceScore: 0.4,
            contextType: 'general',
            relatedElements: [query.target]
          });
        }
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  // Smart context retrieval for AI prompts
  getContextForQuery(
    manuscript: string,
    index: ManuscriptIndex,
    query: string,
    maxChunks: number = 5
  ): string[] {
    // Analyze query to determine best search strategy
    const searchQueries = this.parseQueryToSearchQueries(query);
    const allResults: SearchResult[] = [];

    searchQueries.forEach(searchQuery => {
      const results = this.search(manuscript, index, searchQuery, 3);
      allResults.push(...results);
    });

    // Deduplicate and sort by relevance
    const uniqueResults = this.deduplicateResults(allResults);
    const sortedResults = uniqueResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxChunks);

    return sortedResults.map(result => result.content);
  }

  private parseQueryToSearchQueries(query: string): SearchQuery[] {
    const queries: SearchQuery[] = [];
    const lowercaseQuery = query.toLowerCase();

    // Character-related queries
    const characterPatterns = ['who is', 'character', 'person', 'protagonist', 'antagonist'];
    if (characterPatterns.some(pattern => lowercaseQuery.includes(pattern))) {
      // Extract potential character names (capitalized words)
      const characterNames = query.match(/\b[A-Z][a-z]+\b/g) || [];
      characterNames.forEach(name => {
        queries.push({ type: 'character', target: name });
      });
    }

    // Theme-related queries
    const themePatterns = ['theme', 'meaning', 'symbolism', 'message'];
    if (themePatterns.some(pattern => lowercaseQuery.includes(pattern))) {
      const themes = ['love', 'betrayal', 'power', 'growth', 'justice', 'freedom', 'sacrifice'];
      themes.forEach(theme => {
        if (lowercaseQuery.includes(theme)) {
          queries.push({ type: 'theme', target: theme });
        }
      });
    }

    // Plot-related queries
    const plotPatterns = ['what happens', 'plot', 'story', 'event', 'climax', 'resolution'];
    if (plotPatterns.some(pattern => lowercaseQuery.includes(pattern))) {
      queries.push({ type: 'plot', target: query });
    }

    // Dialogue-related queries
    const dialoguePatterns = ['said', 'dialogue', 'conversation', 'quote', 'speaks'];
    if (dialoguePatterns.some(pattern => lowercaseQuery.includes(pattern))) {
      queries.push({ type: 'dialogue', target: query });
    }

    // If no specific patterns match, use general search
    if (queries.length === 0) {
      // Extract key words from query
      const words = query.match(/\b[a-zA-Z]{3,}\b/g) || [];
      words.forEach(word => {
        queries.push({ type: 'character', target: word });
      });
    }

    return queries;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.chapter}:${result.position}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export class ChapterSequenceValidator {
  validate(
    manuscript: string,
    chapterNumber: number,
    manuscriptIndex: ManuscriptIndex,
    contextCache: ContextCache
  ): SequenceValidationResult {
    const context = contextCache.loadContext(manuscript, chapterNumber, manuscriptIndex);

    const result: SequenceValidationResult = {
      isValid: true,
      issues: [],
      characterInconsistencies: [],
      timelineIssues: [],
      emotionalJumps: [],
      knowledgeGaps: [],
    };

    // Validate character consistency
    this.validateCharacterConsistency(context, result);

    // Validate timeline
    this.validateTimeline(manuscript, context, result);

    // Validate emotional continuity
    this.validateEmotionalContinuity(context, result);

    // Validate knowledge continuity
    this.validateKnowledgeContinuity(context, result);

    result.isValid = result.issues.length === 0;
    return result;
  }

  private validateCharacterConsistency(context: ChapterContext, result: SequenceValidationResult): void {
    const targetText = context.targetChapter.title || `Chapter ${context.targetChapter.chapterNumber}`;

    // Check if characters appear without proper introduction
    context.activeCharacters.forEach(char => {
      if (char.lastChapterAppearance < context.targetChapter.chapterNumber - 2) {
        result.characterInconsistencies.push(
          `${char.name} appears in ${targetText} but hasn't appeared since Chapter ${char.lastChapterAppearance}`
        );
        result.issues.push(`Character continuity issue: ${char.name}`);
      }
    });
  }

  private validateTimeline(
    manuscript: string,
    context: ChapterContext,
    result: SequenceValidationResult
  ): void {
    const targetText = manuscript.slice(
      context.targetChapter.startPosition,
      context.targetChapter.endPosition
    );

    const timeIndicators = [
      'yesterday', 'today', 'tomorrow', 'last week', 'next week',
      'morning', 'afternoon', 'evening', 'night', 'dawn', 'dusk'
    ];

    const foundIndicators = timeIndicators.filter(indicator =>
      targetText.toLowerCase().includes(indicator)
    );

    // Simple timeline validation - could be enhanced with more sophisticated logic
    if (foundIndicators.length > 0 && context.previousChapter) {
      const prevText = manuscript.slice(
        context.previousChapter.startPosition,
        context.previousChapter.endPosition
      );

      const prevIndicators = timeIndicators.filter(indicator =>
        prevText.toLowerCase().includes(indicator)
      );

      // Basic conflict detection
      if (prevIndicators.includes('tomorrow') && foundIndicators.includes('yesterday')) {
        result.timelineIssues.push(
          'Timeline inconsistency: Previous chapter mentions "tomorrow" but current chapter mentions "yesterday"'
        );
        result.issues.push('Timeline inconsistency detected');
      }
    }
  }

  private validateEmotionalContinuity(context: ChapterContext, result: SequenceValidationResult): void {
    // Check for unrealistic emotional jumps between chapters
    context.activeCharacters.forEach(char => {
      // This would be enhanced with actual emotional state tracking
      if (char.emotionalState === 'happy' && Math.random() > 0.8) { // Placeholder logic
        result.emotionalJumps.push(
          `${char.name} shows emotional inconsistency in Chapter ${context.targetChapter.chapterNumber}`
        );
        result.issues.push(`Emotional continuity issue: ${char.name}`);
      }
    });
  }

  private validateKnowledgeContinuity(context: ChapterContext, result: SequenceValidationResult): void {
    // Check for knowledge inconsistencies
    context.activeCharacters.forEach(char => {
      // Simplified knowledge validation
      if (char.knowledgeState.length > 0) {
        // Check if character acts without knowledge they should have
        // This would be enhanced with actual knowledge tracking
        const hasKnowledgeInconsistency = Math.random() > 0.9; // Placeholder

        if (hasKnowledgeInconsistency) {
          result.knowledgeGaps.push(
            `${char.name} may be acting without knowledge they should have`
          );
          result.issues.push(`Knowledge continuity issue: ${char.name}`);
        }
      }
    });
  }
}