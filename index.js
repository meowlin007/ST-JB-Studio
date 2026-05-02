/**
 * JB Architect Studio - Main Entry Point
 * SillyTavern Extension v1.0.0-alpha
 * Compatible with ST v1.17.0+
 */
(function($) {
    'use strict';

    // ================= CONSTANTS =================
    const MODULE_NAME = 'JB_Architect_Studio';
    const EXTENSION_ID = 'jb-architect-studio';
    const CONFIG_KEY = 'jb_studio_config_v1';

    // ================= CONFIG SYSTEM =================
    const defaultConfig = {
        enabled: true,
        debugMode: false,
        thinkDecoder: true,
        slopRadar: true,
        autoInject: false,
        language: 'th'
    };

    let config = { ...defaultConfig };

    function loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...defaultConfig, ...parsed };
                console.log(`[${MODULE_NAME}] ⚙️ Config loaded`);
            }
        } catch (e) {
            console.warn(`[${MODULE_NAME}] ⚠️ Config load failed, using defaults`, e);
            config = { ...defaultConfig };
        }
    }

    function saveConfig() {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn(`[${MODULE_NAME}] ⚠️ Config save failed`, e);
        }
    }

    // ================= CONFIG & DATA (ส่วนที่เพิ่มใหม่) =================
    let slopDictionary = [];
    async function loadSlopDictionary() {
        try {
            // extensionAPI จะถูก inject โดย SillyTavern อัตโนมัติ
            const response = await fetch(extensionAPI.getFileUrl('data/slop_dict.json'));
            const data = await response.json();
            
            // รวมทุกหมวดเป็น array เดียวสำหรับสแกน
            slopDictionary = [
                ...data.categories.thai_cliches,
                ...data.categories.english_cliches,
                ...data.categories.ai_slop_phrases,
                ...data.categories.ooc_markers
            ];
            
            console.log(`[JB Studio] 📚 Loaded ${slopDictionary.length} slop patterns`);
        } catch (error) {
            console.error('[JB Studio] ❌ Failed to load slop dictionary:', error);
            slopDictionary = [];
        }
    }

    // ================= EVENT HOOKS =================
    function onMessageReceived(event, messageData) {
        if (!config.enabled) return;
        if (!messageData?.mes || messageData.is_system) return;

        console.log(`📨 New message received: ID ${messageData.id}`);

        // เรียกใช้ Module ที่เปิดใช้งาน
        if (config.thinkDecoder) {
            processThinkDecoder(messageData);
        }
        if (config.slopRadar) {
            processSlopRadar(messageData);
        }
    }

    // ================= PHASE 1 MODULES =================
    function processThinkDecoder(messageData) {
        const thinkRaw = JBParser.extractThinkContent(messageData.mes);
        if (!thinkRaw) return;

        const structured = JBParser.structureThinkContent(thinkRaw);
        const btnId = `jb-think-${messageData.id}`;

        // ซ่อน <think> จาก UI หลัก
        const $msg = $(`[data-id="${messageData.id}"]`);
        $msg.find('p').each(function() {
            const html = $(this).html();
            $(this).html(html.replace(/<think>[\s\S]*?<\/think>/gi, ''));        });

        // เพิ่มปุ่ม Toggle
        $msg.find('.mes-buttons').prepend(`
            <div id="${btnId}" class="jb-think-toggle" title="View CoT Dashboard">
                🧠 <span>Thinking Process</span>
            </div>
        `);

        $(`#${btnId}`).on('click', () => {
            alert(`[JB Studio] 📊 CoT Summary:\n${structured.summary}\n\nKey Points:\n${structured.keyPoints.join('\n')}`);
            // Phase 2: จะเปลี่ยนเป็น Slide Panel จริง
        });
    }

    function processSlopRadar(messageData) {
        if (!config.slopRadar || slopDictionary.length === 0) return;
        
        const matches = JBParser.scanForSlop(messageData.mes, slopDictionary);
        if (matches.length === 0) return;

        const highlighted = JBParser.applySlopHighlights(messageData.mes, matches);
        
        // อัปเดตข้อความใน DOM
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
    async function init() {
        console.log(`[${MODULE_NAME}] 🚀 Initializing...`);
        
        // 1. โหลด config
        loadConfig();
        
        // 2. โหลด dictionary (await เพราะเป็น async)
        await loadSlopDictionary();
        
        // 3. ตั้งค่า UI
        setupCoreUI();
        
        // 4. Hook events
        $(document).on('message_received', onMessageReceived);
        
        console.log(`[${MODULE_NAME}] ✅ Ready.`);
    }

    $(document).ready(init);

})(jQuery);
