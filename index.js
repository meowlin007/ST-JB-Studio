/**
 * JB Architect Studio - Main Entry Point
 * SillyTavern Extension v1.0.0-alpha
 */
(function($) {
    'use strict';

    const MODULE_NAME = 'JB_Architect_Studio';
    const CONFIG_KEY = 'jb_studio_config_v1';

    // ================= SAFE API INIT =================
    let extensionAPI = null;
    
    try {
        if (typeof getExtensionApi === 'function') {
            extensionAPI = getExtensionApi();
            console.log(`[${MODULE_NAME}] ✅ Extension API connected`);
        } else {
            console.warn(`[${MODULE_NAME}] ⚠️ getExtensionApi not found`);
        }
    } catch (e) {
        console.error(`[${MODULE_NAME}] ❌ API init failed:`, e);
    }

    // ================= CONFIG =================
    const defaultConfig = {
        enabled: true,
        debugMode: false,
        thinkDecoder: true,
        slopRadar: true
    };

    let config = { ...defaultConfig };

    function loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_KEY);
            if (saved) {
                config = { ...defaultConfig, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn(`[${MODULE_NAME}] Config load failed`);
        }
    }

    // ================= DATA =================
    let slopDictionary = [];

    async function loadSlopDictionary() {
        try {            if (!extensionAPI) {
                console.warn(`[${MODULE_NAME}] No API, skipping dict load`);
                return;
            }
            
            const url = extensionAPI.getFileUrl('data/slop_dict.json');
            const response = await fetch(url);
            const data = await response.json();
            
            slopDictionary = [
                ...data.categories.thai_cliches,
                ...data.categories.english_cliches,
                ...data.categories.ai_slop_phrases,
                ...data.categories.ooc_markers
            ];
            
            console.log(`[${MODULE_NAME}] 📚 Loaded ${slopDictionary.length} patterns`);
        } catch (error) {
            console.error(`[${MODULE_NAME}] Dict load error:`, error);
        }
    }

    // ================= MODULES =================
    function processThinkDecoder(messageData) {
        if (!config.thinkDecoder || !messageData?.mes) return;
        
        try {
            const thinkRaw = window.JBParser?.extractThinkContent(messageData.mes);
            if (!thinkRaw) return;

            const structured = window.JBParser?.structureThinkContent(thinkRaw);
            if (!structured) return;

            const btnId = `jb-think-${messageData.id}`;
            const $msg = $(`[data-id="${messageData.id}"]`);
            
            // ซ่อน <think>
            $msg.find('p').each(function() {
                const html = $(this).html();
                $(this).html(html.replace(/<think>[\s\S]*?<\/think>/gi, ''));
            });

            // เพิ่มปุ่ม
            $msg.find('.mes-buttons').prepend(`
                <div id="${btnId}" class="jb-think-toggle" title="View CoT">
                    🧠 <span>Think</span>
                </div>
            `);

            $(`#${btnId}`).on('click', () => {                alert(`CoT Summary:\n${structured.summary}`);
            });
        } catch (e) {
            console.error(`[${MODULE_NAME}] Think decoder error:`, e);
        }
    }

    function processSlopRadar(messageData) {
        if (!config.slopRadar || !messageData?.mes || slopDictionary.length === 0) return;
        
        try {
            const matches = window.JBParser?.scanForSlop(messageData.mes, slopDictionary);
            if (!matches || matches.length === 0) return;

            const highlighted = window.JBParser?.applySlopHighlights(messageData.mes, matches);
            if (!highlighted) return;
            
            const $msg = $(`[data-id="${messageData.id}"] .mes-text`);
            $msg.html(highlighted);
        } catch (e) {
            console.error(`[${MODULE_NAME}] Slop radar error:`, e);
        }
    }

    // ================= UI =================
    function showToast(message, type = 'success') {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6c5ce7'
        };
        
        const $toast = $(`
            <div class="jb-toast" style="
                position: fixed; top: 20px; right: 20px;
                background: ${colors[type]}; color: white;
                padding: 14px 20px; border-radius: 10px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
                z-index: 99999; font-size: 14px;
                animation: slideIn 0.3s ease;
            ">
                ${message}
            </div>
        `);
        
        $('body').append($toast);
        setTimeout(() => $toast.remove(), 4000);
    }
    function setupUI() {
        $('body').append(`
            <div id="jb-studio-root">
                <div id="jb-studio-fab" style="
                    position: fixed; bottom: 24px; right: 24px;
                    width: 52px; height: 52px;
                    background: #6c5ce7; color: white;
                    border: none; border-radius: 50%;
                    font-size: 22px; cursor: pointer;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
                    z-index: 9999;
                ">🏗️</div>
                
                <div id="jb-badge" style="
                    position: fixed; bottom: 10px; left: 10px;
                    background: linear-gradient(135deg, #6c5ce7, #a78bfa);
                    color: white; padding: 6px 12px;
                    border-radius: 20px; font-size: 11px;
                    font-weight: 600; z-index: 9999;
                ">🏗️ JB Studio</div>
            </div>
        `);

        $('#jb-studio-fab').on('click', () => {
            showToast('🏗️ JB Architect Studio v1.0\nSystem Ready!', 'success');
        });

        // Add animation
        $('head').append(`
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .jb-think-toggle {
                    display: inline-flex; align-items: center;
                    gap: 5px; padding: 4px 8px;
                    background: rgba(108, 92, 231, 0.15);
                    color: #a78bfa; border-radius: 6px;
                    font-size: 12px; cursor: pointer;
                    margin-top: 6px;
                }
                mark.jb-slop {
                    background: rgba(239, 68, 68, 0.25);
                    color: #fca5a5; border-bottom: 2px solid #ef4444;
                    padding: 0 2px; border-radius: 3px;
                }
            </style>
        `);
    }
    // ================= EVENTS =================
    function onMessageReceived(event, messageData) {
        if (!config.enabled || !messageData?.mes || messageData.is_system) return;
        processThinkDecoder(messageData);
        processSlopRadar(messageData);
    }

    // ================= INIT =================
    async function init() {
        console.log(`[${MODULE_NAME}] 🚀 Starting...`);
        
        try {
            loadConfig();
            await loadSlopDictionary();
            setupUI();
            
            $(document).on('message_received', onMessageReceived);
            
            setTimeout(() => {
                showToast('🏗️ JB Studio Loaded!', 'success');
            }, 1000);
            
            console.log(`[${MODULE_NAME}] ✅ Ready`);
        } catch (error) {
            console.error(`[${MODULE_NAME}] Init error:`, error);
            showToast('❌ JB Studio Error', 'error');
        }
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(jQuery);
