<div align="center">
    <img width="250" height="155" alt="lllo" src="https://github.com/user-attachments/assets/c2fb76b7-17d0-4978-8dbc-4186a2f5cfd7" />
</div>

# Proofline Agent

**Proofline Agent** is a comprehensive manuscript editing and analysis tool powered by AI. It provides advanced capabilities for writers, editors, and publishers to analyze, edit, translate, and improve large manuscripts and books.

## Features

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
- 
<img width="1246" height="890" alt="Screenshot 2025-09-18 at 13 47 10" src="https://github.com/user-attachments/assets/583ccf98-6846-4ec0-bce1-f2d320649d94" />

### Advanced Features
- **💾 Context Caching** - Efficient processing of large manuscripts
- **🎨 Interactive UI** - Modern React-based interface with real-time editing
- **📈 Quality Metrics** - Comprehensive manuscript quality assessment
- **🔄 Global Manuscript Editor** - Whole-book editing capabilities

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **AI Integration**: Google Gemini AI
- **Backend Scripts**: Python for advanced processing
- **UI Components**: React Window for performance
- **Build System**: Vite with hot reload

## Prerequisites

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

## Quick Start

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

## Project Structure

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

---

If you like this project, please give it a star ⭐

For questions, feedback, or support, reach out to:

[Artem KK](https://www.linkedin.com/in/kazkozdev/) | MIT [LICENSE](LICENSE) 

**Built with ❤️ for writers and editors worldwide**
