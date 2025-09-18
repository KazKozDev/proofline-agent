import React, { useState, FC, ReactNode, useMemo, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// FIX: Removed 'FunctionCallingMode' as it is not an exported member of '@google/genai'.
import { GoogleGenAI, Chat, Type, GenerateContentResponse } from "@google/genai";
// FIX: Using a namespace import for 'react-window' to fix module resolution issues.
import * as ReactWindow from 'react-window';
import {
  ManuscriptIndexer,
  ContextCache,
  CharacterProfileBuilder,
  ChapterSequenceValidator,
  ChapterRewriter,
  BookStructureAnalyzer,
  GlobalManuscriptEditor,
  StructuredManuscriptSearch,
  type ManuscriptIndex,
  type BookStructure,
  type WholeBookRewriteOptions,
  type SearchQuery
} from './utils/manuscript-tools';
import {
  ManuscriptTranslator,
  type TranslationRequest,
  type TranslationResult,
  type TranslationQuality
} from './utils/manuscript-translator';

// --- API & MODEL SETUP ---
const API_KEY = (import.meta as any).env?.VITE_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.API_KEY : undefined);
if (!API_KEY) {
  throw new Error("API key not found. Please set VITE_API_KEY in your .env file (e.g., VITE_API_KEY=your_key_here).");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- MANUSCRIPT TOOLS INSTANCES ---
const manuscriptIndexer = new ManuscriptIndexer();
const contextCache = new ContextCache();
const characterProfileBuilder = new CharacterProfileBuilder();
const chapterSequenceValidator = new ChapterSequenceValidator();
const chapterRewriter = new ChapterRewriter();
const bookStructureAnalyzer = new BookStructureAnalyzer();
const globalManuscriptEditor = new GlobalManuscriptEditor();
const structuredSearch = new StructuredManuscriptSearch();
const manuscriptTranslator = new ManuscriptTranslator(API_KEY);

// Global manuscript index cache
let manuscriptIndexCache: ManuscriptIndex | null = null;


// --- UTILITIES ---
function debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let timeoutId: number | undefined;

    return function (...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            func(...args);
        }, delay);
    };
}

// --- ENHANCED CONTEXT RETRIEVAL SYSTEM ---

// Legacy chunk-based approach (kept for fallback)
const chunkText = (text: string): string[] => {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
};

const findRelevantChunks = (query: string, chunks: string[], topK: number = 5): string[] => {
    const queryWords = new Set(query.toLowerCase().match(/\b\w+\b/g) || []);
    if (queryWords.size === 0) {
        return chunks.slice(0, topK);
    }

    const scoredChunks = chunks.map(chunk => {
        const chunkWords = new Set(chunk.toLowerCase().match(/\b\w+\b/g) || []);
        let score = 0;
        for (const word of queryWords) {
            if (chunkWords.has(word)) {
                score++;
            }
        }
        const density = chunk.length > 0 ? score / chunk.length : 0;
        return { chunk, score: score + density * 100 };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK).map(c => c.chunk);
};

// New structured context retrieval
const getStructuredContext = (query: string, manuscriptText: string, maxChunks: number = 5): string[] => {
    // Use cached index or create new one
    if (!manuscriptIndexCache) {
        manuscriptIndexCache = manuscriptIndexer.createIndex(manuscriptText);
    }

    try {
        // Use structured search for better context
        const context = structuredSearch.getContextForQuery(
            manuscriptText,
            manuscriptIndexCache,
            query,
            maxChunks
        );

        // If structured search returns good results, use them
        if (context.length > 0) {
            return context;
        }
    } catch (error) {
        console.warn('Structured search failed, falling back to chunk-based search:', error);
    }

    // Fallback to chunk-based approach
    const chunks = chunkText(manuscriptText);
    return findRelevantChunks(query, chunks, maxChunks);
};


// --- TYPES ---

type ChatMessageData = {
  id: string;
  sender: 'user' | 'agent';
  name: string;
  avatar: string;
  text: string;
};

type Annotation = {
  id: number;
  category: string;
  reasoning: string;
  confidence: number;
  originalText: string;
  suggestedChange: string;
};

type HistoryEntry = {
    id: number;
    timestamp: Date;
    text: string;
    description: string;
    type: 'initial' | 'manual' | 'ai' | 'suggestion' | 'revert' | 'import';
};

type Metadata = {
  title: string;
  author: string;
  language: string;
  coverUrl: string;
};

type ReadabilityCriterion = {
    criterion: string;
    score: number;
    justification: string;
};

const INITIAL_TEXT = `It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him.

The hallway smelt of boiled cabbage and old rag mats. At one end of it a coloured poster, too large for indoor display, had been tacked to the wall. It depicted simply an enormous face, more than a metre wide: the face of a man of about forty-five, with a heavy black moustache and ruggedly handsome features. Winston made for the stairs. It was no use trying the lift. Even at the best of times it was seldom working, and at present the electric current was cut off during daylight hours. It was part of the economy drive in preparation for Hate Week. The flat was seven flights up, and Winston, who was thirty-nine and had a varicose ulcer above his right ankle, went slowly, resting several times on the way. On each landing, opposite the lift-shaft, the poster with the enormous face gazed from the wall. It was one of those pictures which are so contrived that the eyes follow you about when you move. BIG BROTHER IS WATCHING YOU, the caption beneath it ran.`;

// --- SVG ICONS ---

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
);

// --- ATOMIC COMPONENTS ---

type ButtonProps = {
  variant?: 'neutral' | 'primary' | 'success' | 'danger';
  children: ReactNode;
  className?: string;
  [key: string]: any;
};

const Button = ({ variant = 'neutral', children, className, ...props }: ButtonProps) => (
  <button className={`btn btn-${variant} ${className || ''}`.trim()} {...props}>{children}</button>
);

type TagProps = {
    children: ReactNode;
    color?: string;
};

const Tag = ({ children, color }: TagProps) => (
  <span className={`tag ${color ? 'tag-' + color : ''}`}>{children}</span>
);

const ProgressBar = ({ value, className = '' }: { value: number; className?: string; }) => (
  <div className={`progress-bar ${className}`} title={`${value}%`}>
    <div className="progress-bar-inner" style={{ width: `${value}%` }}></div>
  </div>
);

type CardProps = {
    children: ReactNode;
    className?: string;
};

const Card = ({ children, className = '' }: CardProps) => (
    <div className={`card ${className}`}>{children}</div>
);

// --- COMPONENT BLOCKS ---

const ChatMessage: FC<{ msg: ChatMessageData }> = ({ msg }) => (
  <div className={`chat-message ${msg.sender}`}>
    {msg.sender === 'agent' && <div className={`chat-message-avatar ${msg.avatar === 'LLM' ? 'avatar-llm' : ''}`.trim()}>{msg.avatar}</div>}
    <div className="chat-message-content">
      <div className="chat-message-name">{msg.name}</div>
      <p>{msg.text}</p>
    </div>
    {msg.sender === 'user' && <div className="chat-message-avatar">{msg.avatar}</div>}
  </div>
);

type ChatComposerProps = {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
};

const ChatComposer: FC<ChatComposerProps> = ({ onSendMessage, isLoading }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isLoading) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <form className="chat-composer" onSubmit={handleSubmit}>
            <input
                className="input"
                type="text"
                placeholder={isLoading ? "Thinking..." : "Ask anything..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isLoading}
            />
            <Button variant="primary" className="btn-icon" aria-label="Send" type="submit" disabled={isLoading || !message.trim()}>
                {isLoading ? '...' : <SendIcon />}
            </Button>
        </form>
    );
};

const QuickPhrases: FC<{ onSelectPhrase: (phrase: string) => void; isLoading: boolean; }> = ({ onSelectPhrase, isLoading }) => {
    const handleIndexClick = () => {
        onSelectPhrase("How does the Index tool work? The ManuscriptIndexer automatically scans your entire manuscript to detect chapter boundaries, identify character appearances, and create a comprehensive index. To use it, simply say 'analyze my manuscript' or 'create an index of the document' and the agent will run the indexing process for you.");
    };

    const handleRewriterClick = () => {
        onSelectPhrase("How does the Rewriter tool work? The ChapterRewriter uses three intensity levels - light (minor polish), moderate (significant improvements), and comprehensive (major overhaul). It automatically assesses quality and guarantees improvements. To use it, first run the Index tool, then say 'rewrite chapter 3 with moderate intensity' or 'do a comprehensive rewrite of chapter 1 while preserving the dialogue'. The tool maintains character consistency and narrative flow.");
    };

    const handleTranslatorClick = () => {
        onSelectPhrase("How does the Translator tool work? The ManuscriptTranslator can translate your entire manuscript or specific sections to any target language while preserving character names, formatting, and literary style. To use it, say 'translate my manuscript to Spanish' for full translation, 'translate chapter 2 to French' for specific chapters, or 'translate this selection to German' for text portions. The tool automatically detects source language and maintains narrative consistency.");
    };

    return (
        <div className="quick-phrases">
            <Button variant="primary" onClick={handleIndexClick} disabled={isLoading}>
                Index
            </Button>
            <Button variant="primary" onClick={handleRewriterClick} disabled={isLoading}>
                Rewriter
            </Button>
            <Button variant="primary" onClick={handleTranslatorClick} disabled={isLoading}>
                Translator
            </Button>
        </div>
    );
};

type AnnotationCardProps = {
    annotation: Annotation;
    onAccept: (annotation: Annotation) => void;
    onReject: (id: number) => void;
};

