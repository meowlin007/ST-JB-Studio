/**
 * JB Architect Studio - Main Entry
 * Compatible with SillyTavern v1.17.0 Staging
 * Architecture: IIFE + Event-Driven + Config-First
 */
(function ($) {
    'use strict';

    const MODULE_NAME = 'JB_Architect_Studio';
    const STORAGE_KEY = 'jb_studio_v1_config';

    // Safe API Access
    const ST = window.extension_api;
    if (!ST) {
        console.error(`[${MODULE_NAME}] SillyTavern extension_api not detected. Extension halted.`);
        return;
    }

    // Default Configuration
    const defaultConfig = {
        enabled: true,
        thinkDecoder: true,
        slopRadar: true,
        promptArchitect: true,
        externalApiUrl: '',      // สำหรับ API แยก (v2)
        externalApiKey: '',
        debugMode: false
    };

    let config = { ...defaultConfig };

    // ================= INITIALIZATION =================
    async function init() {
        console.log(`[${MODULE_NAME}] 🚀 Initializing...`);
        loadConfig();
        setupCoreUI();
        bindEvents();
        console.log(`[${MODULE_NAME}] ✅ Ready.`);
    }

    // ================= CONFIG MANAGEMENT =================
    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...defaultConfig, ...parsed };
            }
        } catch (err) {
            console.warn(`[${MODULE_NAME}] ⚠️ Failed to load config, using defaults.`);        }
    }

    function saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (err) {
            console.error(`[${MODULE_NAME}] ❌ Config save failed.`, err);
        }
    }

    // ================= EVENT BINDING =================
    function bindEvents() {
        // SillyTavern jQuery Events (v1.17 compatible)
        $(document).on('message_received', handleNewMessage);
        $(document).on('chat_loaded', handleChatLoad);
        $(document).on('ST:MESSAGE_DELETED', handleMessageDeleted);
    }

    function handleNewMessage(event, messageData) {
        if (!config.enabled) return;
        
        // messageData payload: { id, mes, is_user, is_system, swipes, send_date, ... }
        console.log(`[${MODULE_NAME}] 📨 New message received: ID ${messageData.id}`);
        
        if (config.thinkDecoder) processThinkDecoder(messageData);
        if (config.slopRadar) processSlopRadar(messageData);
    }

    function handleChatLoad() {
        console.log(`[${MODULE_NAME}] 🔄 Chat loaded. Ready for scan.`);
        // Phase 2: Re-scan visible messages if needed
    }

    function handleMessageDeleted(event, data) {
        // Cleanup UI references for deleted messages
    }

    // ================= PHASE 1 MODULES =================
    function processThinkDecoder(messageData) {
        const thinkRaw = JBParser.extractThinkContent(messageData.mes);
        if (!thinkRaw) return;

        const structured = JBParser.structureThinkContent(thinkRaw);
        const btnId = `jb-think-${messageData.id}`;

        // Hide original <think> from UI
        const $msg = $(`[data-id="${messageData.id}"]`);
        $msg.find('p').each(function() {
            const html = $(this).html();
            $(this).html(html.replace(/<think>[\s\S]*?<\/think>/gi, ''));
        });

        // Inject Toggle Button
        $msg.find('.mes-buttons').prepend(`
            <div id="${btnId}" class="jb-think-toggle" title="View CoT Dashboard">
                🧠 <span>Thinking Process</span>
            </div>
        `);

        $(`#${btnId}`).on('click', () => {
            alert(`[JB Studio] 📊 CoT Summary:\n${structured.summary}\n\nKey Points:\n${structured.keyPoints.join('\n')}`);
            // Phase 2: จะเปลี่ยนจาก alert เป็น Slide Panel จริง
        });
    }

    function processSlopRadar(messageData) {
        if (!config.slopRadar) return;
        
        // ตัวอย่าง Dictionary ชั่วคราว (Phase 2 จะโหลดจาก JSON ภายนอก)
        const testDict = ['ราวกับว่า', 'ดวงตาเป็นประกาย', 'ความรู้สึกแปลกๆ', 'a shiver ran down'];
        const matches = JBParser.scanForSlop(messageData.mes, testDict);
        if (matches.length === 0) return;

        const highlighted = JBParser.applySlopHighlights(messageData.mes, matches);
        
        // อัปเดตข้อความใน DOM (ST v1.17 อนุญาตให้แก้ .mes-text ได้)
        const $msg = $(`[data-id="${messageData.id}"] .mes-text`);
        $msg.html(highlighted);
        
        console.log(`[Slop Radar] 🚨 Found ${matches.length} slop words in msg ${messageData.id}`);
    }
    // ================= UI SETUP =================
    function setupCoreUI() {
        const $container = $(`
            <div id="jb-studio-root" class="jb-studio-root">
                <div id="jb-studio-fab" class="jb-studio-fab" title="JB Architect Studio">🏗️</div>
                <div id="jb-studio-panel" class="jb-studio-panel">
                    <div class="jb-studio-header">
                        <h3>JB Architect Studio</h3>
                        <button id="jb-studio-close" class="jb-studio-btn">✕</button>
                    </div>
                    <div class="jb-studio-content">
                        <p>ระบบโหลดสำเร็จ | v1.0.0-alpha</p>
                        <button id="jb-studio-test" class="jb-studio-btn primary">Test Event Hook</button>
                    </div>
                </div>
            </div>
        `);

        $('body').append($container);

        // UI Interactions
        $('#jb-studio-fab').on('click', () => $('#jb-studio-panel').toggleClass('active'));
        $('#jb-studio-close').on('click', () => $('#jb-studio-panel').removeClass('active'));
        $('#jb-studio-test').on('click', () => {
            console.log(`[${MODULE_NAME}] 🧪 Test Hook OK. Message received event is bound.`);
            alert('Hook OK! Check browser console (F12)');
        });
    }

    // ================= BOOT =================
    $(document).ready(init);

})(jQuery);
