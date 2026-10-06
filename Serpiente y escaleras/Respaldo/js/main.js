var main = {
    key: 'main',
    active: false,
    init: function(data) {
        if (data && data.jugadores && data.jugadores.length > 0) {
            jugadores = data.jugadores;
        }
    },
    preload: carga,
    create: inicio,
    update: actualiza
};

var estaEsena;
var cam;
var msg;

// Variables para la herramienta trazadora
var puntosGenerados = [];
var lineaDibujo;

// --- CONFIGURACIÓN DE JUGADORES ---
var jugadores = [
    { id: 1, nombre: 'Tú', color: 0x007bff, casilla: 1, ficha: null, esIA: false },
    { id: 2, nombre: 'Bot IA', color: 0xff3333, casilla: 1, ficha: null, esIA: false }
];

var turnoActual = 0;
var enMovimientoGlobal = false;

// Elementos de la interfaz
var dadoSprite;
var textoTurno;
var textoTitulo;

function carga() {
    this.load.image('tablero', 'img/tablero2.png');
    this.load.image('dado', 'img/dado.png');
}

function inicio() {
    estaEsena = this;
    cam = this.cameras.main;
    msg = console.log;

    // --- 1. TÍTULO DEL JUEGO ---
    textoTitulo = this.add.text(375, 75, 'SERPIENTES Y ESCALERAS', {
        font: 'bold 34px Arial',
        fill: '#ffffff',
        stroke: '#00f2fe',
        strokeThickness: 4
    }).setOrigin(0.5);

    // --- 2. INDICADOR DE TURNO ---
    textoTurno = this.add.text(375, 145, `Turno de: ${jugadores[turnoActual].nombre}`, {
        font: 'bold 28px Arial',
        fill: '#4da6ff',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5);

    // --- 3. DIBUJAR EL TABLERO ---
    let tableroBg = this.add.image(375, 575, 'tablero');
    tableroBg.setDisplaySize(750, 750);

    // --- 4. RECORTAR DINÁMICAMENTE EL DADO ---
    let textureDado = this.textures.get('dado');
    let imgDado = textureDado.getSourceImage();
    let frameW = imgDado.width / 3;
    let frameH = imgDado.height / 5;

    let frameIdx = 0;
    for (let fila = 0; fila < 5; fila++) {
        for (let col = 0; col < 3; col++) {
            if (!textureDado.has(frameIdx.toString())) {
                textureDado.add(frameIdx, 0, col * frameW, fila * frameH, frameW, frameH);
            }
            frameIdx++;
        }
    }

    // --- 5. CREAR FICHAS EN CASILLA 1 ---
    jugadores.forEach((jugador) => {
        let posInicial = obtenerCoordenadasCasilla(jugador.casilla);

        jugador.ficha = this.add.graphics();
        jugador.ficha.fillStyle(jugador.color, 1);
        jugador.ficha.fillCircle(0, 0, 18);
        jugador.ficha.lineStyle(3, 0xffffff, 1);
        jugador.ficha.strokeCircle(0, 0, 18);

        jugador.ficha.setPosition(posInicial.x, posInicial.y);
    });

    acomodarFichasEnCasilla(1);

    // --- 6. ANIMACIÓN DEL DADO ---
    this.anims.create({
        key: 'rodar',
        frames: this.anims.generateFrameNumbers('dado', { start: 6, end: 12 }),
        frameRate: 15,
        repeat: 0
    });

    // --- 7. DADO EN PANTALLA ---
    dadoSprite = this.add.sprite(375, 1100, 'dado', 0);
    dadoSprite.setDisplaySize(300, 300);
    dadoSprite.setInteractive();

    dadoSprite.on('pointerdown', () => {
        if (!enMovimientoGlobal && !jugadores[turnoActual].esIA) {
            ejecutarTirada();
        }
    });

    // dibujarCurvasEnpantalla();
}

function actualiza() {}

/**
 * Realiza el lanzamiento del dado y la animación
 */
function ejecutarTirada() {
    enMovimientoGlobal = true;

    // Corrección: Usar Phaser.Math.Between en lugar de Random()
    let valorDado = Phaser.Math.Between(1, 6);
    let jugadorActual = jugadores[turnoActual];
    msg(`Tirada de ${jugadorActual.nombre}: ${valorDado}`);

    dadoSprite.play('rodar');

    dadoSprite.once('animationcomplete', () => {
        dadoSprite.setFrame(valorDado - 1);
        moverJugador(jugadorActual, valorDado);
    });
}

/**
 * Mueve la ficha del jugador actual paso a paso CON EFECTO DE SALTO
 */
async function moverJugador(jugadorActual, pasos) {
    let destino = jugadorActual.casilla + pasos;

    if (destino > 100) {
        msg(`¡${jugadorActual.nombre} se pasó de 100! Pierde el turno.`);
        siguienteTurno();
        return;
    }

    let casillaOrigen = jugadorActual.casilla;

    for (let i = 1; i <= pasos; i++) {
        let siguienteCasilla = casillaOrigen + i;
        jugadorActual.casilla = siguienteCasilla;

        if (i === 1) {
            acomodarFichasEnCasilla(casillaOrigen);
        }

        let pos = obtenerCoordenadasCasilla(siguienteCasilla);
        await darSaltoFicha(jugadorActual.ficha, pos.x, pos.y);
    }

    verificarAtajo(jugadorActual);
}

/**
 * Anima un salto individual
 */
function darSaltoFicha(ficha, destinoX, destinoY) {
    return new Promise(resolve => {
        let duracion = 500;

        estaEsena.tweens.add({
            targets: ficha,
            x: destinoX,
            y: destinoY,
            duration: duracion,
            ease: 'Linear',
            onComplete: resolve
        });

        estaEsena.tweens.add({
            targets: ficha,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: duracion / 2,
            yoyo: true,
            ease: 'Sine.easeOut'
        });
    });
}

/**
 * Comprueba si la casilla tiene escalera o serpiente
 */
function verificarAtajo(jugadorActual) {
    let casillaActual = jugadorActual.casilla;
    let tieneRuta = typeof RUTAS_SERPIENTES !== 'undefined' && RUTAS_SERPIENTES[casillaActual];

    if (typeof ATAJOS !== 'undefined' && ATAJOS[casillaActual]) {
        let destinoAtajo = ATAJOS[casillaActual];
        let esEscalera = destinoAtajo > casillaActual;

        let casillaSalida = casillaActual;
        jugadorActual.casilla = destinoAtajo;
        acomodarFichasEnCasilla(casillaSalida);

        if (!esEscalera && tieneRuta) {
            msg(`¡${jugadorActual.nombre} cayó en una serpiente!`);

            animarPorCurva(
                jugadorActual.ficha,
                RUTAS_SERPIENTES[casillaActual],
                { x: 0, y: 0 },
                2000,
                () => {
                    evaluarFinDeTurno(jugadorActual);
                }
            );

        } else {
            msg(esEscalera ? `¡${jugadorActual.nombre} subió una escalera!` : `¡${jugadorActual.nombre} bajó!`);

            let posFinal = obtenerCoordenadasCasilla(destinoAtajo);

            estaEsena.tweens.add({
                targets: jugadorActual.ficha,
                x: posFinal.x,
                y: posFinal.y,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    evaluarFinDeTurno(jugadorActual);
                }
            });
        }
    } else {
        evaluarFinDeTurno(jugadorActual);
    }
}