const AnnotationCard: FC<AnnotationCardProps> = ({ annotation, onAccept, onReject }) => (
    <Card className="annotation-card">
        <div className="card-header">
            <h4 className="card-title">{annotation.category}</h4>
            <Tag color="success">{`Confidence: ${annotation.confidence}%`}</Tag>
        </div>
        <div className="annotation-card-diff">
            <del>{annotation.originalText}</del>
            <ins>{annotation.suggestedChange}</ins>
        </div>
        <p className="annotation-card-reasoning">{annotation.reasoning}</p>
        <div className="annotation-card-footer">
            <Button variant="danger" className="btn-sm" onClick={() => onReject(annotation.id)}>Reject</Button>
            <Button variant="success" className="btn-sm" onClick={() => onAccept(annotation)}>Accept</Button>
        </div>
    </Card>
);

type EditorToolbarProps = {
    wordCount: number;
    characterCount: number;
}
const EditorToolbar: FC<EditorToolbarProps> = ({ wordCount, characterCount }) => (
    <div className="editor-toolbar">
        <div className="editor-toolbar-stats">
            <span>{wordCount.toLocaleString()} Words</span>
            <span>{characterCount.toLocaleString()} Characters</span>
        </div>
    </div>
);

type EditableTextAreaProps = {
    text: string;
    onTextChange: (text: string) => void;
    annotations: Annotation[];
};

const EditableTextArea: FC<EditableTextAreaProps> = ({ text, onTextChange, annotations }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const listRef = useRef<ReactWindow.FixedSizeList>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    // Use ResizeObserver to get the dimensions of the wrapper for the virtualized list
    useEffect(() => {
        if (!backdropRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        resizeObserver.observe(backdropRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const lines = useMemo(() => text.split('\n'), [text]);
    // Calculated from 1.1rem font-size * 1.6 line-height (at 16px base, this is 17.6px * 1.6 = ~28.16px)
    const LINE_HEIGHT = 28.16;

    const annotationRegex = useMemo(() => {
        const escapeRegExp = (string: string): string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // We only use the first line of an annotation for regex to simplify line-based matching
        const highlightTexts = annotations.map(a => a.originalText.split('\n')[0]).filter(Boolean);
        if (highlightTexts.length === 0) return null;
        const uniqueHighlights = [...new Set(highlightTexts)];
        return new RegExp(`(${uniqueHighlights.map(escapeRegExp).join('|')})`, 'g');
    }, [annotations]);
    
    // Row component for the virtualized list
    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const line = lines[index];
        const highlightedHTML = annotationRegex
            ? line.replace(annotationRegex, '<mark>$1</mark>')
            : line;
        
        // Add a non-breaking space to render empty lines correctly and maintain height
        return <div style={style} dangerouslySetInnerHTML={{ __html: highlightedHTML || '&nbsp;' }} />;
    };

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            const { scrollTop, scrollLeft } = textareaRef.current;
            // Synchronize horizontal scroll for the backdrop wrapper
            backdropRef.current.scrollLeft = scrollLeft;
            // Synchronize vertical scroll for the virtualized list
            listRef.current?.scrollTo(scrollTop);
        }
    };
    
    return (
        <div className="editable-textarea-wrapper">
            <div ref={backdropRef} className="editable-textarea-backdrop">
                <ReactWindow.FixedSizeList
                    ref={listRef}
                    height={size.height}
                    width={size.width}
                    itemCount={lines.length}
                    itemSize={LINE_HEIGHT}
                    className="editable-textarea-highlights"
                    // Prevent this list from being scrollable itself; it's driven by the textarea
                    style={{ overflow: 'hidden' }}
                >
                    {Row}
                </ReactWindow.FixedSizeList>
            </div>
            <textarea
                ref={textareaRef}
                className="editable-textarea"
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onScroll={handleScroll}
                aria-label="Manuscript Editor"
                spellCheck="false"
            />
        </div>
    );
};

const MetadataForm: FC<{ initialData: Metadata; onSave: (data: Metadata) => void; }> = ({ initialData, onSave }) => {
    const [formData, setFormData] = useState<Metadata>(initialData);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        if (isSaved) setIsSaved(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label className="form-label" htmlFor="title">Title</label>
                <input className="input" type="text" id="title" value={formData.title} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="author">Author</label>
                <input className="input" type="text" id="author" value={formData.author} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="language">Language</label>
                <input className="input" type="text" id="language" value={formData.language} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="coverUrl">Cover URL</label>
                <input className="input" type="url" id="coverUrl" placeholder="https://example.com/cover.jpg" value={formData.coverUrl} onChange={handleChange} />
            </div>
            <Button variant="primary" type="submit" style={{width: '100%'}} disabled={isSaved}>
                {isSaved ? 'Saved!' : 'Save Metadata'}
            </Button>
        </form>
    );
};

const About = () => {
  return (
    <div className="about-content">
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🤖 What is this?</h3>
        <p style={{ fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
          Proofline Agent is an AI-powered manuscript editor that helps authors improve their writing with intelligent suggestions,
          structural analysis, and comprehensive editing tools.
        </p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>💬 Chat with AI</h3>
        <p style={{ fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Use natural language to request changes:
        </p>
        <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0 }}>
          <li>"Make this paragraph more dramatic"</li>
          <li>"Fix grammar errors in chapter 3"</li>
          <li>"Analyze the character development"</li>
          <li>"Translate the first sentence to Spanish"</li>
          <li>"Translate the paragraph starting with 'It was a bright cold day' to French"</li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🛠 AI Tools Available</h3>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <strong>Basic Editing:</strong>
          <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
            <li>Replace words, sentences, paragraphs</li>
            <li>Grammar and style corrections</li>
          </ul>

          <strong>Chapter Tools:</strong>
          <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
            <li>Rewrite entire chapters (light/moderate/comprehensive)</li>
            <li>Validate chapter sequence and continuity</li>
            <li>Character consistency checking</li>
          </ul>

          <strong>Whole Book Features:</strong>
          <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
            <li>Complete book rewriting with quality improvement</li>
            <li>Global character name replacement</li>
            <li>Book structure analysis (plot, pacing, themes)</li>
          </ul>

          <strong>Advanced Analysis:</strong>
          <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
            <li>Character profile building</li>
            <li>Manuscript indexing and metrics</li>
            <li>Plot thread tracking</li>
          </ul>

          <strong>Translation:</strong>
          <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
            <li>Full manuscript or chapter translation</li>
            <li>Translate specific sentences or paragraphs</li>
            <li>Multiple language support</li>
            <li>Preserve formatting and style</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>📝 How to Use</h3>
        <ol style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0 }}>
          <li><strong>Import/Edit Text:</strong> Use the Import tab to load your manuscript, or edit directly in the center panel</li>
          <li><strong>Chat with AI:</strong> Ask questions or request changes in the left chat panel</li>
          <li><strong>Review Changes:</strong> Check the History tab to see all modifications</li>
          <li><strong>Export:</strong> Use the Export tab to save your work in various formats</li>
        </ol>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>💡 Smart Features</h3>
        <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0 }}>
          <li><strong>Auto-save:</strong> Your work is automatically saved in your browser</li>
          <li><strong>Context-aware:</strong> AI understands your entire manuscript for better suggestions</li>
          <li><strong>Structured search:</strong> Finds relevant content by characters, themes, or plot elements</li>
          <li><strong>Quality scoring:</strong> Tracks improvement in writing quality</li>
        </ul>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🎯 Example Commands</h3>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
            "Rewrite chapter 2 with comprehensive intensity"
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
            "Replace character John with Jonathan throughout the book"
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
            "Analyze the book structure and show me the main themes"
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
            "Improve the entire book quality while preserving dialogue"
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
            "Translate the first paragraph to Spanish"
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>⚡ Tips</h3>
        <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0 }}>
          <li>Be specific in your requests for better results</li>
          <li>Use the History tab to revert unwanted changes</li>
          <li>Check Metrics tab for writing statistics</li>
          <li>Save metadata for better organization</li>
          <li>Export regularly to backup your work</li>
        </ul>
      </section>
    </div>
  );
};

