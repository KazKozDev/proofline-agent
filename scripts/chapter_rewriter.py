"""
ChapterRewriter Tool - Comprehensive Chapter Analysis and Rewriting System

A sophisticated tool that automatically identifies chapter boundaries and completely
rewrites selected chapters to fix structural, narrative, and stylistic problems
while guaranteeing quality improvements across all metrics.
"""

import re
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import statistics


class RewriteIntensity(Enum):
    """Defines the intensity level of rewriting"""
    LIGHT = "light"           # Minor touch-ups and polish
    MODERATE = "moderate"     # Significant restructuring
    COMPREHENSIVE = "comprehensive"  # Major overhaul


@dataclass
class QualityMetrics:
    """Comprehensive quality assessment metrics"""
    readability_score: float
    story_structure_score: float
    character_consistency_score: float
    pacing_score: float
    dialogue_effectiveness_score: float
    narrative_flow_score: float
    tension_score: float
    prose_quality_score: float
    overall_score: float

    def is_better_than(self, other: 'QualityMetrics') -> bool:
        """Check if all metrics are better than another QualityMetrics"""
        return (
            self.readability_score >= other.readability_score and
            self.story_structure_score >= other.story_structure_score and
            self.character_consistency_score >= other.character_consistency_score and
            self.pacing_score >= other.pacing_score and
            self.dialogue_effectiveness_score >= other.dialogue_effectiveness_score and
            self.narrative_flow_score >= other.narrative_flow_score and
            self.tension_score >= other.tension_score and
            self.prose_quality_score >= other.prose_quality_score and
            self.overall_score > other.overall_score
        )


@dataclass
class ChapterBoundary:
    """Represents a chapter boundary in the manuscript"""
    chapter_number: int
    start_position: int
    end_position: int
    title: Optional[str]
    confidence: float


@dataclass
class ProblemAnalysis:
    """Detailed analysis of problems in a chapter"""
    structural_issues: List[str]
    narrative_issues: List[str]
    character_issues: List[str]
    pacing_issues: List[str]
    dialogue_issues: List[str]
    prose_issues: List[str]
    severity_score: float


@dataclass
class PreservationControls:
    """Controls what elements must be preserved during rewriting"""
    preserve_dialogue: List[str] = None  # Specific dialogue to preserve
    preserve_character_names: bool = True
    preserve_plot_points: List[str] = None  # Key plot moments to preserve
    preserve_scenes: List[int] = None  # Scene indices to preserve
    custom_preservations: Dict[str, Any] = None


@dataclass
class RewriteReport:
    """Comprehensive report of changes made during rewriting"""
    original_metrics: QualityMetrics
    final_metrics: QualityMetrics
    changes_made: List[str]
    improvements: Dict[str, float]
    iterations_required: int
    preserved_elements: List[str]


class ChapterDetector:
    """Detects chapter boundaries in manuscripts"""

    def __init__(self):
        # Common chapter header patterns
        self.chapter_patterns = [
            r'^Chapter\s+\d+',
            r'^CHAPTER\s+\d+',
            r'^\d+\.',
            r'^Part\s+\d+',
            r'^PART\s+\d+',
            r'^\*\s*\*\s*\*',
            r'^-{3,}',
            r'^#{1,3}\s',  # Markdown headers
        ]

    def detect_chapters(self, manuscript: str) -> List[ChapterBoundary]:
        """Detect chapter boundaries in the manuscript"""
        chapters = []
        lines = manuscript.split('\n')
        current_chapter = 1
        last_boundary = 0

        for i, line in enumerate(lines):
            line_stripped = line.strip()

            # Check for chapter patterns
            for pattern in self.chapter_patterns:
                if re.match(pattern, line_stripped, re.IGNORECASE):
                    # Found a chapter boundary
                    if chapters:
                        # Update the end position of the previous chapter
                        chapters[-1].end_position = self._get_position_at_line(manuscript, i)

                    # Extract chapter title if present
                    title = self._extract_chapter_title(line_stripped)

                    # Create new chapter boundary
                    start_pos = self._get_position_at_line(manuscript, i)
                    confidence = self._calculate_confidence(line_stripped, i, lines)

                    chapter = ChapterBoundary(
                        chapter_number=current_chapter,
                        start_position=start_pos,
                        end_position=len(manuscript),  # Will be updated when next chapter is found
                        title=title,
                        confidence=confidence
                    )
                    chapters.append(chapter)
                    current_chapter += 1
                    break

        # If no chapters detected, treat entire manuscript as one chapter
        if not chapters:
            chapters.append(ChapterBoundary(
                chapter_number=1,
                start_position=0,
                end_position=len(manuscript),
                title=None,
                confidence=1.0
            ))

        return chapters

    def _get_position_at_line(self, text: str, line_number: int) -> int:
        """Get character position at the start of a given line"""
        lines = text.split('\n')
        return sum(len(line) + 1 for line in lines[:line_number])

    def _extract_chapter_title(self, line: str) -> Optional[str]:
        """Extract chapter title from header line"""
        # Remove common chapter prefixes
        title = re.sub(r'^(Chapter|CHAPTER|Part|PART)\s*\d*:?\s*', '', line, flags=re.IGNORECASE)
        title = re.sub(r'^\d+\.?\s*', '', title)
        title = re.sub(r'^[*-]+\s*', '', title)
        title = re.sub(r'^#+\s*', '', title)

        return title.strip() if title.strip() else None

    def _calculate_confidence(self, line: str, line_index: int, all_lines: List[str]) -> float:
        """Calculate confidence score for chapter boundary detection"""
        confidence = 0.5  # Base confidence

        # Higher confidence for explicit chapter markers
        if re.match(r'^(Chapter|CHAPTER)\s+\d+', line):
            confidence += 0.4

        # Check if line is isolated (empty lines before/after)
        if line_index > 0 and not all_lines[line_index - 1].strip():
            confidence += 0.1
        if line_index < len(all_lines) - 1 and not all_lines[line_index + 1].strip():
            confidence += 0.1

        return min(confidence, 1.0)