/**
 * Anima el recorrido por una curva
 */
function animarPorCurva(objeto, listaPuntos, offset, duracion, alTerminar) {
    let puntosVector = listaPuntos.map(p => new Phaser.Math.Vector2(p.x + offset.x, p.y + offset.y));
    let curva = new Phaser.Curves.Spline(puntosVector);
    let progreso = { t: 0 };

    estaEsena.tweens.add({
        targets: progreso,
        t: 1,
        duration: duracion,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
            let posActual = curva.getPoint(progreso.t);
            objeto.setPosition(posActual.x, posActual.y);
        },
        onComplete: () => {
            if (alTerminar) alTerminar();
        }
    });
}

/**
 * Separa con animación las fichas que compartan una misma casilla
 */
function acomodarFichasEnCasilla(numCasilla, alTerminar) {
    let fichasEnCasilla = jugadores.filter(j => j.casilla === numCasilla);
    let posBase = obtenerCoordenadasCasilla(numCasilla);

    if (fichasEnCasilla.length <= 1) {
        if (fichasEnCasilla.length === 1) {
            estaEsena.tweens.add({
                targets: fichasEnCasilla[0].ficha,
                x: posBase.x,
                y: posBase.y,
                duration: 350,
                ease: 'Power2',
                onComplete: () => { if (alTerminar) alTerminar(); }
            });
        } else {
            if (alTerminar) alTerminar();
        }
        return;
    }

    const offsets = [
        { x: -14, y: -14 },
        { x:  14, y:  14 },
        { x: -14, y:  14 },
        { x:  14, y: -14 }
    ];

    let promesas = [];

    fichasEnCasilla.forEach((j, idx) => {
        let off = offsets[idx] || { x: 0, y: 0 };

        promesas.push(new Promise(resolve => {
            estaEsena.tweens.add({
                targets: j.ficha,
                x: posBase.x + off.x,
                y: posBase.y + off.y,
                duration: 400,
                ease: 'Back.out',
                onComplete: resolve
            });
        }));
    });

    Promise.all(promesas).then(() => {
        if (alTerminar) alTerminar();
    });
}

