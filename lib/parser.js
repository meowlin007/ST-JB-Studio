/**
 * JB Architect Studio - Parser Engine
 * Handles <think> decoding, content structuring, and Slop Radar matching.
 * Compatible with ST v1.17+
 */
(function (window) {
    'use strict';

    const JBParser = {
        // ================= THINK DECODER =================
        /**
         * Extracts raw content inside <think>...</think> tags
         */
        extractThinkContent(text) {
            if (!text) return null;
            const regex = /<think>([\s\S]*?)<\/think>/gi;
            const matches = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push(match[1].trim());
            }
            return matches.length > 0 ? matches.join('\n---\n') : null;
        },

        /**
         * Parses think content into a structured object (Phase 1 Heuristic)
         */
        structureThinkContent(rawText) {
            if (!rawText) return null;
            const lines = rawText.split('\n');
            const sections = { raw: rawText, summary: '', metrics: {}, keyPoints: [] };

            lines.forEach(line => {
                const t = line.trim();
                if (t.startsWith('**') && t.endsWith('**')) {
                    sections.keyPoints.push(t.replace(/\*\*/g, ''));
                } else if (t.includes(':')) {
                    const [key, val] = t.split(':').map(s => s.trim());
                    if (key && val) sections.metrics[key] = val;
                }
            });

            sections.summary = rawText.slice(0, 120) + (rawText.length > 120 ? '...' : '');
            return sections;
        },

        // ================= SLOP RADAR =================
        /**
         * Scans text against a dictionary of forbidden/slop patterns
         */
        scanForSlop(text, slopDict = []) {
            if (!text || !Array.isArray(slopDict) || slopDict.length === 0) return [];
            const results = [];

            slopDict.forEach(pattern => {
                try {
                    // Escape special regex chars if it's a plain keyword
                    const safePattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${safePattern}\\b`, 'gi');
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        results.push({
                            word: match[0],
                            index: match.index,
                            length: match[0].length,
                            type: 'keyword'
                        });
                    }
                } catch (e) {
                    console.warn(`[JBParser] Invalid pattern: ${pattern}`, e);
                }
            });

            return results.sort((a, b) => a.index - b.index);
        },

        /**
         * Wraps matched words in <mark> tags (works on plain text)
         */
        applySlopHighlights(text, matches) {
            if (!matches || matches.length === 0) return text;
            let result = '';
            let lastIndex = 0;

            matches.forEach(m => {
                result += text.slice(lastIndex, m.index);
                result += `<mark class="jb-slop" data-slop-type="${m.type}" title="AI Slop Detected">${m.word}</mark>`;
                lastIndex = m.index + m.length;
            });

            result += text.slice(lastIndex);
            return result;
        }
    };

    window.JBParser = JBParser;
    console.log('[JBParser] ✅ Engine loaded.');
})(window);