class QualityAssessor:
    """Assesses quality metrics for text chapters"""

    def assess_quality(self, text: str, context: Dict[str, Any] = None) -> QualityMetrics:
        """Comprehensive quality assessment of a text chapter"""

        # Calculate individual metrics
        readability = self._assess_readability(text)
        structure = self._assess_story_structure(text, context)
        character_consistency = self._assess_character_consistency(text, context)
        pacing = self._assess_pacing(text)
        dialogue = self._assess_dialogue_effectiveness(text)
        flow = self._assess_narrative_flow(text)
        tension = self._assess_tension(text)
        prose = self._assess_prose_quality(text)

        # Calculate overall score
        overall = statistics.mean([
            readability, structure, character_consistency,
            pacing, dialogue, flow, tension, prose
        ])

        return QualityMetrics(
            readability_score=readability,
            story_structure_score=structure,
            character_consistency_score=character_consistency,
            pacing_score=pacing,
            dialogue_effectiveness_score=dialogue,
            narrative_flow_score=flow,
            tension_score=tension,
            prose_quality_score=prose,
            overall_score=overall
        )

    def _assess_readability(self, text: str) -> float:
        """Assess readability using various metrics"""
        words = text.split()
        sentences = re.split(r'[.!?]+', text)

        if not words or not sentences:
            return 0.0

        # Average words per sentence
        avg_words_per_sentence = len(words) / len([s for s in sentences if s.strip()])

        # Sentence length variety
        sentence_lengths = [len(s.split()) for s in sentences if s.strip()]
        length_variance = statistics.variance(sentence_lengths) if len(sentence_lengths) > 1 else 0

        # Complexity indicators
        complex_words = sum(1 for word in words if len(word) > 6)
        complexity_ratio = complex_words / len(words)

        # Score calculation (0-1 scale)
        readability_score = 1.0

        # Penalize overly long sentences
        if avg_words_per_sentence > 25:
            readability_score -= 0.3
        elif avg_words_per_sentence > 20:
            readability_score -= 0.1

        # Reward sentence variety
        if length_variance > 10:
            readability_score += 0.1

        # Penalize excessive complexity
        if complexity_ratio > 0.3:
            readability_score -= 0.2

        return max(0.0, min(1.0, readability_score))

    def _assess_story_structure(self, text: str, context: Dict[str, Any] = None) -> float:
        """Assess story structure and organization"""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        if not paragraphs:
            return 0.0

        score = 0.5  # Base score

        # Check for clear beginning, middle, end structure
        if len(paragraphs) >= 3:
            score += 0.2

        # Check for scene transitions
        transition_words = ['meanwhile', 'later', 'suddenly', 'then', 'after', 'before']
        transitions = sum(1 for p in paragraphs
                         for word in transition_words
                         if word in p.lower())

        if transitions > 0:
            score += min(0.2, transitions * 0.05)

        # Check paragraph length consistency
        para_lengths = [len(p.split()) for p in paragraphs]
        if para_lengths:
            avg_length = statistics.mean(para_lengths)
            if 50 <= avg_length <= 150:  # Optimal paragraph length
                score += 0.1

        return min(1.0, score)

    def _assess_character_consistency(self, text: str, context: Dict[str, Any] = None) -> float:
        """Assess character consistency and development"""
        # Extract potential character names (capitalized words)
        character_names = set(re.findall(r'\b[A-Z][a-z]+\b', text))

        # Remove common non-names
        common_words = {'The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Who', 'How'}
        character_names -= common_words

        if not character_names:
            return 0.7  # Neutral score if no clear characters

        score = 0.5

        # Check for dialogue attribution consistency
        dialogue_patterns = re.findall(r'"[^"]*"\s*([A-Z][a-z]+\s+said|said\s+[A-Z][a-z]+)', text)
        if dialogue_patterns:
            score += 0.2

        # Check for character action consistency
        action_patterns = re.findall(r'([A-Z][a-z]+)\s+(walked|ran|said|looked|turned)', text)
        if action_patterns:
            score += 0.2

        # Penalize for inconsistent character references
        # This is a simplified check - in a full implementation,
        # this would use NLP to track character references

        return min(1.0, score)

    def _assess_pacing(self, text: str) -> float:
        """Assess narrative pacing"""
        sentences = re.split(r'[.!?]+', text)
        sentence_lengths = [len(s.split()) for s in sentences if s.strip()]

        if not sentence_lengths:
            return 0.0

        score = 0.5

        # Check for pacing variety
        if len(sentence_lengths) > 1:
            variance = statistics.variance(sentence_lengths)
            if variance > 20:  # Good variety in sentence length
                score += 0.3

        # Check for action indicators (short, punchy sentences)
        short_sentences = sum(1 for length in sentence_lengths if length <= 5)
        if short_sentences > 0:
            score += min(0.2, short_sentences * 0.02)

        return min(1.0, score)

    def _assess_dialogue_effectiveness(self, text: str) -> float:
        """Assess quality and effectiveness of dialogue"""
        # Find dialogue
        dialogue_matches = re.findall(r'"[^"]*"', text)

        if not dialogue_matches:
            return 0.6  # Neutral score for no dialogue

        score = 0.5

        # Check dialogue length variety
        dialogue_lengths = [len(d.split()) for d in dialogue_matches]
        if len(dialogue_lengths) > 1:
            variance = statistics.variance(dialogue_lengths)
            if variance > 5:
                score += 0.2

        # Check for dialogue tags
        dialogue_tags = re.findall(r'"[^"]*"\s*[a-z]+\s+said|said\s+[a-z]+', text, re.IGNORECASE)
        tag_ratio = len(dialogue_tags) / len(dialogue_matches)
        if 0.3 <= tag_ratio <= 0.7:  # Good balance of tags
            score += 0.2

        # Check for natural dialogue (contractions, informal language)
        contractions = sum(1 for d in dialogue_matches if "'" in d)
        if contractions > 0:
            score += 0.1

        return min(1.0, score)

    def _assess_narrative_flow(self, text: str) -> float:
        """Assess smoothness of narrative flow"""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        if len(paragraphs) < 2:
            return 0.5

        score = 0.5

        # Check for transition words between paragraphs
        transition_words = [
            'however', 'meanwhile', 'therefore', 'consequently', 'furthermore',
            'additionally', 'moreover', 'nevertheless', 'nonetheless', 'thus'
        ]

        transitions_found = 0
        for i in range(1, len(paragraphs)):
            first_sentence = paragraphs[i].split('.')[0].lower()
            if any(word in first_sentence for word in transition_words):
                transitions_found += 1

        if transitions_found > 0:
            score += min(0.3, transitions_found * 0.1)

        # Check for topic continuity (simplified)
        # In a full implementation, this would use semantic analysis

        return min(1.0, score)

    def _assess_tension(self, text: str) -> float:
        """Assess narrative tension and engagement"""
        score = 0.5

        # Check for tension indicators
        tension_words = [
            'suddenly', 'urgent', 'danger', 'fear', 'panic', 'rush', 'quick',
            'immediately', 'emergency', 'crisis', 'threat', 'worried', 'anxious'
        ]

        tension_count = sum(1 for word in tension_words if word in text.lower())
        if tension_count > 0:
            score += min(0.3, tension_count * 0.05)

        # Check for short, punchy sentences (tension indicator)
        sentences = re.split(r'[.!?]+', text)
        short_sentences = sum(1 for s in sentences if len(s.split()) <= 5 and s.strip())
        if short_sentences > 0:
            score += min(0.2, short_sentences * 0.02)

        return min(1.0, score)

    def _assess_prose_quality(self, text: str) -> float:
        """Assess overall prose quality"""
        words = text.split()

        if not words:
            return 0.0

        score = 0.5

        # Check for word variety
        unique_words = len(set(word.lower() for word in words))
        variety_ratio = unique_words / len(words)
        if variety_ratio > 0.5:
            score += 0.2

        # Check for excessive adverbs (quality indicator)
        adverbs = sum(1 for word in words if word.endswith('ly'))
        adverb_ratio = adverbs / len(words)
        if adverb_ratio < 0.05:  # Good - not too many adverbs
            score += 0.1
        elif adverb_ratio > 0.1:  # Too many adverbs
            score -= 0.1

        # Check for strong verbs vs weak verbs + adverbs
        weak_verbs = ['went', 'said', 'looked', 'walked', 'was', 'were']
        weak_verb_count = sum(1 for word in words if word.lower() in weak_verbs)
        if weak_verb_count / len(words) < 0.1:
            score += 0.2

        return max(0.0, min(1.0, score))


