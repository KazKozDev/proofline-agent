# Proofline Agent 📝

**Proofline Agent** is a comprehensive manuscript editing and analysis tool powered by AI. It provides advanced capabilities for writers, editors, and publishers to analyze, edit, translate, and improve large manuscripts and books.

## 🚀 Features

### Core Manuscript Tools
- **📖 Manuscript Indexing** - Automatic chapter detection and structure analysis
- **✍️ Chapter Rewriting** - AI-powered chapter reconstruction and improvement
- **🔍 Manuscript Search** - Structured search across large texts
- **📊 Book Structure Analysis** - Comprehensive manuscript structure evaluation
- **👥 Character Profile Building** - Character consistency and development tracking
- **🔗 Chapter Sequence Validation** - Ensure narrative flow and continuity

### Translation & Localization
- **🌍 Manuscript Translation** - Multi-language translation with quality control
- **📋 Translation Quality Assessment** - Automated translation evaluation
- **🎯 Context-Aware Translation** - Maintains narrative consistency across languages

### Advanced Features
- **💾 Context Caching** - Efficient processing of large manuscripts
- **🎨 Interactive UI** - Modern React-based interface with real-time editing
- **📈 Quality Metrics** - Comprehensive manuscript quality assessment
- **🔄 Global Manuscript Editor** - Whole-book editing capabilities

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **AI Integration**: Google Gemini AI
- **Backend Scripts**: Python for advanced processing
- **UI Components**: React Window for performance
- **Build System**: Vite with hot reload

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Google Gemini API Key**

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd proofline-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

4. **Add your API key to `.env`**
   ```env
   VITE_API_KEY=your_gemini_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## 🚀 Quick Start

### Option 1: Auto-start (Recommended)
```bash
npm start
```
This will automatically start the development server and open your browser.

### Option 2: Manual start
```bash
npm run dev
```
Then navigate to: http://localhost:5173

### Option 3: Using Scripts
```bash
./scripts/start.sh
```

## 📁 Project Structure

```
proofline-agent/
├── src/                    # Main application source
│   ├── components/         # React components
│   ├── utils/              # Core manuscript tools
│   │   ├── manuscript-tools.ts      # Main editing tools
│   │   ├── manuscript-translator.ts # Translation engine
│   │   └── chapter-rewriter.ts      # Chapter rewriting logic
│   ├── types/              # TypeScript definitions
│   ├── index.tsx           # Main React application
│   └── index.css           # Application styles
├── scripts/                # Utility scripts
│   ├── chapter_rewriter.py # Python-based chapter processor
│   ├── start.sh           # Auto-start script
│   └── run.command        # macOS launcher
├── .github/               # GitHub configuration
│   ├── workflows/         # CI/CD pipelines
│   └── ISSUE_TEMPLATE/    # Issue templates
├── docs/                  # Documentation
└── dist/                  # Build output
```

## 🎯 Usage Examples

### Manuscript Analysis
```typescript
const indexer = new ManuscriptIndexer();
const index = await indexer.createIndex(manuscriptText);
console.log(`Found ${index.chapters.length} chapters`);
```

### Chapter Rewriting
```typescript
const rewriter = new ChapterRewriter();
const rewrittenChapter = await rewriter.rewriteChapter(
  chapterText,
  { intensity: 'moderate' }
);
```

### Translation
```typescript
const translator = new ManuscriptTranslator(apiKey);
const translation = await translator.translateManuscript(
  text,
  'English',
  'Spanish'
);
```

## 🔧 Available Scripts

- `npm start` - Start development server with auto-browser opening
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is private and proprietary.

## 🐛 Issue Reporting

Found a bug? Please create an issue using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## 💡 Feature Requests

Have an idea? Submit a [feature request](.github/ISSUE_TEMPLATE/feature_request.md).

## 🔒 Security

- API keys are never logged or exposed
- Environment variables are properly managed
- All sensitive data is excluded from version control

## 📊 Performance

- Optimized for large manuscripts (100k+ words)
- Efficient memory usage with context caching
- Real-time processing with React Window virtualization

---

**Built with ❤️ for writers and editors worldwide**