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

    // ================= EXTENSION API =================
    const extensionAPI = getExtensionApi();

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
    // ================= DATA LOADER =================
    let slopDictionary = [];

    async function loadSlopDictionary() {
        try {
            if (!extensionAPI) {
                throw new Error('Extension API not available');
            }
            const response = await fetch(extensionAPI.getFileUrl('data/slop_dict.json'));
            const data = await response.json();
            
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

        if (config.debugMode) {
            console.log(`📨 New message received: ID ${messageData.id}`);
        }

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
        const $msg = $(`[data-id="${messageData.id}"]`);
        $msg.find('p').each(function() {
            const html = $(this).html();
            $(this).html(html.replace(/<think>[\s\S]*?<\/think>/gi, ''));
        });

        $msg.find('.mes-buttons').prepend(`
            <div id="${btnId}" class="jb-think-toggle" title="View CoT Dashboard">
                🧠 <span>Thinking Process</span>
            </div>
        `);

        $(`#${btnId}`).on('click', () => {
            showThinkPanel(structured);
        });
    }

    function processSlopRadar(messageData) {
        if (!config.slopRadar || slopDictionary.length === 0) return;
        
        const matches = JBParser.scanForSlop(messageData.mes, slopDictionary);
        if (matches.length === 0) return;

        const highlighted = JBParser.applySlopHighlights(messageData.mes, matches);
        
        const $msg = $(`[data-id="${messageData.id}"] .mes-text`);
        $msg.html(highlighted);
        
        if (config.debugMode) {
            console.log(`[Slop Radar] 🚨 Found ${matches.length} slop words in msg ${messageData.id}`);
        }
    }

    // ================= UI COMPONENTS =================
    function showToast(message, type = 'success') {
        const toastId = `jb-toast-${Date.now()}`;
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6c5ce7'
        };
        
        const $toast = $(`
            <div id="${toastId}" class="jb-toast" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type]};
                color: white;                padding: 14px 20px;
                border-radius: 10px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                font-weight: 500;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            ">
                <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span>${message}</span>
            </div>
        `);
        
        $('body').append($toast);
        
        setTimeout(() => {
            $toast.css('animation', 'slideOut 0.3s ease');
            setTimeout(() => $toast.remove(), 300);
        }, 4000);
    }

    function showThinkPanel(data) {
        $('#jb-think-content').html(`
            <div style="padding: 12px;">
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; color: #a78bfa;">📊 Summary</h4>
                    <p style="margin: 0; color: #cbd5e1; line-height: 1.6;">${data.summary}</p>
                </div>
                ${data.keyPoints.length > 0 ? `
                <div>
                    <h4 style="margin: 0 0 8px 0; color: #a78bfa;">🎯 Key Points</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #cbd5e1;">
                        ${data.keyPoints.map(point => `<li style="margin-bottom: 6px;">${point}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                ${Object.keys(data.metrics).length > 0 ? `
                <div style="margin-top: 16px;">
                    <h4 style="margin: 0 0 8px 0; color: #a78bfa;">📈 Metrics</h4>
                    <div style="display: grid; gap: 6px;">
                        ${Object.entries(data.metrics).map(([key, val]) => `
                            <div style="background: rgba(108, 92, 231, 0.1); padding: 8px; border-radius: 6px;">
                                <strong style="color: #a78bfa;">${key}:</strong> <span style="color: #cbd5e1;">${val}</span>
                            </div>
                        `).join('')}
                    </div>                </div>
                ` : ''}
            </div>
        `);
        
        $('#jb-studio-panel').addClass('active');
    }

    function setupCoreUI() {
        const $container = $(`
            <div id="jb-studio-root" class="jb-studio-root">
                <div id="jb-studio-fab" class="jb-studio-fab" title="JB Architect Studio">🏗️</div>
                <div id="jb-studio-panel" class="jb-studio-panel">
                    <div class="jb-studio-header">
                        <h3>JB Architect Studio</h3>
                        <button id="jb-studio-close" class="jb-studio-btn">✕</button>
                    </div>
                    <div id="jb-think-content" class="jb-studio-content">
                        <div style="text-align: center; padding: 40px 20px;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🏗️</div>
                            <h4 style="margin: 0 0 8px 0; color: #e2e8f0;">JB Architect Studio</h4>
                            <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 13px;">
                                Live IDE for SillyTavern<br>
                                v1.0.0-alpha
                            </p>
                            <div style="display: grid; gap: 8px;">
                                <button id="jb-studio-test" class="jb-studio-btn primary">🧪 Test System</button>
                                <button id="jb-studio-config" class="jb-studio-btn">⚙️ Settings</button>
                                <button id="jb-studio-help" class="jb-studio-btn">📖 Documentation</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Extension Badge Indicator -->
                <div id="jb-ext-badge" style="
                    position: fixed;
                    bottom: 10px;
                    left: 10px;
                    background: linear-gradient(135deg, #6c5ce7, #a78bfa);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 600;
                    z-index: 9999;
                    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.4);
                    animation: pulse 2s infinite;
                ">
                    🏗️ JB Studio Active                </div>
            </div>
        `);

        $('body').append($container);

        // Add CSS animations
        if (!$('#jb-studio-animations').length) {
            $('head').append(`
                <style id="jb-studio-animations">
                    @keyframes slideIn {
                        from { transform: translateX(400px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(400px); opacity: 0; }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                </style>
            `);
        }

        // UI Interactions
        $('#jb-studio-fab').on('click', () => {
            $('#jb-studio-panel').toggleClass('active');
            if ($('#jb-studio-panel').hasClass('active')) {
                $('#jb-think-content').html(`
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🏗️</div>
                        <h4 style="margin: 0 0 8px 0; color: #e2e8f0;">JB Architect Studio</h4>
                        <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 13px;">
                            Live IDE for SillyTavern<br>
                            v1.0.0-alpha
                        </p>
                        <div style="display: grid; gap: 8px;">
                            <button id="jb-studio-test2" class="jb-studio-btn primary">🧪 Test System</button>
                            <button id="jb-studio-config2" class="jb-studio-btn">⚙️ Settings</button>
                        </div>
                    </div>
                `);
                bindPanelButtons();
            }
        });
        
        $('#jb-studio-close').on('click', () => $('#jb-studio-panel').removeClass('active'));
                bindPanelButtons();
    }

    function bindPanelButtons() {
        $('#jb-studio-test, #jb-studio-test2').off('click').on('click', () => {
            showToast('✅ System Test Passed! All modules loaded.', 'success');
            console.log(`[${MODULE_NAME}] 🧪 Test OK. Config:`, config);
            console.log(`[${MODULE_NAME}] 📚 Slop Dictionary:`, slopDictionary.length, 'patterns');
        });
        
        $('#jb-studio-config, #jb-studio-config2').off('click').on('click', () => {
            showToast('⚙️ Settings panel coming in v1.1', 'info');
        });
        
        $('#jb-studio-help').off('click').on('click', () => {
            window.open('https://github.com/meowlin007/ST-JB-Studio', '_blank');
        });
    }

    // ================= BOOT =================
    async function init() {
        console.log(`[${MODULE_NAME}] 🚀 Initializing...`);
        
        try {
            loadConfig();
            await loadSlopDictionary();
            setupCoreUI();
            
            $(document).on('message_received', onMessageReceived);
            
            // 🎉 Show success toast
            setTimeout(() => {
                showToast('🏗️ JB Architect Studio Loaded Successfully!', 'success');
            }, 500);
            
            console.log(`[${MODULE_NAME}] ✅ Ready.`);
        } catch (error) {
            console.error(`[${MODULE_NAME}] ❌ Initialization failed:`, error);
            showToast('❌ JB Studio failed to load. Check console.', 'error');
        }
    }

    $(document).ready(init);

})(jQuery);