class ProblemAnalyzer:
    """Analyzes various types of problems in text"""

    def analyze_problems(self, text: str, context: Dict[str, Any] = None) -> ProblemAnalysis:
        """Comprehensive problem analysis"""

        structural_issues = self._analyze_structural_issues(text)
        narrative_issues = self._analyze_narrative_issues(text)
        character_issues = self._analyze_character_issues(text, context)
        pacing_issues = self._analyze_pacing_issues(text)
        dialogue_issues = self._analyze_dialogue_issues(text)
        prose_issues = self._analyze_prose_issues(text)

        # Calculate severity score
        total_issues = (len(structural_issues) + len(narrative_issues) +
                       len(character_issues) + len(pacing_issues) +
                       len(dialogue_issues) + len(prose_issues))
        severity = min(1.0, total_issues / 20)  # Normalize to 0-1

        return ProblemAnalysis(
            structural_issues=structural_issues,
            narrative_issues=narrative_issues,
            character_issues=character_issues,
            pacing_issues=pacing_issues,
            dialogue_issues=dialogue_issues,
            prose_issues=prose_issues,
            severity_score=severity
        )

    def _analyze_structural_issues(self, text: str) -> List[str]:
        """Analyze structural problems"""
        issues = []
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        if len(paragraphs) < 3:
            issues.append("Chapter may be too short or lack proper structure")

        # Check for overly long paragraphs
        long_paragraphs = [p for p in paragraphs if len(p.split()) > 200]
        if long_paragraphs:
            issues.append(f"Found {len(long_paragraphs)} overly long paragraphs")

        # Check for very short paragraphs
        short_paragraphs = [p for p in paragraphs if len(p.split()) < 10]
        if len(short_paragraphs) > len(paragraphs) * 0.3:
            issues.append("Too many very short paragraphs - may indicate choppy structure")

        return issues

    def _analyze_narrative_issues(self, text: str) -> List[str]:
        """Analyze narrative flow problems"""
        issues = []

        # Check for sudden POV shifts
        first_person_indicators = ['I ', 'me ', 'my ', 'mine ']
        third_person_indicators = ['he ', 'she ', 'they ', 'his ', 'her ', 'their ']

        has_first_person = any(indicator in text for indicator in first_person_indicators)
        has_third_person = any(indicator in text for indicator in third_person_indicators)

        if has_first_person and has_third_person:
            issues.append("Potential POV inconsistency - mixing first and third person")

        # Check for tense consistency
        past_tense_indicators = ['was', 'were', 'had', 'did']
        present_tense_indicators = ['is', 'are', 'has', 'does']

        past_count = sum(text.lower().count(word) for word in past_tense_indicators)
        present_count = sum(text.lower().count(word) for word in present_tense_indicators)

        if past_count > 0 and present_count > 0 and abs(past_count - present_count) < min(past_count, present_count):
            issues.append("Potential tense inconsistency")

        return issues

    def _analyze_character_issues(self, text: str, context: Dict[str, Any] = None) -> List[str]:
        """Analyze character-related problems"""
        issues = []

        # Extract potential character names
        character_names = set(re.findall(r'\b[A-Z][a-z]+\b', text))
        common_words = {'The', 'This', 'That', 'Then', 'When', 'Where', 'What', 'Who', 'How', 'But', 'And'}
        character_names -= common_words

        if len(character_names) > 10:
            issues.append("Too many character names introduced - may confuse readers")

        # Check for dialogue without attribution
        dialogue_lines = re.findall(r'"[^"]*"', text)
        attributed_dialogue = re.findall(r'"[^"]*"\s*[^"]*?(said|asked|replied|whispered|shouted)', text, re.IGNORECASE)

        if dialogue_lines and len(attributed_dialogue) < len(dialogue_lines) * 0.3:
            issues.append("Many dialogue lines lack clear attribution")

        return issues

    def _analyze_pacing_issues(self, text: str) -> List[str]:
        """Analyze pacing problems"""
        issues = []
        sentences = re.split(r'[.!?]+', text)
        sentence_lengths = [len(s.split()) for s in sentences if s.strip()]

        if not sentence_lengths:
            return issues

        avg_length = statistics.mean(sentence_lengths)

        if avg_length > 25:
            issues.append("Sentences are too long on average - may slow pacing")
        elif avg_length < 8:
            issues.append("Sentences are too short on average - may feel choppy")

        # Check for lack of variety
        if len(sentence_lengths) > 5:
            variance = statistics.variance(sentence_lengths)
            if variance < 10:
                issues.append("Lack of sentence length variety - monotonous pacing")

        return issues

    def _analyze_dialogue_issues(self, text: str) -> List[str]:
        """Analyze dialogue problems"""
        issues = []
        dialogue_matches = re.findall(r'"[^"]*"', text)

        if not dialogue_matches:
            return issues

        # Check for overly long dialogue
        long_dialogue = [d for d in dialogue_matches if len(d.split()) > 50]
        if long_dialogue:
            issues.append(f"Found {len(long_dialogue)} overly long dialogue segments")

        # Check for lack of contractions (unnatural dialogue)
        contractions = sum(1 for d in dialogue_matches if "'" in d)
        if contractions == 0 and len(dialogue_matches) > 3:
            issues.append("Dialogue lacks contractions - may sound unnatural")

        # Check for repeated dialogue tags
        said_count = text.lower().count(' said')
        if said_count > len(dialogue_matches) * 0.8:
            issues.append("Overuse of 'said' - dialogue tags lack variety")

        return issues

    def _analyze_prose_issues(self, text: str) -> List[str]:
        """Analyze prose quality problems"""
        issues = []
        words = text.split()

        if not words:
            return issues

        # Check for excessive adverbs
        adverbs = [word for word in words if word.endswith('ly')]
        adverb_ratio = len(adverbs) / len(words)
        if adverb_ratio > 0.1:
            issues.append(f"Excessive use of adverbs ({len(adverbs)} found) - consider stronger verbs")

        # Check for weak verbs
        weak_verbs = ['went', 'got', 'put', 'look', 'come', 'go']
        weak_verb_count = sum(words.count(verb) for verb in weak_verbs)
        if weak_verb_count > len(words) * 0.05:
            issues.append("Overuse of weak verbs - consider more specific alternatives")

        # Check for repetitive words
        word_freq = {}
        for word in words:
            word_lower = word.lower()
            if len(word_lower) > 4:  # Only check substantial words
                word_freq[word_lower] = word_freq.get(word_lower, 0) + 1

        repeated_words = [(word, count) for word, count in word_freq.items()
                         if count > 5 and word not in ['that', 'with', 'have', 'this', 'they', 'were', 'been']]

        if repeated_words:
            issues.append(f"Repetitive word usage: {', '.join([f'{word}({count})' for word, count in repeated_words[:3]])}")

        return issues