const MetricsPanel: FC<{ text: string }> = ({ text }) => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const charCount = text.length;

    const [isLoading, setIsLoading] = useState(false);
    // Readability State
    const [readabilityScore, setReadabilityScore] = useState<number | string>('?');
    const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
    const [analysisCriteria, setAnalysisCriteria] = useState<ReadabilityCriterion[]>([]);
    // Coherence State
    const [coherenceScore, setCoherenceScore] = useState<number | string>('?');
    const [coherenceSummary, setCoherenceSummary] = useState<string | null>(null);
    const [coherenceCriteria, setCoherenceCriteria] = useState<ReadabilityCriterion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleUpdateMetrics = async () => {
        setIsLoading(true);
        setError(null);
        
        // Reset scores and reports
        setAnalysisSummary(null);
        setAnalysisCriteria([]);
        setReadabilityScore('...');
        setCoherenceSummary(null);
        setCoherenceCriteria([]);
        setCoherenceScore('...');

        const readabilityPrompt = `Evaluate the provided literary text using the rubric below. Your response must be a JSON object that strictly adheres to the provided schema. First, read the text without consulting external sources. Then briefly (2–3 sentences) summarize the main plot and characters. For each criterion, assign a score from 0 to 10 with a 1–2 sentence justification based on the descriptors. Calculate the final score as the weighted sum of (criterion_score × weight), rounded to one decimal place.

Rubric with weights:
- Plot coherence (weight: 0.3): 0–2: incoherent chapters, no orientation; 3–5: partial orientation, plot gaps; 6–8: mostly coherent with minor mismatches; 9–10: clear orientation, logical sequence, integrated theme.
- Character depth (weight: 0.2): 0–2: flat, unmotivated; 3–5: partial traits, weak motivation; 6–8: well-developed but with some inaccuracies; 9–10: multidimensional, well-motivated, with development.
- Narrative structure & pacing (weight: 0.15): 0–2: chaotic structure; 3–5: basic elements present, weak pacing; 6–8: consistent structure, generally sustained pacing; 9–10: clear setup, rising tension, climax, and resolution.
- Author’s voice & style (weight: 0.15): 0–2: dull, indistinct; 3–5: voice appears sporadically; 6–8: recognizable voice with minor fluctuations; 9–10: vivid, cohesive voice appropriate to genre.
- Language mastery (weight: 0.1): 0–2: many errors, primitive vocabulary; 3–5: occasional errors, limited vocabulary; 6–8: rich lexicon, varied sentences, rare errors; 9–10: flawless language, precise word choice.
- Originality & engagement (weight: 0.1): 0–2: clichéd, emotionally flat; 3–5: some original elements; 6–8: engaging overall with a few fresh moves; 9–10: highly original and immersive.

The final JSON must contain the summary, an array of analysis objects for each criterion, and the final calculated score.`;

        const coherencePrompt = `Evaluate the provided literary text using the rubric below. Your response must be a JSON object that strictly adheres to the provided schema.

Task:
1. Read the text without consulting external sources.
2. Briefly (2–3 sentences) summarize the main plot and characters.
3. For each criterion, assign a score from 0 to 10 with a 1–2 sentence justification based on the descriptors.
4. Calculate the final score as the weighted sum of (criterion_score × weight), rounded to one decimal place.

Rubric (weights and descriptors):
- Plot coherence (across scenes, chapters, and book) (weight: 0.3): 0–2: incoherent, disjointed; 3–5: partially coherent with gaps; 6–8: mostly coherent, minor mismatches; 9–10: fully logical across scenes, chapters, and whole book.
- Character depth (weight: 0.2): 0–2: flat, unmotivated; 3–5: partial traits, weak motivation; 6–8: well-developed but with gaps; 9–10: multidimensional, consistent development.
- Narrative structure & pacing (weight: 0.15): 0–2: chaotic; 3–5: weak, uneven pacing; 6–8: mostly consistent, clear arc; 9–10: strong progression with setup, tension, climax, and resolution.
- Author’s voice & style (weight: 0.15): 0–2: indistinct; 3–5: sporadic; 6–8: recognizable, minor breaks; 9–10: vivid, cohesive, genre-appropriate.
- Language mastery (weight: 0.1): 0–2: many errors, weak vocabulary; 3–5: limited, some mistakes; 6–8: strong language, rare slips; 9–10: flawless, precise, stylistically polished.
- Originality & engagement (weight: 0.1): 0–2: clichéd, dull; 3–5: some originality; 6–8: generally engaging, some novelty; 9–10: highly original, immersive, emotionally impactful.

The final JSON must contain the summary, an array of analysis objects for each criterion, and the final calculated score.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                analysis: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            criterion: { type: Type.STRING },
                            score: { type: Type.NUMBER },
                            justification: { type: Type.STRING }
                        },
                        required: ["criterion", "score", "justification"]
                    }
                },
                finalScore: { type: Type.NUMBER }
            },
            required: ["summary", "analysis", "finalScore"]
        };

        try {
            const textToAnalyze = `\n\nText to analyze:\n"""\n${text}\n"""`;
            const [readabilityResult, coherenceResult] = await Promise.all([
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: readabilityPrompt + textToAnalyze,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    },
                }),
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: coherencePrompt + textToAnalyze,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    },
                })
            ]);
            
            const readabilityData = JSON.parse(readabilityResult.text);
            setReadabilityScore(readabilityData.finalScore.toFixed(1));
            setAnalysisSummary(readabilityData.summary);
            setAnalysisCriteria(readabilityData.analysis);

            const coherenceData = JSON.parse(coherenceResult.text);
            setCoherenceScore(coherenceData.finalScore.toFixed(1));
            setCoherenceSummary(coherenceData.summary);
            setCoherenceCriteria(coherenceData.analysis);

        } catch (e) {
            console.error("Failed to get metrics:", e);
            setError("Failed to analyze the text. The model may have returned an invalid response or an error occurred.");
            setReadabilityScore('?');
            setCoherenceScore('?');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div>
            {error && <div className="error-banner" style={{marginBottom: 'var(--space-3)'}}>{error}</div>}
            <div className="metrics-grid">
                <div className="metric-item">
                    <div className="metric-value">{wordCount}</div>
                    <div className="metric-label">Words</div>
                </div>
                 <div className="metric-item">
                    <div className="metric-value">{charCount}</div>
                    <div className="metric-label">Characters</div>
                </div>
                <div className="metric-item">
                    <div className="metric-value">{readabilityScore}</div>
                    <div className="metric-label">Readability</div>
                </div>
                <div className="metric-item">
                    <div className="metric-value">{coherenceScore}</div>
                    <div className="metric-label">Coherence</div>
                </div>
            </div>
            <div className="metrics-panel-footer">
                <Button variant="primary" onClick={handleUpdateMetrics} disabled={isLoading}>
                    {isLoading ? 'Analyzing...' : 'Update Metrics'}
                </Button>
            </div>
            {analysisSummary && (
                <div className="readability-report">
                    <h4 className="readability-report-title">Readability Report</h4>
                    <p>{analysisSummary}</p>
                    <table className="readability-table">
                        <thead>
                            <tr>
                                <th>Criterion</th>
                                <th>Score (0–10)</th>
                                <th>Justification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysisCriteria.map(item => (
                                <tr key={item.criterion}>
                                    <td>{item.criterion}</td>
                                    <td>{item.score}</td>
                                    <td>{item.justification}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {coherenceSummary && (
                <div className="readability-report">
                    <h4 className="readability-report-title">Coherence Report</h4>
                    <p>{coherenceSummary}</p>
                    <table className="readability-table">
                        <thead>
                            <tr>
                                <th>Criterion</th>
                                <th>Score (0–10)</th>
                                <th>Justification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coherenceCriteria.map(item => (
                                <tr key={item.criterion}>
                                    <td>{item.criterion}</td>
                                    <td>{item.score}</td>
                                    <td>{item.justification}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ImportPanel: FC<{ onTextImport: (text: string) => void }> = ({ onTextImport }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUrlImport = async () => {
        if (!url) {
            setError("Please enter a URL.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            setLoadingMessage('Fetching content...');
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlContent = await response.text();
            
            setLoadingMessage('Extracting article...');

            const extractionPrompt = `You are an expert web scraper. Your task is to extract the main article text from the provided HTML content. Remove all HTML tags, navigation menus, sidebars, advertisements, and footers. Return only the clean, plain text of the article.

HTML CONTENT:
"""
${htmlContent}
"""`;

            const extractionResult = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: extractionPrompt,
            });

            const extractedText = extractionResult.text;

            if (!extractedText || extractedText.trim().length < 50) {
                 throw new Error("Could not extract significant text. The page might not be an article.");
            }

            onTextImport(extractedText);
            setUrl('');

        } catch (e: any) {
            setError(`Import failed. This could be a network issue, CORS security restriction, or an issue extracting content. Error: ${e.message}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setError(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                onTextImport(text);
                if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            };
            reader.onerror = () => {
                setError("Failed to read the file.");
            };
            reader.readAsText(file);
        }
    };

    const handleChooseFileClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            {error && <div className="error-banner" style={{marginBottom: 'var(--space-3)', backgroundColor: '#ffebee', color: '#c62828', border: 'none', padding: 'var(--space-2)'}}>{error}</div>}
            <div className="form-group">
                <label className="form-label" htmlFor="import-url">Import from URL</label>
                <input 
                    className="input" 
                    type="url" 
                    id="import-url" 
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                />
                <Button 
                    variant="primary" 
                    style={{width: '100%', marginTop: '8px'}} 
                    onClick={handleUrlImport}
                    disabled={isLoading || !url}
                >
                    {isLoading ? loadingMessage : 'Import from URL'}
                </Button>
            </div>
            <hr style={{border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-4) 0'}} />
            <div className="form-group">
                <label className="form-label">Upload from computer</label>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{display: 'none'}} 
                    accept=".txt,.md"
                />
                <Button 
                    variant="neutral" 
                    style={{width: '100%'}} 
                    onClick={handleChooseFileClick}
                >
                    Choose file (.txt, .md)
                </Button>
            </div>
        </div>
    );
};


type ExportPanelProps = {
    manuscriptText: string;
    metadata: Metadata;
};

