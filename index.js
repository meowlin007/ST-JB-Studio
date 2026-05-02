/**
 * JB Architect Studio v1.0.0
 */
(function() {
    'use strict';
    
    console.log('🏗️ JB Studio: Script loaded');
    
    // รอให้ jQuery พร้อม
    function waitForjQuery(callback) {
        if (typeof jQuery !== 'undefined') {
            callback(jQuery);
        } else {
            setTimeout(function() {
                waitForjQuery(callback);
            }, 100);
        }
    }
    
    waitForjQuery(function($) {
        console.log('🏗️ JB Studio: jQuery ready');
        
        // สร้างปุ่มทันที
        $('body').append(`
            <div id="jb-test-fab" style="
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: #ff0000;
                color: white;
                border: 3px solid white;
                border-radius: 50%;
                font-size: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 99999;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            ">🏗️</div>
        `);
        
        $('#jb-test-fab').on('click', function() {
            alert('✅ JB Studio Working!\nVersion: 1.0.0');
            console.log('🏗️ JB Studio: Button clicked');
        });
        
        // เพิ่ม Badge
        $('body').append(`
            <div style="
                position: fixed;
                bottom: 10px;
                left: 10px;
                background: #00ff00;
                color: black;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                z-index: 99999;
            ">🏗️ JB Studio Active</div>
        `);
        
        console.log('🏗️ JB Studio: UI created');
        
        // Hook message event
        $(document).on('message_received', function(event, data) {
            console.log('📨 JB Studio: Message received', data);
        });
    });
})();