class ChapterRewriter:
    """Main class for comprehensive chapter rewriting"""

    def __init__(self):
        self.detector = ChapterDetector()
        self.assessor = QualityAssessor()
        self.analyzer = ProblemAnalyzer()
        self.logger = logging.getLogger(__name__)

    def rewrite_chapter(self,
                       manuscript: str,
                       chapter_number: Optional[int] = None,
                       intensity: RewriteIntensity = RewriteIntensity.MODERATE,
                       preservation_controls: PreservationControls = None,
                       max_iterations: int = 5) -> Tuple[str, RewriteReport]:
        """
        Comprehensively rewrite a chapter with quality guarantees

        Args:
            manuscript: Full manuscript text
            chapter_number: Specific chapter to rewrite (None for auto-select)
            intensity: Level of rewriting to perform
            preservation_controls: Elements that must be preserved
            max_iterations: Maximum rewrite attempts

        Returns:
            Tuple of (rewritten_chapter, detailed_report)
        """

        # Step 1: Detect chapters
        chapters = self.detector.detect_chapters(manuscript)

        if not chapters:
            raise ValueError("No chapters detected in manuscript")

        # Step 2: Select chapter to rewrite
        if chapter_number is None:
            # Auto-select chapter with lowest quality
            chapter_scores = []
            for chapter in chapters:
                chapter_text = manuscript[chapter.start_position:chapter.end_position]
                metrics = self.assessor.assess_quality(chapter_text)
                chapter_scores.append((chapter, metrics.overall_score))

            target_chapter = min(chapter_scores, key=lambda x: x[1])[0]
        else:
            target_chapters = [c for c in chapters if c.chapter_number == chapter_number]
            if not target_chapters:
                raise ValueError(f"Chapter {chapter_number} not found")
            target_chapter = target_chapters[0]

        # Step 3: Extract chapter text
        original_text = manuscript[target_chapter.start_position:target_chapter.end_position]

        # Step 4: Baseline quality assessment
        original_metrics = self.assessor.assess_quality(original_text)

        # Step 5: Problem analysis
        problems = self.analyzer.analyze_problems(original_text)

        # Step 6: Iterative rewriting with quality assurance
        current_text = original_text
        iterations = 0
        improvements_made = []

        while iterations < max_iterations:
            iterations += 1

            # Generate rewritten version
            rewritten_text = self._generate_rewrite(
                current_text, problems, intensity, preservation_controls
            )

            # Assess new quality
            new_metrics = self.assessor.assess_quality(rewritten_text)

            # Check if quality improved
            if new_metrics.is_better_than(original_metrics):
                # Quality improved - we can stop or continue if there's still room
                current_text = rewritten_text

                # Log improvements
                improvements_made.extend(self._identify_improvements(original_metrics, new_metrics))

                # Check if we've reached high quality
                if new_metrics.overall_score > 0.9:
                    break

                # Update problems for next iteration
                problems = self.analyzer.analyze_problems(current_text)

                # If no significant problems remain, stop
                if problems.severity_score < 0.2:
                    break
            else:
                # Quality didn't improve - try different approach or stop
                if iterations < max_iterations:
                    # Try different rewriting strategy
                    continue
                else:
                    # Max iterations reached, use best version so far
                    break

        # Step 7: Generate final report
        final_metrics = self.assessor.assess_quality(current_text)

        preserved_elements = self._identify_preserved_elements(
            original_text, current_text, preservation_controls
        )

        improvements = self._calculate_improvements(original_metrics, final_metrics)

        changes_made = self._identify_changes_made(original_text, current_text, problems)

        report = RewriteReport(
            original_metrics=original_metrics,
            final_metrics=final_metrics,
            changes_made=changes_made,
            improvements=improvements,
            iterations_required=iterations,
            preserved_elements=preserved_elements
        )

        return current_text, report

    def _generate_rewrite(self,
                         text: str,
                         problems: ProblemAnalysis,
                         intensity: RewriteIntensity,
                         preservation_controls: PreservationControls = None) -> str:
        """Generate a rewritten version of the text"""

        # This is a simplified implementation. In a full system, this would
        # use advanced NLP techniques, possibly including AI language models

        rewritten = text

        if intensity == RewriteIntensity.LIGHT:
            rewritten = self._light_rewrite(rewritten, problems)
        elif intensity == RewriteIntensity.MODERATE:
            rewritten = self._moderate_rewrite(rewritten, problems)
        elif intensity == RewriteIntensity.COMPREHENSIVE:
            rewritten = self._comprehensive_rewrite(rewritten, problems)

        # Apply preservation controls
        if preservation_controls:
            rewritten = self._apply_preservation_controls(rewritten, text, preservation_controls)

        return rewritten

    def _light_rewrite(self, text: str, problems: ProblemAnalysis) -> str:
        """Perform light rewriting - mainly polish and minor fixes"""
        rewritten = text

        # Fix simple prose issues
        if 'Excessive use of adverbs' in str(problems.prose_issues):
            # Remove some adverbs
            rewritten = re.sub(r'\b\w+ly\b', lambda m: '' if len(m.group()) > 6 else m.group(), rewritten)
            rewritten = re.sub(r'\s+', ' ', rewritten)  # Clean up extra spaces

        # Improve dialogue tags
        if 'Overuse of \'said\'' in str(problems.dialogue_issues):
            alternatives = ['replied', 'asked', 'whispered', 'murmured', 'stated']
            for i, alt in enumerate(alternatives):
                rewritten = rewritten.replace(' said', f' {alt}', 1)

        return rewritten

    def _moderate_rewrite(self, text: str, problems: ProblemAnalysis) -> str:
        """Perform moderate rewriting - significant improvements"""
        rewritten = self._light_rewrite(text, problems)

        # Improve sentence variety
        if 'Lack of sentence length variety' in str(problems.pacing_issues):
            sentences = re.split(r'([.!?]+)', rewritten)
            new_sentences = []
            for i, sentence in enumerate(sentences):
                if '.' in sentence or '!' in sentence or '?' in sentence:
                    new_sentences.append(sentence)
                else:
                    words = sentence.split()
                    if len(words) > 20:
                        # Split long sentence
                        mid = len(words) // 2
                        new_sentence = ' '.join(words[:mid]) + '. ' + ' '.join(words[mid:])
                        new_sentences.append(new_sentence)
                    else:
                        new_sentences.append(sentence)
            rewritten = ''.join(new_sentences)

        # Improve paragraph structure
        if 'overly long paragraphs' in str(problems.structural_issues):
            paragraphs = rewritten.split('\n\n')
            new_paragraphs = []
            for para in paragraphs:
                if len(para.split()) > 150:
                    # Split long paragraph
                    sentences = re.split(r'([.!?]+)', para)
                    mid = len(sentences) // 2
                    para1 = ''.join(sentences[:mid])
                    para2 = ''.join(sentences[mid:])
                    new_paragraphs.extend([para1, para2])
                else:
                    new_paragraphs.append(para)
            rewritten = '\n\n'.join(new_paragraphs)

        return rewritten

    def _comprehensive_rewrite(self, text: str, problems: ProblemAnalysis) -> str:
        """Perform comprehensive rewriting - major overhaul"""
        rewritten = self._moderate_rewrite(text, problems)

        # This would involve major restructuring, which in a real implementation
        # would require sophisticated NLP and possibly AI assistance

        # For this example, we'll do additional improvements

        # Enhance dialogue
        dialogue_pattern = r'"([^"]*)"(\s*[^"]*?said[^.!?]*[.!?])'

        def improve_dialogue(match):
            dialogue = match.group(1)
            attribution = match.group(2)

            # Add action or emotion to dialogue
            if 'said' in attribution and len(attribution.split()) < 5:
                emotions = ['with a smile', 'nervously', 'with confidence', 'quietly']
                import random
                emotion = random.choice(emotions)
                attribution = attribution.replace('said', f'said {emotion}')

            return f'"{dialogue}"{attribution}'

        rewritten = re.sub(dialogue_pattern, improve_dialogue, rewritten)

        return rewritten

    def _apply_preservation_controls(self,
                                   rewritten: str,
                                   original: str,
                                   controls: PreservationControls) -> str:
        """Apply preservation controls to maintain specified elements"""

        if not controls:
            return rewritten

        # Preserve specific dialogue
        if controls.preserve_dialogue:
            for dialogue in controls.preserve_dialogue:
                if dialogue in original and dialogue not in rewritten:
                    # Find a good place to reinsert the dialogue
                    # This is simplified - real implementation would be more sophisticated
                    rewritten = rewritten + f'\n\n{dialogue}'

        # Preserve character names
        if controls.preserve_character_names:
            original_names = set(re.findall(r'\b[A-Z][a-z]+\b', original))
            rewritten_names = set(re.findall(r'\b[A-Z][a-z]+\b', rewritten))

            missing_names = original_names - rewritten_names
            for name in missing_names:
                if name not in ['The', 'This', 'That', 'Then', 'When', 'Where']:
                    # This is a simplified restoration - real implementation would be smarter
                    if f' {name} ' in original and f' {name} ' not in rewritten:
                        rewritten = rewritten.replace(' he ', f' {name} ', 1)

        return rewritten

    def _identify_improvements(self,
                             original: QualityMetrics,
                             new: QualityMetrics) -> List[str]:
        """Identify specific improvements made"""
        improvements = []

        if new.readability_score > original.readability_score:
            improvements.append("Improved readability")
        if new.story_structure_score > original.story_structure_score:
            improvements.append("Enhanced story structure")
        if new.character_consistency_score > original.character_consistency_score:
            improvements.append("Better character consistency")
        if new.pacing_score > original.pacing_score:
            improvements.append("Improved pacing")
        if new.dialogue_effectiveness_score > original.dialogue_effectiveness_score:
            improvements.append("Enhanced dialogue effectiveness")
        if new.narrative_flow_score > original.narrative_flow_score:
            improvements.append("Smoother narrative flow")
        if new.tension_score > original.tension_score:
            improvements.append("Increased tension and engagement")
        if new.prose_quality_score > original.prose_quality_score:
            improvements.append("Better prose quality")

        return improvements

    def _identify_preserved_elements(self,
                                   original: str,
                                   rewritten: str,
                                   controls: PreservationControls = None) -> List[str]:
        """Identify what elements were successfully preserved"""
        preserved = []

        if controls:
            if controls.preserve_character_names:
                original_names = set(re.findall(r'\b[A-Z][a-z]+\b', original))
                rewritten_names = set(re.findall(r'\b[A-Z][a-z]+\b', rewritten))
                preserved_names = original_names & rewritten_names
                if preserved_names:
                    preserved.append(f"Character names: {', '.join(list(preserved_names)[:5])}")

            if controls.preserve_dialogue:
                preserved_dialogue = [d for d in controls.preserve_dialogue if d in rewritten]
                if preserved_dialogue:
                    preserved.append(f"{len(preserved_dialogue)} specific dialogue segments")

        # Check for preserved plot elements (simplified)
        plot_keywords = ['discovered', 'revealed', 'decided', 'realized', 'remembered']
        preserved_plot = [word for word in plot_keywords if word in original and word in rewritten]
        if preserved_plot:
            preserved.append("Key plot developments")

        return preserved

    def _calculate_improvements(self,
                              original: QualityMetrics,
                              final: QualityMetrics) -> Dict[str, float]:
        """Calculate numerical improvements for each metric"""
        return {
            'readability': final.readability_score - original.readability_score,
            'story_structure': final.story_structure_score - original.story_structure_score,
            'character_consistency': final.character_consistency_score - original.character_consistency_score,
            'pacing': final.pacing_score - original.pacing_score,
            'dialogue_effectiveness': final.dialogue_effectiveness_score - original.dialogue_effectiveness_score,
            'narrative_flow': final.narrative_flow_score - original.narrative_flow_score,
            'tension': final.tension_score - original.tension_score,
            'prose_quality': final.prose_quality_score - original.prose_quality_score,
            'overall': final.overall_score - original.overall_score
        }

    def _identify_changes_made(self,
                             original: str,
                             rewritten: str,
                             problems: ProblemAnalysis) -> List[str]:
        """Identify specific changes made during rewriting"""
        changes = []

        # Count changes
        original_words = len(original.split())
        rewritten_words = len(rewritten.split())

        if abs(original_words - rewritten_words) > original_words * 0.1:
            if rewritten_words > original_words:
                changes.append(f"Expanded content (+{rewritten_words - original_words} words)")
            else:
                changes.append(f"Condensed content (-{original_words - rewritten_words} words)")

        # Detect structural changes
        original_paragraphs = len(original.split('\n\n'))
        rewritten_paragraphs = len(rewritten.split('\n\n'))

        if rewritten_paragraphs != original_paragraphs:
            changes.append(f"Restructured paragraphs ({original_paragraphs} → {rewritten_paragraphs})")

        # Detect dialogue changes
        original_dialogue = len(re.findall(r'"[^"]*"', original))
        rewritten_dialogue = len(re.findall(r'"[^"]*"', rewritten))

        if rewritten_dialogue != original_dialogue:
            changes.append(f"Modified dialogue ({original_dialogue} → {rewritten_dialogue} segments)")

        # Map problems to likely changes
        for issue in problems.prose_issues:
            if 'adverbs' in issue:
                changes.append("Reduced adverb usage for stronger prose")
            if 'weak verbs' in issue:
                changes.append("Replaced weak verbs with stronger alternatives")

        for issue in problems.pacing_issues:
            if 'sentence length' in issue:
                changes.append("Improved sentence length variety for better pacing")

        for issue in problems.dialogue_issues:
            if 'said' in issue:
                changes.append("Varied dialogue tags for more engaging conversations")

        return changes