const ExportPanel: FC<ExportPanelProps> = ({ manuscriptText, metadata }) => {
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setCoverFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChooseFileClick = () => {
        fileInputRef.current?.click();
    };

    const getSanitizedTitle = () => (metadata.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const handleTextExport = (format: 'txt' | 'docx' | 'epub' | 'idml') => {
        const blob = new Blob([manuscriptText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${getSanitizedTitle()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePdfExport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow pop-ups to export as PDF.");
            return;
        }

        const content = `
            <html>
                <head>
                    <title>${metadata.title}</title>
                    <style>
                        @media print { @page { size: A4; margin: 2cm; } }
                        body { font-family: 'Times New Roman', Times, serif; margin: 0; line-height: 1.5; color: #000; }
                        h1, h2 { text-align: center; font-family: Arial, sans-serif; border-bottom: 1px solid #ccc; padding-bottom: 0.5em; margin-bottom: 1em; }
                        h1 { font-size: 24pt; }
                        h2 { font-size: 16pt; font-style: italic; border: none; }
                        .cover-image { max-width: 100%; height: auto; display: block; margin: 2em auto; page-break-after: always; }
                        pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 12pt; }
                    </style>
                </head>
                <body>
                    <h1>${metadata.title}</h1>
                    <h2>by ${metadata.author}</h2>
                    ${previewUrl ? `<img src="${previewUrl}" class="cover-image" alt="Cover" />` : ''}
                    <pre>${manuscriptText}</pre>
                </body>
            </html>`;
            
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500); // Give browser time to render content, especially the image
    };

    return (
        <div>
            <div className="form-group">
                <label className="form-label" htmlFor="cover-upload">Upload Cover (Optional)</label>
                <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    id="cover-upload"
                />
                <Button variant="neutral" onClick={handleChooseFileClick} style={{ width: '100%' }}>
                    {coverFile ? `Selected: ${coverFile.name}` : 'Choose Cover Image...'}
                </Button>
            </div>

            {previewUrl && (
                <div className="cover-preview">
                    <img src={previewUrl} alt="Cover preview" />
                </div>
            )}

            <hr style={{border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-4) 0'}} />
            <div className="export-buttons-stack">
                <Button variant="primary" style={{width: '100%'}} onClick={handlePdfExport}>Export to PDF</Button>
                <Button variant="primary" style={{width: '100%'}} onClick={() => handleTextExport('epub')}>Export to EPUB</Button>
                <Button variant="primary" style={{width: '100%'}} onClick={() => handleTextExport('docx')}>Export to DOCX</Button>
                <Button variant="primary" style={{width: '100%'}} onClick={() => handleTextExport('idml')}>Export to IDML</Button>
                <Button variant="primary" style={{width: '100%'}} onClick={() => handleTextExport('txt')}>Export to TXT</Button>
            </div>
        </div>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <div className="empty-state">{message}</div>
);

type HistoryPanelProps = {
    history: HistoryEntry[];
    onRevert: (id: number) => void;
};

const HistoryPanel: FC<HistoryPanelProps> = ({ history, onRevert }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const pastHistory = useMemo(() => history.slice(0, -1).reverse(), [history]);

    if (pastHistory.length === 0) {
        return <EmptyState message="No changes have been made yet." />;
    }

    const latestEntry = pastHistory[0];

    const typeToIcon: Record<HistoryEntry['type'], string> = {
        initial: '🎉',
        manual: '✏️',
        ai: '✨',
        suggestion: '💡',
        revert: '↩️',
        import: '📥',
    };

    return (
        <div className="history-dropdown">
            <button
                className="history-dropdown-header"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-controls="history-list"
            >
                <div className="history-item-main">
                    <span className="history-item-icon" aria-label={`${latestEntry.type} change`}>
                        {typeToIcon[latestEntry.type] || '📝'}
                    </span>
                    <div className="history-item-details">
                        <p className="history-item-description">{latestEntry.description}</p>
                        <span className="history-item-time">
                            Latest Change: {latestEntry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                <span className={`history-dropdown-arrow ${isExpanded ? 'expanded' : ''}`} aria-hidden="true">
                    ▼
                </span>
            </button>

            {isExpanded && (
                <div className="history-dropdown-content" id="history-list">
                    {pastHistory.map(entry => (
                        <div key={entry.id} className="history-item">
                            <div className="history-item-main">
                                <span className="history-item-icon" aria-label={`${entry.type} change`}>
                                    {typeToIcon[entry.type] || '📝'}
                                </span>
                                <div className="history-item-details">
                                    <p className="history-item-description">{entry.description}</p>
                                    <span className="history-item-time">
                                        {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                            <Button className="btn-sm" variant="neutral" onClick={() => onRevert(entry.id)}>Revert</Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- MAIN LAYOUT PANELS ---

type ChatPanelProps = {
    messages: ChatMessageData[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
};

const ChatPanel: FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => (
  <div className="panel chat-panel">
    <div className="panel-header">Proofline Agent</div>
    <QuickPhrases onSelectPhrase={onSendMessage} isLoading={isLoading}/>
    <div className="panel-content chat-messages">
      {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}
    </div>
    <ChatComposer onSendMessage={onSendMessage} isLoading={isLoading} />
  </div>
);

type EditorPanelProps = {
    text: string;
    onTextChange: (text: string) => void;
    error: string | null;
    annotations: Annotation[];
}

const EditorPanel: FC<EditorPanelProps> = ({ text, onTextChange, error, annotations }) => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return (
        <main className="panel editor-panel">
            {error && <div className="error-banner">{error}</div>}
            <EditorToolbar
                wordCount={wordCount}
                characterCount={text.length}
            />
            <EditableTextArea text={text} onTextChange={onTextChange} annotations={annotations}/>
        </main>
    );
}

type SidebarProps = {
    annotations: Annotation[];
    manuscriptText: string;
    history: HistoryEntry[];
    metadata: Metadata;
    onAcceptAnnotation: (annotation: Annotation) => void;
    onRejectAnnotation: (id: number) => void;
    onAcceptAll: () => void;
    onRejectAll: () => void;
    onRevertToHistory: (id: number) => void;
    onRunPipeline: () => void;
    isPipelineLoading: boolean;
    pipelineProgress: number;
    onSaveMetadata: (data: Metadata) => void;
    onTextImport: (text: string) => void;
}

const Sidebar: FC<SidebarProps> = ({ 
    annotations, 
    manuscriptText, 
    history, 
    metadata,
    onAcceptAnnotation, 
    onRejectAnnotation, 
    onAcceptAll, 
    onRejectAll, 
    onRevertToHistory,
    onRunPipeline,
    isPipelineLoading,
    pipelineProgress,
    onSaveMetadata,
    onTextImport
}) => {
    const [activeTab, setActiveTab] = useState('Annotations');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Annotations':
                return (
                    <>
                        <div className="run-pipeline-container">
                            <ProgressBar value={pipelineProgress} className={pipelineProgress > 0 && pipelineProgress < 100 ? 'visible' : ''} />
                            <Button variant="primary" onClick={onRunPipeline} disabled={isPipelineLoading} style={{ width: '100%' }}>
                                {isPipelineLoading ? 'Running...' : 'Run Pipeline'}
                            </Button>
                        </div>
                        {annotations.length > 0 ? (
                            <>
                              <div className="annotation-bulk-actions">
                                <Button variant="success" onClick={onAcceptAll}>Accept All</Button>
                                <Button variant="danger" onClick={onRejectAll}>Reject All</Button>
                              </div>
                              {annotations.map(ann => <AnnotationCard key={ann.id} annotation={ann} onAccept={onAcceptAnnotation} onReject={onRejectAnnotation} />)}
                            </>
                          ) : (
                            <EmptyState message="No annotations yet. Run the pipeline to generate them." />
                          )
                        }
                    </>
                  );
            case 'History':
                return <HistoryPanel history={history} onRevert={onRevertToHistory} />;
            case 'Metadata':
                return <MetadataForm initialData={metadata} onSave={onSaveMetadata} />;
            case 'Metrics':
                return <MetricsPanel text={manuscriptText} />;
            case 'Import':
                return <ImportPanel onTextImport={onTextImport} />;
            case 'Export':
                return <ExportPanel manuscriptText={manuscriptText} metadata={metadata} />;
            case 'About':
                return <About />;
            default:
                return null;
        }
    };

    return (
        <aside className="panel sidebar">
            <div className="tabs">
                <button className={`tab-button ${activeTab === 'Annotations' ? 'active' : ''}`} onClick={() => setActiveTab('Annotations')}>Annotations</button>
                <button className={`tab-button ${activeTab === 'History' ? 'active' : ''}`} onClick={() => setActiveTab('History')}>History</button>
                <button className={`tab-button ${activeTab === 'Metadata' ? 'active' : ''}`} onClick={() => setActiveTab('Metadata')}>Metadata</button>
                <button className={`tab-button ${activeTab === 'Metrics' ? 'active' : ''}`} onClick={() => setActiveTab('Metrics')}>Metrics</button>
                <button className={`tab-button ${activeTab === 'Import' ? 'active' : ''}`} onClick={() => setActiveTab('Import')}>Import</button>
                <button className={`tab-button ${activeTab === 'Export' ? 'active' : ''}`} onClick={() => setActiveTab('Export')}>Export</button>
                <button className={`tab-button ${activeTab === 'About' ? 'active' : ''}`} onClick={() => setActiveTab('About')}>About</button>
            </div>
            <div className="tab-content">
                {renderTabContent()}
            </div>
        </aside>
    );
};

// --- APP ---

const generateChangeSummary = async (oldText: string, newText: string): Promise<string> => {
    if (oldText === newText) return "No changes made.";
    // Limit text length to avoid large API requests for small changes.
    const prompt = `You are an expert at summarizing document changes. Below are two versions of a text, 'OLD' and 'NEW'. Briefly describe what was changed to get from OLD to NEW. Focus on the substance (e.g., 'Corrected a typo in the first paragraph', 'Rewrote the sentence about Winston', 'Added a new paragraph about the hallway'). Be very concise, your response should be a short phrase, like a git commit message.

OLD:
---
${oldText.slice(0, 2000)}
---

NEW:
---
${newText.slice(0, 2000)}
---

Change Description:`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // For this simple, factual task, we can disable thinking for speed
                // and use a low temperature for deterministic output.
                thinkingConfig: { thinkingBudget: 0 },
                temperature: 0.1,
                topK: 1
            }
        });
        const summary = result.text.trim();
        // Return a fallback if the model gives an empty or weird response.
        return summary || 'Manual Edit';
    } catch (error) {
        console.error("Error generating change summary:", error);
        return 'Manual Edit'; // Fallback on API error
    }
};


const App = () => {
  // Load manuscript from localStorage on component mount, fallback to initial text
  const [manuscriptText, setManuscriptText] = useState(() => {
    try {
      const saved = localStorage.getItem('proofline-manuscript');
      return saved || INITIAL_TEXT;
    } catch (error) {
      console.warn('Failed to load manuscript from localStorage:', error);
      return INITIAL_TEXT;
    }
  });
  // Load history from localStorage on component mount
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>(() => {
    try {
      const savedHistory = localStorage.getItem('proofline-history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        return parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load history from localStorage:', error);
    }

    // Fallback to initial history
    const initialText = localStorage.getItem('proofline-manuscript') || INITIAL_TEXT;
    return [{ id: Date.now(), timestamp: new Date(), text: initialText, description: 'Initial Document', type: 'initial' }];
  });
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([
    { id: 'init-1', sender: 'agent', name: 'Proofline Agent', avatar: 'PA', text: 'Hello! I am ready to help analyze and edit your manuscript. Paste the text into the central panel or use the existing text to get started.' },
  ]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPipelineLoading, setIsPipelineLoading] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata>({
    title: 'Untitled Document',
    author: 'Unknown Author',
    language: 'English',
    coverUrl: '',
  });

  const chat = useMemo(() => {
      const editingTools = {
        functionDeclarations: [
          {
            name: 'replaceWord',
            description: 'Replace a single word or short phrase in the manuscript.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                originalWord: {
                  type: Type.STRING,
                  description: 'The exact word or phrase to be replaced.',
                },
                newWord: {
                  type: Type.STRING,
                  description: 'The word or phrase to replace the original one.',
                },
              },
              required: ['originalWord', 'newWord'],
            },
          },
          {
            name: 'replaceSentence',
            description: 'Replace an entire sentence in the manuscript.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                originalSentence: {
                  type: Type.STRING,
                  description: 'The exact, full sentence to be replaced.',
                },
                newSentence: {
                  type: Type.STRING,
                  description: 'The new sentence to replace the original one.',
                },
              },
              required: ['originalSentence', 'newSentence'],
            },
          },
          {
            name: 'replaceParagraph',
            description: 'Replace an entire paragraph in the manuscript.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                originalParagraph: {
                  type: Type.STRING,
                  description: 'The exact, full paragraph to be replaced. Paragraphs are separated by two newlines.',
                },
                newParagraph: {
                  type: Type.STRING,
                  description: 'The new paragraph to replace the original one.',
                },
              },
              required: ['originalParagraph', 'newParagraph'],
            },
          },
          {
            name: 'analyzeManuscript',
            description: 'Create a comprehensive index of the manuscript including chapter boundaries, character appearances, and basic statistics. This tool must be called before using other manuscript analysis tools.',
            parameters: {
              type: Type.OBJECT,
              properties: {},
              required: [],
            },
          },
          {
            name: 'rewriteChapter',
            description: 'Rewrite a specific chapter to improve its quality. Uses sliding window analysis with adjacent chapters for context. Automatically assesses quality and provides improvement guarantees.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: {
                  type: Type.NUMBER,
                  description: 'The chapter number to rewrite (1, 2, 3, etc.).',
                },
                intensity: {
                  type: Type.STRING,
                  description: 'Rewriting intensity level: "light" for minor polish, "moderate" for significant improvements, "comprehensive" for major overhaul.',
                  enum: ['light', 'moderate', 'comprehensive'],
                },
                preserveDialogue: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Array of specific dialogue lines that must be preserved exactly during rewriting.',
                },
              },
              required: ['chapterNumber'],
            },
          },
          {
            name: 'validateChapterSequence',
            description: 'Validate logical continuity between chapters, checking for character consistency, timeline issues, and narrative flow problems.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                chapterNumber: {
                  type: Type.NUMBER,
                  description: 'The chapter number to validate against its surrounding chapters.',
                },
              },
              required: ['chapterNumber'],
            },
          },
          {
            name: 'buildCharacterProfile',
            description: 'Create a detailed character profile including traits, speech patterns, behavioral rules, and current state for consistency checking.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                characterName: {
                  type: Type.STRING,
                  description: 'The name of the character to profile.',
                },
              },
              required: ['characterName'],
            },
          },
          {
            name: 'translateText',
            description: 'Translate manuscript text or sections to a target language while preserving literary style, character names, and formatting.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                targetLanguage: {
                  type: Type.STRING,
                  description: 'The target language to translate to (e.g., "Spanish", "French", "German").',
                },
                sourceLanguage: {
                  type: Type.STRING,
                  description: 'The source language (optional, will auto-detect if not specified).',
                },
                section: {
                  type: Type.STRING,
                  description: 'What to translate: "full" for entire manuscript, "selection" for provided context, "chapter" for specific chapter.',
                  enum: ['full', 'selection', 'chapter'],
                },
                chapterNumber: {
                  type: Type.NUMBER,
                  description: 'Chapter number to translate (required if section is "chapter").',
                },
                preserveNames: {
                  type: Type.BOOLEAN,
                  description: 'Whether to preserve character names and proper nouns (default: true).',
                },
              },
              required: ['targetLanguage'],
            },
          },
        ],
      };

      return ai.chats.create({
        model: 'gemini-2.5-flash',
// FIX: The 'tools' property should be inside the 'config' object.
        config: {
            systemInstruction: `You are an expert AI manuscript editor.
You will be provided with relevant snippets from a larger manuscript under a "CONTEXT" section, followed by a user "REQUEST". Your task is to analyze the request and use your tools to modify the text based *only* on the provided context.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze the Request & Context:** Carefully read the user's request and the provided manuscript context.
2.  **Use Tools for Edits:** If the user asks to modify the manuscript, you MUST use one of the provided tools: \`replaceWord\`, \`replaceSentence\`, or \`replaceParagraph\`.
    - Find the exact original text *within the provided CONTEXT* to use as the 'original' parameter for the tool. The tool will then apply this change to the full document.
    - Be precise. Use the most appropriate tool for the job.
3.  **Conversational Responses:** If the user asks a question, wants a comment, or you have finished using a tool, respond conversationally as a helpful assistant. DO NOT use tools for simple conversation.`,
// FIX: Wrap the 'editingTools' object in an array to match the expected type 'ToolUnion[]'.
            tools: [editingTools],
        },
      });
  }, []);

  const addHistoryEntry = (newText: string, description: string, type: HistoryEntry['type']) => {
    setHistoryStack(prev => {
      // Prevent adding a new history state if the text hasn't changed.
      if (prev.length > 0 && prev[prev.length - 1].text === newText) {
        return prev;
      }

      const newHistory = [...prev, { id: Date.now(), timestamp: new Date(), text: newText, description, type }];

      // Save history to localStorage
      try {
        localStorage.setItem('proofline-history', JSON.stringify(newHistory));
      } catch (error) {
        console.warn('Failed to save history to localStorage:', error);
      }

      return newHistory;
    });
  };

  const updateManuscriptAndHistory = (newText: string, description: string, type: HistoryEntry['type']) => {
    setManuscriptText(newText);

    // Save to localStorage
    try {
      localStorage.setItem('proofline-manuscript', newText);
    } catch (error) {
      console.warn('Failed to save manuscript to localStorage:', error);
    }

    addHistoryEntry(newText, description, type);
  };
  
  // --- Tool Implementations ---
  const applyReplaceWord = ({ originalWord, newWord }: { originalWord: string; newWord: string; }) => {
    if (!manuscriptText.includes(originalWord)) {
      return { success: false, error: `Could not find the word "${originalWord}" to replace.` };
    }
    const newText = manuscriptText.replace(originalWord, newWord);
    const description = `AI replaced "${originalWord}" with "${newWord}"`;
    updateManuscriptAndHistory(newText, description, 'ai');
    return { success: true, result: `Replaced "${originalWord}" with "${newWord}".` };
  };

  const applyReplaceSentence = ({ originalSentence, newSentence }: { originalSentence: string; newSentence: string; }) => {
    if (!manuscriptText.includes(originalSentence)) {
      return { success: false, error: `Could not find the sentence "${originalSentence.substring(0, 30)}..." to replace.` };
    }
    const newText = manuscriptText.replace(originalSentence, newSentence);
    const description = `AI replaced sentence: "${originalSentence.substring(0, 30)}..."`;
    updateManuscriptAndHistory(newText, description, 'ai');
    return { success: true, result: `Replaced the sentence.` };
  };
  
  const applyReplaceParagraph = ({ originalParagraph, newParagraph }: { originalParagraph: string; newParagraph: string; }) => {
    if (!manuscriptText.includes(originalParagraph)) {
      return { success: false, error: `Could not find the paragraph starting with "${originalParagraph.substring(0, 30)}..." to replace.` };
    }
    const newText = manuscriptText.replace(originalParagraph, newParagraph);
    const description = `AI replaced paragraph starting with: "${originalParagraph.substring(0, 30)}..."`;
    updateManuscriptAndHistory(newText, description, 'ai');
    return { success: true, result: `Replaced the paragraph.` };
  };

  // --- MANUSCRIPT TOOL HANDLERS ---

  const applyAnalyzeManuscript = () => {
    try {
      const index = manuscriptIndexer.createIndex(manuscriptText);
      manuscriptIndexCache = index; // Cache for other tools

      const result = [
        `Manuscript Analysis Complete:`,
        ``,
        `📊 Structure:`,
        `- Total chapters: ${index.chapters.length}`,
        `- Total words: ${index.totalWordCount.toLocaleString()}`,
        `- Average chapter length: ${index.averageChapterLength} words`,
        ``,
        `📖 Chapters detected:`,
        ...index.chapters.slice(0, 10).map(ch =>
          `  ${ch.chapterNumber}. ${ch.title || 'Untitled'} (${ch.wordCount} words, confidence: ${(ch.confidence * 100).toFixed(0)}%)`
        ),
        index.chapters.length > 10 ? `  ... and ${index.chapters.length - 10} more chapters` : '',
        ``,
        `👥 Characters identified:`,
        ...index.characters.slice(0, 10).map(char =>
          `  - ${char.name}: ${char.totalMentions} mentions across ${char.chapters.length} chapters`
        ),
        index.characters.length > 10 ? `  ... and ${index.characters.length - 10} more characters` : '',
      ].filter(Boolean).join('\n');

      return { success: true, result };
    } catch (error) {
      return { success: false, error: `Failed to analyze manuscript: ${(error as Error).message}` };
    }
  };

  const applyRewriteChapter = ({ chapterNumber, intensity = 'moderate', preserveDialogue = [] }: {
    chapterNumber: number;
    intensity?: string;
    preserveDialogue?: string[];
  }) => {
    try {
      if (!manuscriptIndexCache) {
        return { success: false, error: 'Please run analyzeManuscript first to index the chapters.' };
      }

      const result = chapterRewriter.rewrite(
        manuscriptText,
        chapterNumber,
        intensity as 'light' | 'moderate' | 'comprehensive',
        preserveDialogue,
        manuscriptIndexCache,
        contextCache
      );

      if (!result.success) {
        return { success: false, error: result.error || 'Rewriting failed' };
      }

      // Update the manuscript with the rewritten chapter
      const targetChapter = manuscriptIndexCache.chapters.find(c => c.chapterNumber === chapterNumber);
      if (targetChapter && result.rewrittenText) {
        const before = manuscriptText.slice(0, targetChapter.startPosition);
        const after = manuscriptText.slice(targetChapter.endPosition);
        const newManuscript = before + result.rewrittenText + after;

        const description = `AI rewrote Chapter ${chapterNumber} (${intensity} intensity, quality: ${(result.originalQuality * 100).toFixed(1)}% → ${(result.newQuality * 100).toFixed(1)}%)`;
        updateManuscriptAndHistory(newManuscript, description, 'ai');

        // Clear cache since manuscript changed
        manuscriptIndexCache = null;
        contextCache.clearCache();
      }

      const improvement = ((result.newQuality - result.originalQuality) * 100).toFixed(1);
      const responseMessage = [
        `✅ Successfully rewrote Chapter ${chapterNumber} with ${intensity} intensity`,
        ``,
        `📈 Quality Improvement:`,
        `- Original quality: ${(result.originalQuality * 100).toFixed(1)}%`,
        `- New quality: ${(result.newQuality * 100).toFixed(1)}%`,
        `- Improvement: +${improvement}%`,
        ``,
        `🔧 Changes made:`,
        ...result.changesSummary.map(change => `- ${change}`),
        preserveDialogue.length > 0 ? `\n💬 Preserved ${preserveDialogue.length} dialogue segments as requested` : '',
      ].filter(Boolean).join('\n');

      return { success: true, result: responseMessage };

    } catch (error) {
      return { success: false, error: `Failed to rewrite chapter: ${(error as Error).message}` };
    }
  };

  const applyValidateChapterSequence = ({ chapterNumber }: { chapterNumber: number }) => {
    try {
      if (!manuscriptIndexCache) {
        return { success: false, error: 'Please run analyzeManuscript first to index the chapters.' };
      }

      const validation = chapterSequenceValidator.validate(
        manuscriptText,
        chapterNumber,
        manuscriptIndexCache,
        contextCache
      );

      if (validation.isValid) {
        return {
          success: true,
          result: `✅ Chapter ${chapterNumber} sequence validation passed - no continuity issues detected.`
        };
      }

      const issuesSummary = [
        `⚠️ Chapter ${chapterNumber} has continuity issues:`,
        ``,
        validation.characterInconsistencies.length > 0 ? `👥 Character Issues:` : '',
        ...validation.characterInconsistencies.map(issue => `- ${issue}`),
        validation.timelineIssues.length > 0 ? `\n⏰ Timeline Issues:` : '',
        ...validation.timelineIssues.map(issue => `- ${issue}`),
        validation.emotionalJumps.length > 0 ? `\n💭 Emotional Continuity Issues:` : '',
        ...validation.emotionalJumps.map(issue => `- ${issue}`),
        validation.knowledgeGaps.length > 0 ? `\n🧠 Knowledge Continuity Issues:` : '',
        ...validation.knowledgeGaps.map(issue => `- ${issue}`),
        ``,
        `💡 Consider reviewing these issues and using the rewriteChapter tool to address them.`
      ].filter(Boolean).join('\n');

      return { success: true, result: issuesSummary };

    } catch (error) {
      return { success: false, error: `Failed to validate chapter sequence: ${(error as Error).message}` };
    }
  };

  const applyBuildCharacterProfile = ({ characterName }: { characterName: string }) => {
    try {
      if (!manuscriptIndexCache) {
        return { success: false, error: 'Please run analyzeManuscript first to index the characters.' };
      }

      const profile = characterProfileBuilder.buildProfile(characterName, manuscriptText, manuscriptIndexCache);

      const profileSummary = [
        `👤 Character Profile: ${profile.name}`,
        ``,
        `📍 Appearances: Chapter ${Math.min(...manuscriptIndexCache.characters.find(c => c.name === characterName)?.chapters || [])} to ${profile.lastChapterAppearance}`,
        ``,
        `🎭 Traits:`,
        profile.traits.length > 0 ? profile.traits.map(trait => `- ${trait}`).join('\n') : '- No specific traits identified',
        ``,
        `🗣️ Speech Patterns:`,
        profile.speechPatterns.length > 0 ? profile.speechPatterns.map(pattern => `- ${pattern}`).join('\n') : '- No specific patterns identified',
        ``,
        `⚖️ Behavioral Rules:`,
        profile.behaviorRules.length > 0 ? profile.behaviorRules.map(rule => `- ${rule}`).join('\n') : '- No specific rules identified',
        ``,
        `😊 Current Emotional State: ${profile.emotionalState}`,
        ``,
        `🧠 Knowledge State:`,
        profile.knowledgeState.length > 0 ? profile.knowledgeState.slice(0, 5).map(knowledge => `- ${knowledge}`).join('\n') : '- No specific knowledge tracked',
        profile.knowledgeState.length > 5 ? `- ... and ${profile.knowledgeState.length - 5} more items` : '',
      ].filter(Boolean).join('\n');

      return { success: true, result: profileSummary };

    } catch (error) {
      return { success: false, error: `Failed to build character profile: ${(error as Error).message}` };
    }
  };

  const applyTranslateText = async ({
    targetLanguage,
    sourceLanguage,
    section = 'selection',
    chapterNumber
  }: {
    targetLanguage: string;
    sourceLanguage?: string;
    section?: string;
    chapterNumber?: number;
    preserveNames?: boolean;
  }) => {
    try {
      let textToTranslate = '';

      if (section === 'full') {
        textToTranslate = manuscriptText;
      } else if (section === 'chapter') {
        if (!chapterNumber) {
          return { success: false, error: 'Chapter number is required for chapter translation.' };
        }
        if (!manuscriptIndexCache) {
          return { success: false, error: 'Please run analyzeManuscript first to identify chapters.' };
        }

        const result = await manuscriptTranslator.translateChapter(
          manuscriptText,
          chapterNumber,
          targetLanguage,
          manuscriptIndexCache.chapters
        );

        if (!result.success) {
          return { success: false, error: result.error };
        }

        // Update the manuscript with translated chapter
        const targetChapter = manuscriptIndexCache.chapters.find(c => c.chapterNumber === chapterNumber);
        if (targetChapter && result.translatedText) {
          const before = manuscriptText.slice(0, targetChapter.startPosition);
          const after = manuscriptText.slice(targetChapter.endPosition);
          const newManuscript = before + result.translatedText + after;

          const description = `AI translated Chapter ${chapterNumber} from ${result.sourceLanguage} to ${targetLanguage} (confidence: ${result.confidence}%)`;
          updateManuscriptAndHistory(newManuscript, description, 'ai');

          // Clear cache since manuscript changed
          manuscriptIndexCache = null;
          contextCache.clearCache();
        }

        const responseMessage = [
          `✅ Successfully translated Chapter ${chapterNumber}`,
          ``,
          `🌐 Translation Details:`,
          `- Source language: ${result.sourceLanguage}`,
          `- Target language: ${targetLanguage}`,
          `- Word count: ${result.wordCount} → ${result.translatedWordCount}`,
          `- Confidence: ${result.confidence}%`,
          result.preservedElements && result.preservedElements.length > 0
            ? `\n📝 Preserved elements: ${result.preservedElements.slice(0, 5).join(', ')}${result.preservedElements.length > 5 ? '...' : ''}`
            : '',
        ].filter(Boolean).join('\n');

        return { success: true, result: responseMessage };

      } else if (section === 'paragraph') {
        // This will be handled by the new translateParagraph function
        return { success: false, error: 'Use translateParagraph tool for paragraph translation.' };
      } else if (section === 'sentence') {
        // This will be handled by the new translateSentence function
        return { success: false, error: 'Use translateSentence tool for sentence translation.' };
      } else {
        // For 'selection', use the full manuscript for now
        // TODO: In the future, this could be improved to handle specific text selections
        textToTranslate = manuscriptText;
      }

      // Use batch translation for large texts
      const result = await manuscriptTranslator.translateInBatches(
        textToTranslate,
        targetLanguage,
        sourceLanguage,
        4000 // 4KB chunks
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Replace the manuscript text with translation for both 'full' and 'selection'
      const description = section === 'full'
        ? `AI translated entire manuscript from ${result.sourceLanguage} to ${targetLanguage} (confidence: ${result.confidence}%)`
        : `AI translated text from ${result.sourceLanguage} to ${targetLanguage} (confidence: ${result.confidence}%)`;

      updateManuscriptAndHistory(result.translatedText!, description, 'ai');

      // Clear cache since manuscript changed
      manuscriptIndexCache = null;
      contextCache.clearCache();

      const responseMessage = [
        `✅ Successfully translated ${section === 'full' ? 'entire manuscript' : 'text'}`,
        ``,
        `🌐 Translation Details:`,
        `- Source language: ${result.sourceLanguage}`,
        `- Target language: ${targetLanguage}`,
        `- Word count: ${result.wordCount} → ${result.translatedWordCount}`,
        `- Confidence: ${result.confidence}%`,
        result.preservedElements && result.preservedElements.length > 0
          ? `\n📝 Preserved elements: ${result.preservedElements.slice(0, 5).join(', ')}${result.preservedElements.length > 5 ? '...' : ''}`
          : '',
        `\n📄 The manuscript has been replaced with the translation.`,
      ].filter(Boolean).join('\n');

      return { success: true, result: responseMessage };

    } catch (error) {
      return { success: false, error: `Translation failed: ${(error as Error).message}` };
    }
  };

  // New function for translating specific sentences
  const applyTranslateSentence = async ({
    originalSentence,
    targetLanguage,
    sourceLanguage
  }: {
    originalSentence: string;
    targetLanguage: string;
    sourceLanguage?: string;
  }) => {
    try {
      if (!manuscriptText.includes(originalSentence)) {
        return { success: false, error: `Could not find the sentence "${originalSentence.substring(0, 50)}..." in the manuscript.` };
      }

      const translationOptions = {
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
        preserveFormatting: true,
        preserveDialogue: true,
        translationQuality: 'balanced' as const
      };

      const result = await manuscriptTranslator.translateText(originalSentence, translationOptions);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const newText = manuscriptText.replace(originalSentence, result.translatedText!);
      const description = `AI translated sentence from ${result.sourceLanguage} to ${targetLanguage}`;
      updateManuscriptAndHistory(newText, description, 'ai');

      // Clear cache since manuscript changed
      manuscriptIndexCache = null;
      contextCache.clearCache();

      return {
        success: true,
        result: `✅ Successfully translated sentence from ${result.sourceLanguage} to ${targetLanguage}\n\nOriginal: "${originalSentence}"\nTranslated: "${result.translatedText}"`
      };

    } catch (error) {
      return { success: false, error: `Sentence translation failed: ${(error as Error).message}` };
    }
  };

  // New function for translating specific paragraphs
  const applyTranslateParagraph = async ({
    originalParagraph,
    targetLanguage,
    sourceLanguage
  }: {
    originalParagraph: string;
    targetLanguage: string;
    sourceLanguage?: string;
  }) => {
    try {
      if (!manuscriptText.includes(originalParagraph)) {
        return { success: false, error: `Could not find the paragraph starting with "${originalParagraph.substring(0, 50)}..." in the manuscript.` };
      }

      const translationOptions = {
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
        preserveFormatting: true,
        preserveDialogue: true,
        translationQuality: 'balanced' as const
      };

      const result = await manuscriptTranslator.translateText(originalParagraph, translationOptions);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const newText = manuscriptText.replace(originalParagraph, result.translatedText!);
      const description = `AI translated paragraph from ${result.sourceLanguage} to ${targetLanguage}`;
      updateManuscriptAndHistory(newText, description, 'ai');

      // Clear cache since manuscript changed
      manuscriptIndexCache = null;
      contextCache.clearCache();

      return {
        success: true,
        result: `✅ Successfully translated paragraph from ${result.sourceLanguage} to ${targetLanguage}\n\nWord count: ${originalParagraph.split(/\s+/).length} → ${result.translatedText!.split(/\s+/).length} words\nConfidence: ${result.confidence}%`
      };

    } catch (error) {
      return { success: false, error: `Paragraph translation failed: ${(error as Error).message}` };
    }
  };

  // New function for whole book rewriting
  const applyRewriteWholeBook = ({
    targetQuality = 0.8,
    preserveStructure = true,
    enhancePlotConsistency = true,
    improveCharacterArcs = true,
    balancePacing = true,
    strengthenThemes = [],
    preserveDialogue = [],
    preservePlotPoints = []
  }: {
    targetQuality?: number;
    preserveStructure?: boolean;
    enhancePlotConsistency?: boolean;
    improveCharacterArcs?: boolean;
    balancePacing?: boolean;
    strengthenThemes?: string[];
    preserveDialogue?: string[];
    preservePlotPoints?: string[];
  }) => {
    try {
      if (!manuscriptIndexCache) {
        manuscriptIndexCache = manuscriptIndexer.createIndex(manuscriptText);
      }

      const options: WholeBookRewriteOptions = {
        targetQuality,
        preserveStructure,
        enhancePlotConsistency,
        improveCharacterArcs,
        balancePacing,
        strengthenThemes,
        preserveDialogue,
        preservePlotPoints
      };

      const result = chapterRewriter.rewriteWholeBook(
        manuscriptText,
        manuscriptIndexCache,
        options
      );

      if (result.success && result.rewrittenManuscript) {
        const description = `AI rewrote entire book (quality: ${(result.originalQuality * 100).toFixed(1)}% → ${(result.newQuality * 100).toFixed(1)}%)`;
        updateManuscriptAndHistory(result.rewrittenManuscript, description, 'ai');

        // Clear cache to force re-indexing
        manuscriptIndexCache = null;
        contextCache.clearCache();

        const summary = [
          `✅ Whole book rewrite completed successfully!`,
          ``,
          `📊 Quality Improvement:`,
          `- Before: ${(result.originalQuality * 100).toFixed(1)}%`,
          `- After: ${(result.newQuality * 100).toFixed(1)}%`,
          `- Modified ${result.chaptersModified.length} chapters`,
          ``,
          result.plotThreadsImproved.length > 0 ? `🎭 Plot threads improved: ${result.plotThreadsImproved.join(', ')}` : '',
          result.characterArcsEnhanced.length > 0 ? `👥 Character arcs enhanced: ${result.characterArcsEnhanced.join(', ')}` : '',
          ``,
          `📝 Key changes:`,
          ...result.changesSummary.slice(0, 5).map(change => `• ${change}`)
        ].filter(Boolean);

        return { success: true, result: summary.join('\n') };
      } else {
        return { success: false, error: result.error || 'Unknown error occurred' };
      }
    } catch (error) {
      return { success: false, error: `Whole book rewrite failed: ${(error as Error).message}` };
    }
  };

  // New function for global character replacement
  const applyReplaceCharacterGlobally = ({
    oldName,
    newName
  }: {
    oldName: string;
    newName: string;
  }) => {
    try {
      if (!manuscriptIndexCache) {
        manuscriptIndexCache = manuscriptIndexer.createIndex(manuscriptText);
      }

      const result = globalManuscriptEditor.replaceCharacterGlobally(
        manuscriptText,
        manuscriptIndexCache,
        oldName,
        newName
      );

      const description = `AI replaced character "${oldName}" with "${newName}" globally (${result.changes} changes)`;
      updateManuscriptAndHistory(result.manuscript, description, 'ai');

      // Clear cache to force re-indexing
      manuscriptIndexCache = null;
      contextCache.clearCache();

      const responseMessage = [
        `✅ Successfully replaced "${oldName}" with "${newName}" throughout the manuscript`,
        ``,
        `📊 Changes made: ${result.changes}`,
        `📄 The manuscript has been updated with all character name changes.`
      ].join('\n');

      return { success: true, result: responseMessage };
    } catch (error) {
      return { success: false, error: `Global character replacement failed: ${(error as Error).message}` };
    }
  };

  // New function for analyzing book structure
  const applyAnalyzeBookStructure = () => {
    try {
      if (!manuscriptIndexCache) {
        manuscriptIndexCache = manuscriptIndexer.createIndex(manuscriptText);
      }

      const structure = bookStructureAnalyzer.analyzeStructure(manuscriptText, manuscriptIndexCache);

      const analysis = [
        `📖 Book Structure Analysis`,
        ``,
        `📊 Basic Statistics:`,
        `• ${structure.index.chapters.length} chapters`,
        `• ${structure.index.totalWordCount.toLocaleString()} total words`,
        `• ${structure.index.averageChapterLength.toLocaleString()} average words per chapter`,
        `• ${structure.index.characters.length} main characters`,
        ``,
        `🎭 Plot Analysis:`,
        `• ${structure.plotThreads.length} plot threads identified`,
        ...structure.plotThreads.slice(0, 3).map(thread =>
          `  - ${thread.name}: ${thread.status} (Chapters ${thread.startChapter}-${thread.endChapter})`
        ),
        structure.plotThreads.length > 3 ? `  - ... and ${structure.plotThreads.length - 3} more` : '',
        ``,
        `👥 Character Arcs:`,
        ...structure.characterArcs.slice(0, 3).map(arc =>
          `• ${arc.character}: ${arc.startState} → ${arc.endState} (Consistency: ${(arc.consistency * 100).toFixed(0)}%)`
        ),
        structure.characterArcs.length > 3 ? `• ... and ${structure.characterArcs.length - 3} more characters` : '',
        ``,
        `⚡ Pacing: ${structure.pacing.overall}`,
        `• Action/Dialogue ratio: ${(structure.pacing.actionToDialogueRatio * 100).toFixed(1)}%`,
        ``,
        `🎨 Major Themes:`,
        ...structure.thematicElements.slice(0, 3).map(theme =>
          `• ${theme.theme}: appears in ${theme.chapters.length} chapters (strength: ${(theme.strength * 100).toFixed(0)}%)`
        ),
        structure.thematicElements.length > 3 ? `• ... and ${structure.thematicElements.length - 3} more themes` : ''
      ].filter(Boolean);

      return { success: true, result: analysis.join('\n') };
    } catch (error) {
      return { success: false, error: `Book structure analysis failed: ${(error as Error).message}` };
    }
  };

  const debouncedSummarizeAndSave = useMemo(
    () =>
      debounce(async (newText: string, oldText: string) => {
        if (newText === oldText) {
          return;
        }
        const summary = await generateChangeSummary(oldText, newText);
        addHistoryEntry(newText, summary, 'manual');
      }, 2500), // Increased delay to account for API call and user pauses
    [] // Empty deps: function is created only once.
  );

  const handleTextChange = (newText: string) => {
    const oldText = manuscriptText;
    setManuscriptText(newText); // Update UI immediately for responsiveness

    // Save to localStorage
    try {
      localStorage.setItem('proofline-manuscript', newText);
    } catch (error) {
      console.warn('Failed to save manuscript to localStorage:', error);
    }

    debouncedSummarizeAndSave(newText, oldText);
  };

  const handleRevertToHistory = (id: number) => {
    const historyEntry = historyStack.find(entry => entry.id === id);
    if (historyEntry) {
        const description = `Reverted to: "${historyEntry.description.substring(0, 25)}..."`;
        updateManuscriptAndHistory(historyEntry.text, description, 'revert');
    }
  };

  const handleSendMessage = async (messageText: string) => {
    setIsChatLoading(true);
    setError(null);

    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      sender: 'user',
      name: 'Author',
      avatar: 'A',
      text: messageText,
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Enhanced context retrieval using structured search
    const relevantChunks = getStructuredContext(messageText, manuscriptText);
    const contextString = relevantChunks.join('\n\n---\n\n');

    const promptWithContext = `Here is the relevant context from the manuscript based on my request:\n\nCONTEXT:\n"""\n${contextString}\n"""\n\nREQUEST: ${messageText}`;
    
    try {
        let response = await chat.sendMessage({ message: promptWithContext });

        // Handle function calls if they exist
        if (response.functionCalls && response.functionCalls.length > 0) {
            const functionCalls = response.functionCalls;
            const toolResponses = [];

            // FIX: Refactored loop to correctly infer union types for tool responses and prevent type errors.
            for (const call of functionCalls) {
                let callResult: any;
                if (call.name === 'replaceWord') {
                    callResult = applyReplaceWord(call.args as any);
                } else if (call.name === 'replaceSentence') {
                    callResult = applyReplaceSentence(call.args as any);
                } else if (call.name === 'replaceParagraph') {
                    callResult = applyReplaceParagraph(call.args as any);
                } else if (call.name === 'analyzeManuscript') {
                    callResult = applyAnalyzeManuscript();
                } else if (call.name === 'rewriteChapter') {
                    callResult = applyRewriteChapter(call.args as any);
                } else if (call.name === 'validateChapterSequence') {
                    callResult = applyValidateChapterSequence(call.args as any);
                } else if (call.name === 'buildCharacterProfile') {
                    callResult = applyBuildCharacterProfile(call.args as any);
                } else if (call.name === 'translateText') {
                    callResult = await applyTranslateText(call.args as any);
                } else if (call.name === 'translateSentence') {
                    callResult = await applyTranslateSentence(call.args as any);
                } else if (call.name === 'translateParagraph') {
                    callResult = await applyTranslateParagraph(call.args as any);
                } else if (call.name === 'rewriteWholeBook') {
                    callResult = applyRewriteWholeBook(call.args as any);
                } else if (call.name === 'replaceCharacterGlobally') {
                    callResult = applyReplaceCharacterGlobally(call.args as any);
                } else if (call.name === 'analyzeBookStructure') {
                    callResult = applyAnalyzeBookStructure();
                } else {
                    callResult = { success: false, error: 'Unknown tool' };
                }

                toolResponses.push({
                    name: call.name,
                    response: callResult,
                });
            }
            
            // FIX: Send tool responses back to the model by passing an array of FunctionResponsePart to the 'message' property.
            response = await chat.sendMessage({
                message: toolResponses.map(r => ({ functionResponse: r }))
            });
        }
        
        // Display final agent response
        const agentMessage: ChatMessageData = {
            id: `agent-${Date.now()}`,
            sender: 'agent',
            name: 'Proofline Agent',
            avatar: 'PA',
            text: response.text,
        };
        setChatMessages(prev => [...prev, agentMessage]);

    } catch (e: any) {
        const errorMsg = "Sorry, I encountered an error. Please try again.";
        setError(errorMsg);
        const agentMessage: ChatMessageData = {
            id: `agent-${Date.now()}`,
            sender: 'agent',
            name: 'Proofline Agent',
            avatar: 'PA',
            text: errorMsg,
        };
        setChatMessages(prev => [...prev, agentMessage]);
        console.error(e);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsPipelineLoading(true);
    setError(null);
    setAnnotations([]);
    setPipelineProgress(0);

    let progressInterval: number | undefined;
    progressInterval = window.setInterval(() => {
        setPipelineProgress(prev => {
            if (prev >= 95) {
                if (progressInterval) clearInterval(progressInterval);
                return prev;
            }
            return prev + 5;
        });
    }, 200);

    const annotationSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'The category of the issue (e.g., "Grammar", "Style", "Repetition").',
            },
            reasoning: {
              type: Type.STRING,
              description: 'A brief, clear explanation of the issue and why it should be addressed.',
            },
            originalText: {
              type: Type.STRING,
              description: 'The exact, verbatim text from the manuscript that should be replaced.',
            },
            suggestedChange: {
              type: Type.STRING,
              description: 'The new text that should replace the original text.',
            },
            confidence: {
              type: Type.INTEGER,
              description: 'A confidence score from 0 to 100 on how certain the model is about this suggestion.',
            },
          },
          required: ["category", "reasoning", "originalText", "suggestedChange", "confidence"]
        },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following manuscript text for grammatical errors, stylistic issues, and awkward phrasing. For each suggestion, you MUST provide the exact original text to be replaced and the suggested change. Text: "${manuscriptText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: annotationSchema,
            },
        });

        const parsedAnnotations = JSON.parse(response.text) as Omit<Annotation, 'id'>[];
        const newAnnotations = parsedAnnotations.map((ann, index) => ({
            ...ann,
            id: Date.now() + index,
        }));
        setAnnotations(newAnnotations);
    } catch(e) {
        setError("Failed to run annotation pipeline. The model may have returned an invalid response.");
        console.error(e);
    } finally {
        if(progressInterval) clearInterval(progressInterval);
        setPipelineProgress(100);
        setTimeout(() => {
            setIsPipelineLoading(false);
            setPipelineProgress(0);
        }, 500);
    }
  };

  const handleAcceptAnnotation = (annotationToAccept: Annotation) => {
    const newText = manuscriptText.replace(annotationToAccept.originalText, annotationToAccept.suggestedChange);
    const description = `Accepted suggestion for "${annotationToAccept.originalText.substring(0, 25)}..."`;
    updateManuscriptAndHistory(newText, description, 'suggestion');
    setAnnotations(prev => prev.filter(a => a.id !== annotationToAccept.id));
  };

  const handleRejectAnnotation = (id: number) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };
  
  const handleRejectAllAnnotations = () => {
      setAnnotations([]);
  };
  
  const handleAcceptAllAnnotations = () => {
    const updatedText = annotations.reduce((currentText, ann) => {
      return currentText.replace(ann.originalText, ann.suggestedChange);
    }, manuscriptText);
    
    updateManuscriptAndHistory(updatedText, `Applied ${annotations.length} suggestions`, 'suggestion');
    setAnnotations([]);
  };

  const handleSaveMetadata = (newMetadata: Metadata) => {
    setMetadata(newMetadata);
  };

  const handleTextImport = (newText: string) => {
    updateManuscriptAndHistory(newText, 'Imported new document', 'import');
    setAnnotations([]); // Clear annotations for new document
  };

  return (
    <div className="app-container">
      <ChatPanel messages={chatMessages} onSendMessage={handleSendMessage} isLoading={isChatLoading} />
      <EditorPanel 
        text={manuscriptText} 
        onTextChange={handleTextChange}
        error={error}
        annotations={annotations}
      />
      <Sidebar 
        annotations={annotations} 
        manuscriptText={manuscriptText} 
        history={historyStack}
        metadata={metadata}
        onAcceptAnnotation={handleAcceptAnnotation}
        onRejectAnnotation={handleRejectAnnotation}
        onAcceptAll={handleAcceptAllAnnotations}
        onRejectAll={handleRejectAllAnnotations}
        onRevertToHistory={handleRevertToHistory}
        onRunPipeline={handleRunPipeline}
        isPipelineLoading={isPipelineLoading}
        pipelineProgress={pipelineProgress}
        onSaveMetadata={handleSaveMetadata}
        onTextImport={handleTextImport}
      />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
