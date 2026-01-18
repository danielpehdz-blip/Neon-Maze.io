/**
 * neón maze & ADMIN ENGINE
 * - Protección contra inspección
 * - Panel de funciones dinámicas
 * - Control de variables globales
 */

const AdminEngine = {
    // Configuración inicial de seguridad
    config: {
        antiInspect: true,
        devMode: false,
        adminPass: "m1n1kabc123456789", // Cambiar por seguridad
        godMode: true
    },

    // 1. SISTEMA DE SEGURIDAD (Protege tu sitio)
    initSecurity() {
        if (this.config.antiInspect) {
            // Bloquear clic derecho
            document.addEventListener('contextmenu', e => e.preventDefault());

            // Bloquear teclas de desarrollador (F12, Ctrl+Shift+I, etc)
            document.addEventListener('keydown', e => {
                if (e.keyCode == 123 || 
                    (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || 
                    (e.ctrlKey && e.keyCode == 85)) {
                    e.preventDefault();
                    return false;
                }
            });
        }
        console.log("🛡️ Seguridad Activada");
    },

    // 2. PANEL DE CONTROL (Para cambiar funciones en tiempo real)
    createAdminPanel() {
        const panel = document.createElement('div');
        panel.id = 'dynamic-admin-panel';
        panel.style = `
            position: absolute; top: 10px; left: 10px; 
            background: rgba(0,0,0,0.9); border: 1px solid #0f0;
            padding: 10px; z-index: 9999; display: none;
            font-family: monospace; color: #0f0; border-radius: 5px;
        `;
        
        panel.innerHTML = `
            <h4 style="border-bottom: 1px solid #0f0">⚙️ PANEL DE FUNCIONES</h4>
            <label>Velocidad:</label>
            <input type="range" id="set-speed" min="1" max="50" value="9">
            <br>
            <button onclick="AdminEngine.toggleGravity()">Cambiar Gravedad</button>
            <br>
            <button onclick="AdminEngine.resetEnemies()">Limpiar Enemigos</button>
            <br>
            <button onclick="AdminEngine.forceDevil()">Modo Diablo ON/OFF</button>
        `;
        document.body.appendChild(panel);
    },

    // 3. FUNCIONES CAMBIABLES POR EL ADMIN
    toggleGravity() {
        if (typeof gameState !== 'undefined') {
            gameState.gravity = !gameState.gravity;
            this.notify("Gravedad cambiada");
        }
    },

    forceDevil() {
        if (typeof p !== 'undefined') {
            p.isDevil = !p.isDevil;
            this.notify("Transformación forzada");
        }
    },

    resetEnemies() {
        if (typeof state !== 'undefined') {
            state.enemies = [];
            this.notify("Mapa limpiado");
        }
    },

    updateSpeed(val) {
        if (typeof p !== 'undefined') {
            p.speed = parseInt(val);
        }
    },

    notify(msg) {
        console.log("%c [ADMIN]: " + msg, "color: yellow; font-weight: bold;");
    },

    // Autenticación para mostrar el panel
    showIfAdmin(pass) {
        if (pass === this.config.adminPass) {
            document.getElementById('dynamic-admin-panel').style.display = 'block';
            this.notify("Acceso concedido al panel de funciones.");
        }
    }
};

// Inicializar al cargar
window.onload = () => {
    AdminEngine.initSecurity();
    AdminEngine.createAdminPanel();

    // Listener para el slider de velocidad
    document.getElementById('set-speed').oninput = function() {
        AdminEngine.updateSpeed(this.value);
    };

    // Detectar si el usuario logueado es admin para mostrar el panel
    // Esto se puede llamar desde tu función de login startSupreme()
    const checkInterval = setInterval(() => {
        if (typeof p !== 'undefined' && p.isAdmin) {
            AdminEngine.showIfAdmin("m1n1kabc123456789");
            clearInterval(checkInterval);
        }
    }, 1000);
};