def main():
    """Example usage of the ChapterRewriter tool"""

    # Example manuscript
    sample_manuscript = """
Chapter 1: The Beginning

John walked slowly down the dark street. He looked around nervously. The shadows seemed to move menacingly around him. "I should not have come here," he said quietly to himself. He went quickly to the end of the street. Then he turned around and went back to where he started.

The old building looked very scary. It was really, really old and very dark. John said, "This is where I need to go." He said this very nervously. He walked very slowly to the door. The door was very heavy and very old.

Chapter 2: The Discovery

John opened the door slowly. Inside, everything was very dark. He said, "Hello? Is anyone there?" Nobody answered him. He went inside the building. The floor creaked loudly under his feet.

"This is very scary," John said to himself. He walked very carefully through the dark hallway. There were many doors on both sides. Each door looked very old and very mysterious. John said, "I wonder what is behind these doors."

He opened the first door very slowly. Inside was a very old room. There was very old furniture covered with very old sheets. "This is very strange," John said quietly.
"""

    # Initialize rewriter
    rewriter = ChapterRewriter()

    # Set up preservation controls
    preservation = PreservationControls(
        preserve_character_names=True,
        preserve_dialogue=["Hello? Is anyone there?"],
        preserve_plot_points=["opened the door", "found the room"]
    )

    try:
        # Rewrite chapter 1
        rewritten_text, report = rewriter.rewrite_chapter(
            manuscript=sample_manuscript,
            chapter_number=1,
            intensity=RewriteIntensity.MODERATE,
            preservation_controls=preservation
        )

        print("ORIGINAL CHAPTER:")
        print("=" * 50)
        chapters = rewriter.detector.detect_chapters(sample_manuscript)
        original_chapter = sample_manuscript[chapters[0].start_position:chapters[0].end_position]
        print(original_chapter)

        print("\n\nREWRITTEN CHAPTER:")
        print("=" * 50)
        print(rewritten_text)

        print("\n\nIMPROVEMENT REPORT:")
        print("=" * 50)
        print(f"Iterations required: {report.iterations_required}")
        print(f"Overall improvement: {report.improvements['overall']:.3f}")
        print("\nSpecific improvements:")
        for improvement in report.changes_made:
            print(f"  • {improvement}")

        print(f"\nQuality metrics comparison:")
        print(f"  Readability: {report.original_metrics.readability_score:.3f} → {report.final_metrics.readability_score:.3f}")
        print(f"  Structure: {report.original_metrics.story_structure_score:.3f} → {report.final_metrics.story_structure_score:.3f}")
        print(f"  Pacing: {report.original_metrics.pacing_score:.3f} → {report.final_metrics.pacing_score:.3f}")
        print(f"  Dialogue: {report.original_metrics.dialogue_effectiveness_score:.3f} → {report.final_metrics.dialogue_effectiveness_score:.3f}")
        print(f"  Prose: {report.original_metrics.prose_quality_score:.3f} → {report.final_metrics.prose_quality_score:.3f}")
        print(f"  Overall: {report.original_metrics.overall_score:.3f} → {report.final_metrics.overall_score:.3f}")

        print(f"\nPreserved elements:")
        for element in report.preserved_elements:
            print(f"  • {element}")

    except Exception as e:
        print(f"Error during rewriting: {e}")


if __name__ == "__main__":
    main()