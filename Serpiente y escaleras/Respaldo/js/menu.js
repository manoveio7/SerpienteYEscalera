var menu = {
    key: 'menu',
    active: true,
    preload: cargaMenu,
    create: inicioMenu,
    update: actualizaMenu
};

// Paleta Neón
const PALETA_COLORES = [
    { hex: 0x00f2fe, css: '#00f2fe', nombre: 'Cian' },
    { hex: 0xff3366, css: '#ff3366', nombre: 'Rojo' },
    { hex: 0x00ff88, css: '#00ff88', nombre: 'Verde' },
    { hex: 0xffcc00, css: '#ffcc00', nombre: 'Amarillo' },
    { hex: 0xaa00ff, css: '#aa00ff', nombre: 'Púrpura' },
    { hex: 0xff6600, css: '#ff6600', nombre: 'Naranja' }
];

var numJugadores = 2;
var configJugadores = [];
var contenedoresTarjetas = [];
var particulas = [];
var btnEmpezarContainer = null;

function cargaMenu() {}

function inicioMenu() {
    let escena = this;
    let ancho = 750;
    let alto = 1334;

    // --- 1. FONDO CON GRADIENTE Y PARTÍCULAS --
    let fondoGraphics = this.add.graphics();
    fondoGraphics.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a3a, 0x120c24, 1);
    fondoGraphics.fillRect(0, 0, ancho, alto);

    // Partículas flotantes
    particulas = [];
    for (let i = 0; i < 30; i++) {
        let p = this.add.circle(
            Phaser.Math.Between(0, ancho),
            Phaser.Math.Between(0, alto),
            Phaser.Math.Between(2, 5),
            0x00f2fe,
            Phaser.Math.FloatBetween(0.15, 0.4)
        );
        particulas.push({
            obj: p,
            velY: Phaser.Math.FloatBetween(-0.2, -0.8)
        });
    }

    // --- 2. ENCABEZADO / TÍTULO (SIN RECUADRO Y MÁS GRANDE) ---
    this.add.text(375, 65, 'SERPIENTES Y ESCALERAS', {
        font: '900 42px Arial',
        fill: '#ffffff',
        stroke: '#00f2fe',
        strokeThickness: 2
    }).setOrigin(0.5);

    this.add.text(375, 112, '— CONFIGURACIÓN DE PARTIDA —', {
        font: 'bold 15px Arial',
        fill: '#00f2fe'
    }).setOrigin(0.5);

    // --- 3. SELECCIÓN DE MODO DE JUEGO ---
    this.add.text(375, 165, 'SELECCIONA MODO / JUGADORES', {
        font: 'bold 16px Arial',
        fill: '#a0a0d0'
    }).setOrigin(0.5);

    let opcionesModos = [
        { label: '1 vs IA', cant: 1 },
        { label: '2 Jug.', cant: 2 },
        { label: '3 Jug.', cant: 3 },
        { label: '4 Jug.', cant: 4 }
    ];

    let botonesModo = [];

    opcionesModos.forEach((opt, index) => {
        let posX = 125 + (index * 166);
        let posY = 210;

        let btnGfx = escena.add.graphics();
        btnGfx.setInteractive(new Phaser.Geom.Rectangle(posX - 70, posY - 24, 140, 48), Phaser.Geom.Rectangle.Contains);

        let txtBtn = escena.add.text(posX, posY, opt.label, {
            font: 'bold 18px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        let redibujarBoton = (seleccionado) => {
            btnGfx.clear();
            if (seleccionado) {
                btnGfx.fillStyle(0x00f2fe, 1);
                btnGfx.fillRoundedRect(posX - 70, posY - 24, 140, 48, 12);
                txtBtn.setStyle({ fill: '#0a0a1a' });
            } else {
                btnGfx.fillStyle(0x1a1a38, 0.8);
                btnGfx.fillRoundedRect(posX - 70, posY - 24, 140, 48, 12);
                btnGfx.lineStyle(1, 0xffffff, 0.2);
                btnGfx.strokeRoundedRect(posX - 70, posY - 24, 140, 48, 12);
                txtBtn.setStyle({ fill: '#ffffff' });
            }
        };

        btnGfx.on('pointerdown', () => {
            numJugadores = opt.cant;
            botonesModo.forEach(b => b.actualizar(b.cant === numJugadores));
            escena.actualizarTarjetasJugadores();
        });

        botonesModo.push({ actualizar: redibujarBoton, cant: opt.cant });
        redibujarBoton(opt.cant === numJugadores);
    });

    // --- 4. CREAR BOTÓN EMPEZAR ---
    btnEmpezarContainer = this.add.container(375, 1230);

    let btnBg = this.add.graphics();
    btnBg.fillStyle(0x00b894, 1);
    btnBg.fillRoundedRect(-180, -32, 360, 64, 20);
    btnBg.lineStyle(3, 0x55efc4, 1);
    btnBg.strokeRoundedRect(-180, -32, 360, 64, 20);

    let txtJugar = this.add.text(0, 0, '¡EMPEZAR JUEGO! 🎲', {
        font: 'bold 24px Arial',
        fill: '#ffffff'
    }).setOrigin(0.5);

    btnEmpezarContainer.add([btnBg, txtJugar]);
    btnEmpezarContainer.setSize(360, 64);
    btnEmpezarContainer.setInteractive({ useHandCursor: true });

    // Animación de pulso
    this.tweens.add({
        targets: btnEmpezarContainer,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    btnEmpezarContainer.on('pointerdown', () => {
        configJugadores.forEach((j, idx) => {
            let inputDom = document.getElementById(`input_nombre_${idx}`);
            if (inputDom && inputDom.value.trim() !== '') {
                j.nombre = inputDom.value.trim();
            }
        });

        escena.scene.start('main', { jugadores: configJugadores });
    });

    // --- 5. GENERAR TARJETAS ---
    this.actualizarTarjetasJugadores();
}

function actualizaMenu() {
    particulas.forEach(p => {
        p.obj.y += p.velY;
        if (p.obj.y < -10) {
            p.obj.y = 1340;
            p.obj.x = Phaser.Math.Between(0, 750);
        }
    });
}

/**
 * Genera las tarjetas dinámicas de los jugadores
 */
Phaser.Scene.prototype.actualizarTarjetasJugadores = function() {
    contenedoresTarjetas.forEach(c => c.destroy());
    contenedoresTarjetas = [];
    configJugadores = [];

    let totalFilas = (numJugadores === 1) ? 2 : numJugadores;
    let startY = 265;
    let cardHeight = (totalFilas > 3) ? 200 : 215;
    let spacingY = (totalFilas > 3) ? 210 : 225;

    for (let i = 0; i < totalFilas; i++) {
        let esBot = (numJugadores === 1 && i === 1);
        let colorDefecto = PALETA_COLORES[i % PALETA_COLORES.length];

        let configJ = {
            id: i + 1,
            nombre: esBot ? 'Bot IA' : `Jugador ${i + 1}`,
            color: colorDefecto.hex,
            casilla: 1,
            ficha: null,
            esIA: esBot
        };

        configJugadores.push(configJ);

        let posY = startY + (i * spacingY);
        let tarjetaContainer = this.add.container(375, posY);

        let bgCard = this.add.graphics();
        let redibujarFondoTarjeta = () => {
            bgCard.clear();
            bgCard.fillStyle(0x121226, 0.9);
            bgCard.fillRoundedRect(-330, 0, 660, cardHeight, 18);
            bgCard.lineStyle(2, configJ.color, 0.8);
            bgCard.strokeRoundedRect(-330, 0, 660, cardHeight, 18);
        };
        redibujarFondoTarjeta();

        let txtHeader = this.add.text(-300, 15, esBot ? '🤖 OPONENTE:' : `👤 JUGADOR ${i + 1}`, {
            font: 'bold 16px Arial',
            fill: '#a0a0d0'
        });

        tarjetaContainer.add([bgCard, txtHeader]);

        if (!esBot) {
            let txtLabelInput = this.add.text(-300, 42, '✏️ Nombre:', {
                font: 'bold 14px Arial',
                fill: '#ffffff'
            });
            tarjetaContainer.add(txtLabelInput);

            let inputHTML = document.createElement('input');
            inputHTML.type = 'text';
            inputHTML.id = `input_nombre_${i}`;
            inputHTML.placeholder = `Nombre Jugador ${i + 1}`;
            inputHTML.value = `Jugador ${i + 1}`;
            inputHTML.style.cssText = `
                width: 580px;
                height: 38px;
                background: #080814;
                border: 2px solid #2a2a4a;
                border-radius: 8px;
                color: #ffffff;
                font-size: 16px;
                font-weight: bold;
                padding-left: 12px;
                outline: none;
                box-sizing: border-box;
            `;

            inputHTML.onfocus = () => { inputHTML.style.borderColor = '#00f2fe'; };
            inputHTML.onblur = () => { inputHTML.style.borderColor = '#2a2a4a'; };

            let domInput = this.add.dom(0, 80, inputHTML);
            tarjetaContainer.add(domInput);

            let txtColorLabel = this.add.text(-300, 115, '🎨 Color de Ficha:', {
                font: 'bold 14px Arial',
                fill: '#ffffff'
            });
            tarjetaContainer.add(txtColorLabel);

            PALETA_COLORES.forEach((col, cIdx) => {
                let posXCircle = -120 + (cIdx * 65);
                let posYCircle = 123;

                let cGfx = this.add.graphics();
                cGfx.setInteractive(new Phaser.Geom.Circle(posXCircle, posYCircle, 16), Phaser.Geom.Circle.Contains);

                let renderColorCircle = () => {
                    cGfx.clear();
                    cGfx.fillStyle(col.hex, 1);
                    cGfx.fillCircle(posXCircle, posYCircle, 16);

                    if (configJ.color === col.hex) {
                        cGfx.lineStyle(3, 0xffffff, 1);
                        cGfx.strokeCircle(posXCircle, posYCircle, 20);
                    }
                };

                cGfx.on('pointerdown', () => {
                    configJ.color = col.hex;
                    redibujarFondoTarjeta();

                    tarjetaContainer.list.forEach(item => {
                        if (item.actualizarColor) item.actualizarColor();
                    });
                });

                cGfx.actualizarColor = renderColorCircle;
                renderColorCircle();
                tarjetaContainer.add(cGfx);
            });

        } else {
            let txtBotName = this.add.text(-300, 55, 'Computadora (Inteligencia Artificial)', {
                font: 'bold 22px Arial',
                fill: '#ff3366'
            });

            let txtBotDesc = this.add.text(-300, 105, 'Color asignado: Rojo Neón automático', {
                font: '15px Arial',
                fill: '#8888aa'
            });

            tarjetaContainer.add([txtBotName, txtBotDesc]);
        }

        contenedoresTarjetas.push(tarjetaContainer);
    }

    if (btnEmpezarContainer) {
        let ultimaTarjetaY = startY + ((totalFilas - 1) * spacingY) + cardHeight;
        btnEmpezarContainer.setY(Math.max(1210, ultimaTarjetaY + 50));
    }
};
