/**
 * NEON QUEST: ADMIN TERMINAL ENGINE
 * Comandos: /censore, /kill, /killall, /filtrer
 */

const AdminTerminal = {
    isCensored: false,
    
    init() {
        // Escuchar la tecla "Enter" o "T" para abrir la terminal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = prompt("TERMINAL ADMIN:");
                if (cmd && cmd.startsWith('/')) {
                    this.execute(cmd);
                }
            }
        });
        console.log("⌨️ Terminal de Comandos Lista (Presiona Enter)");
    },

    execute(input) {
        if (!gameState.player.isAdmin) {
            alert("ACCESO DENEGADO: Solo administradores.");
            return;
        }

        const args = input.split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case '/censore':
                this.censoreGame();
                break;

            case '/kill':
                const target = args[1];
                this.killPlayer(target);
                break;

            case '/killall':
                this.killAll();
                break;

            case '/filtrer':
                this.applyRandomFilter();
                break;

            default:
                this.notify("Comando no reconocido.", "#ff0000");
        }
    },

    // 1. CENSURA: Cambia todos los textos del juego por asteriscos
    censoreGame() {
        this.isCensored = !this.isCensored;
        const msg = this.isCensored ? "CENSURA ACTIVADA" : "CENSURA DESACTIVADA";
        
        // Efecto visual: Si está activado, interceptamos los textos
        if (this.isCensored) {
            document.querySelectorAll('div, span, button').forEach(el => {
                if(el.innerText) el.setAttribute('data-old', el.innerText);
                el.innerText = "*******";
            });
        } else {
            document.querySelectorAll('div, span, button').forEach(el => {
                if(el.hasAttribute('data-old')) el.innerText = el.getAttribute('data-old');
            });
        }
        this.notify(msg, "#ffff00");
    },

    // 2. KILL NOMBRE: Elimina a un jugador específico de la lista
    killPlayer(name) {
        if (!name) return this.notify("Uso: /kill [nombre]", "#ff0000");
        
        const index = gameState.enemies.findIndex(e => e.name === name);
        if (index !== -1) {
            gameState.enemies.splice(index, 1);
            this.notify(`Jugador ${name} eliminado.`, "#00ff00");
        } else {
            this.notify("Jugador no encontrado.", "#ff0000");
        }
    },

    // 3. KILLALL: Limpia el array de enemigos/jugadores
    killAll() {
        const count = gameState.enemies.length;
        gameState.enemies = [];
        this.notify(`ANIKILACIÓN COMPLETA: ${count} entidades eliminadas.`, "#ff0000");
        
        // Efecto visual de sacudida
        document.body.style.animation = "shake 0.5s";
        setTimeout(() => document.body.style.animation = "", 500);
    },

    // 4. FILTRER: Cambia el estilo visual del canvas al azar
    applyRandomFilter() {
        const filters = [
            'hue-rotate(90deg)', 
            'invert(1)', 
            'grayscale(1)', 
            'sepia(1) saturate(5)', 
            'blur(2px) brightness(1.5)',
            'contrast(2) drop-shadow(0 0 10px red)'
        ];
        const randomFilter = filters[Math.floor(Math.random() * filters.length)];
        const canvas = document.querySelector('canvas');
        
        canvas.style.filter = randomFilter;
        this.notify("Filtro aplicado: " + randomFilter, "#00ffff");
    },

    notify(text, color) {
        console.log(`%c[ADMIN SYSTEM] ${text}`, `color: ${color}; font-weight: bold; font-size: 14px;`);
        // Opcional: Mostrar en el chat del juego si existe
        if (typeof addChatMessage === 'function') {
            addChatMessage("SISTEMA", text, color);
        }
    }
};

// Iniciar terminal
AdminTerminal.init();