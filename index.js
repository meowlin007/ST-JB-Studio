(function($) {
    'use strict';

    const MODULE_NAME = 'JB_Architect_Studio';

    // ================= PARSER ENGINE =================
    const JBParser = {
        extractThinkContent: function(text) {
            if (!text) return null;
            const regex = /<think>([\s\S]*?)<\/think>/gi;
            const matches = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push(match[1].trim());
            }
            return matches.length > 0 ? matches.join('\n---\n') : null;
        },

        structureThinkContent: function(rawText) {
            if (!rawText) return { raw: rawText, summary: '', keyPoints: [], metrics: {} };
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

        scanForSlop: function(text, slopDict) {
            if (!text || !Array.isArray(slopDict) || slopDict.length === 0) return [];
            const results = [];
            slopDict.forEach(pattern => {
                try {
                    const safePattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${safePattern}\\b`, 'gi');
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        results.push({ word: match[0], index: match.index, length: match[0].length });
                    }
                } catch (e) {
                    console.warn('Invalid pattern:', pattern);
                }
            });            return results.sort((a, b) => a.index - b.index);
        },

        applySlopHighlights: function(text, matches) {
            if (!matches || matches.length === 0) return text;
            let result = '';
            let lastIndex = 0;
            matches.forEach(m => {
                result += text.slice(lastIndex, m.index);
                result += `<mark class="jb-slop">${m.word}</mark>`;
                lastIndex = m.index + m.length;
            });
            result += text.slice(lastIndex);
            return result;
        }
    };

    // ================= CONFIG =================
    const CONFIG_KEY = 'jb_studio_v1';
    let config = {
        enabled: true,
        thinkDecoder: true,
        slopRadar: true
    };

    let slopDictionary = ['ราวกับว่า', 'ดวงตาเป็นประกาย', 'a shiver ran down', 'eyes sparkled'];

    // ================= MODULES =================
    function processThinkDecoder(messageData) {
        if (!config.thinkDecoder || !messageData?.mes) return;
        
        const thinkRaw = JBParser.extractThinkContent(messageData.mes);
        if (!thinkRaw) return;

        const structured = JBParser.structureThinkContent(thinkRaw);
        const btnId = `jb-think-${messageData.id}`;
        
        const $msg = $(`[data-id="${messageData.id}"]`);
        $msg.find('p').each(function() {
            const html = $(this).html();
            $(this).html(html.replace(/<think>[\s\S]*?<\/think>/gi, ''));
        });

        $msg.find('.mes-buttons').prepend(`
            <div id="${btnId}" class="jb-think-toggle">🧠 Think</div>
        `);

        $(`#${btnId}`).on('click', () => {
            alert(`CoT:\n${structured.summary}\n\nPoints:\n${structured.keyPoints.join('\n')}`);
        });    }

    function processSlopRadar(messageData) {
        if (!config.slopRadar || !messageData?.mes) return;
        
        const matches = JBParser.scanForSlop(messageData.mes, slopDictionary);
        if (matches.length === 0) return;

        const highlighted = JBParser.applySlopHighlights(messageData.mes, matches);
        const $msg = $(`[data-id="${messageData.id}"] .mes-text`);
        $msg.html(highlighted);
    }

    // ================= UI =================
    function showToast(msg) {
        const $toast = $(`<div style="position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:14px 20px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.3);z-index:99999;font-size:14px;animation:slideIn 0.3s ease;">${msg}</div>`);
        $('body').append($toast);
        setTimeout(() => $toast.remove(), 3000);
    }

    function setupUI() {
        $('body').append(`
            <div id="jb-fab" style="position:fixed;bottom:24px;right:24px;width:52px;height:52px;background:#6c5ce7;color:white;border:none;border-radius:50%;font-size:22px;cursor:pointer;box-shadow:0 8px 30px rgba(0,0,0,0.3);z-index:9999;">🏗️</div>
            <div id="jb-badge" style="position:fixed;bottom:10px;left:10px;background:linear-gradient(135deg,#6c5ce7,#a78bfa);color:white;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:600;z-index:9999;">🏗️ JB Studio</div>
        `);

        $('#jb-fab').on('click', () => showToast('✅ JB Studio Ready!'));

        $('head').append(`
            <style>
                @keyframes slideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}
                .jb-think-toggle{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;background:rgba(108,92,231,0.15);color:#a78bfa;border-radius:6px;font-size:12px;cursor:pointer;margin-top:6px}
                mark.jb-slop{background:rgba(239,68,68,0.25);color:#fca5a5;border-bottom:2px solid #ef4444;padding:0 2px;border-radius:3px}
            </style>
        `);
    }

    // ================= INIT =================
    $(document).on('message_received', function(event, messageData) {
        if (!config.enabled || !messageData?.mes || messageData.is_system) return;
        processThinkDecoder(messageData);
        processSlopRadar(messageData);
    });

    setupUI();
    setTimeout(() => showToast('🏗️ JB Studio Loaded!'), 1000);
    console.log('[JB_Architect_Studio] ✅ Ready');

})(jQuery);