/**
 * Verifica condición de victoria o pasa el turno
 */
function evaluarFinDeTurno(jugadorActual) {
    acomodarFichasEnCasilla(jugadorActual.casilla, () => {
        if (jugadorActual.casilla === 100) {
            let mensajeGanador = jugadorActual.esIA ? '¡GANÓ LA IA! 🤖' : '¡GANASTE TÚ! 🎉';
            textoTurno.setText(mensajeGanador);
            msg(mensajeGanador);
        } else {
            siguienteTurno();
        }
    });
}

/**
 * Cambia el turno
 */
function siguienteTurno() {
    turnoActual = (turnoActual + 1) % jugadores.length;
    let jugadorActual = jugadores[turnoActual];

    textoTurno.setText(`Turno de: ${jugadorActual.nombre}`);
    textoTurno.setStyle({ fill: jugadorActual.esIA ? '#ff6666' : '#4da6ff' });

    enMovimientoGlobal = false;

    if (jugadorActual.esIA) {
        estaEsena.time.delayedCall(1000, () => {
            ejecutarTirada();
        });
    }
}

function obtenerOffsetFicha(indiceJugador) {
    return { x: 0, y: 0 };
}

function dibujarCurvasEnpantalla(){
    lineaDibujo = estaEsena.add.graphics();

    estaEsena.input.on('pointerdown', (pointer) => {
        puntosGenerados.push({ x: Math.round(pointer.x), y: Math.round(pointer.y) });

        lineaDibujo.clear();
        lineaDibujo.lineStyle(4, 0xff0000, 1);

        if (puntosGenerados.length > 1) {
            let vectores = puntosGenerados.map(p => new Phaser.Math.Vector2(p.x, p.y));
            let spline = new Phaser.Curves.Spline(vectores);
            spline.draw(lineaDibujo, 64);
        }

        console.log("Ruta actual:\n" + JSON.stringify(puntosGenerados));
    });
}

/**
 * Calcula las coordenadas X, Y del centro de cualquier casilla (1 al 100)
 * para un tablero de 750x750 centrado en (375, 575).
 */
function obtenerCoordenadasCasilla(numCasilla) {
    if (!numCasilla || numCasilla < 1) numCasilla = 1;
    if (numCasilla > 100) numCasilla = 100;

    const TAMANO_CASILLA = 75; // 750 / 10
    const BASE_Y = 950;        // Borde inferior del tablero (575 + 375)
    const BASE_X = 0;          // Borde izquierdo del tablero

    // Fila de abajo hacia arriba (0 a 9)
    let fila = Math.floor((numCasilla - 1) / 10);
    
    // Posición dentro de la fila (0 a 9)
    let col = (numCasilla - 1) % 10;

    // Las filas impares van de derecha a izquierda (efecto serpiente)
    if (fila % 2 !== 0) {
        col = 9 - col;
    }

    // Calcular el centro de la casilla
    let x = BASE_X + (col * TAMANO_CASILLA) + (TAMANO_CASILLA / 2);
    let y = BASE_Y - (fila * TAMANO_CASILLA) - (TAMANO_CASILLA / 2);

    return { x: x, y: y };
}
