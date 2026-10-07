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


// --- CONFIGURACIÓN DE JUGADORES ---
var jugadores = [
    { id: 1, nombre: 'Tú', color: 0x007bff, casilla: 1, ficha: null, esIA: false },
    { id: 2, nombre: 'Bot IA', color: 0xff3333, casilla: 1, ficha: null, esIA: false }
];

var turnoActual = 0;
var enMovimientoGlobal;

// Elementos de la interfaz
var dadoSprite;
var textoTurno;
var textoTitulo;
var flecha;

// cargar áudios....
var auGiraDado;
var auCaeDado;
var auMover;
var auSeparar;
var auSubeEscalera;
var auSerpiente;
var auWin;

//Herramienta para grabar cordenadas en pantalla de serpiente 
// Variables para la herramienta trazadora
var puntosGenerados = [];
var lineaDibujo;

function dibujarCurvasEnpantalla(){
    lineaDibujo = estaEsena.add.graphics();

    estaEsena.input.on('pointerdown', (pointer) => {
        puntosGenerados.push({ x: Math.round(pointer.x), y: Math.round(pointer.y) });

        lineaDibujo.clear();
        lineaDibujo.lineStyle(12, 0xff0000, 1);

        if (puntosGenerados.length > 1) {
            let vectores = puntosGenerados.map(p => new Phaser.Math.Vector2(p.x, p.y));
            let spline = new Phaser.Curves.Spline(vectores);
            spline.draw(lineaDibujo, 64);
        }

        console.log("Ruta actual:\n" + JSON.stringify(puntosGenerados));
    });
}

function carga() {
    this.load.image('tablero', './img/tablero2.png');
    this.load.image('dado', './img/dado.png');
    this.load.image('flecha', './img/flecha.png');
    
    // Carga audios....
    this.load.audio('auGiraDado', './audios/giraDado.ogg');
    this.load.audio('auCaeDado', './audios/caeDado.ogg');
    this.load.audio('auMover', './audios/mover.ogg');
    this.load.audio('auSeparar', './audios/separar.ogg');
    this.load.audio('auSubeEscalera', './audios/subeEscalera.ogg');
    this.load.audio('auSerpiente', './audios/serpiente.ogg');
    this.load.audio('auWin', './audios/win.wav');

}

function inicio() {
    enMovimientoGlobal = false;
    estaEsena = this;
    cam = this.cameras.main;
    msg = console.log;
    
    // Instanciar audios
    auGiraDado = this.sound.add('auGiraDado')
    auCaeDado =  this.sound.add('auCaeDado').setVolume(0.1);
    auMover = this.sound.add('auMover');
    auSeparar = this.sound.add('auSeparar').setVolume(0.2)
    auSubeEscalera = this.sound.add('auSubeEscalera').setVolume(0.9)
    auSerpiente = this.sound.add('auSerpiente').setVolume(0.9)
    auWin = this.sound.add('auWin')
    // Generar textura de estrella para la celebración
    generarTexturaEstrella(this);

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
        let posInicial = getPosCasilla(jugador.casilla);

        jugador.ficha = this.add.graphics();

        // 1. Círculo exterior (Base de la ficha - Radio 18)
        jugador.ficha.fillStyle(jugador.color, 1);
        jugador.ficha.fillCircle(0, 0, 18);
        jugador.ficha.lineStyle(3, 0xffffff, 1);
        jugador.ficha.strokeCircle(0, 0, 18);

        // 2. Círculo interior (Tono más oscuro tipo ficha clásica - Radio 11)
        let colorOscuro = Phaser.Display.Color.ValueToColor(jugador.color).darken(25).color;
        
        jugador.ficha.fillStyle(colorOscuro, 1);
        jugador.ficha.fillCircle(0, 0, 11);
        jugador.ficha.lineStyle(1.5, 0xffffff, 0.5); // Borde sutil interior
        jugador.ficha.strokeCircle(0, 0, 11);

        jugador.ficha.setPosition(posInicial.x, posInicial.y);
    });


    acomodarFichasEnCasilla(1);

    // --- 6. ANIMACIÓN DEL DADO ---
     if (!this.anims.exists('rodar')) {
        this.anims.create({
            key: 'rodar',
            frames: this.anims.generateFrameNumbers('dado', { start: 6, end: 12 }),
            frameRate: 15,
            repeat: 0
        });
     };
    
    crearInterfazDadoYJugadores();

    // --- 7. DADO EN PANTALLA ---
    dadoSprite = this.add.sprite(cam.width/2+10, 1000, 'dado', 0);
    dadoSprite.setDisplaySize(350, 350);
    dadoSprite.setInteractive();

    dadoSprite.on('pointerdown', () => {
        if (!enMovimientoGlobal && !jugadores[turnoActual].esIA) {
            ejecutarTirada();
            flecha.setVisible(false)
            flecha.setAlpha(0)
        }
    });
    
    flecha = this.add.image(cam.width/2,cam.height-600,'flecha')
    .setScale(0.5,1)
    .setAngle(90)
    .setAlpha(0)
    
    flecha.anim = this.tweens.add({
        targets: flecha,
        y: { from: cam.height - 600, to: cam.height - 500 }, // 👈 Origen y destino fijos
        alpha: { from: 0, to: 1 },                           // 👈 Transparencia fija
        duration: 500,
        ease: 'Sine.easeInOut',
        yoyo: true,                                          // 👈 Sube y baja suavemente
        repeat: -1
    });
    
   /* flecha.anim = this.tweens.add({
        targets: flecha,
            y: cam.height-500,
            alpha: 1,
            duration: 1000,
            ease: 'Sine.easeOut',
            repeat: -1
    })
    */
    
    //dibujarCurvasEnpantalla()
}

function actualiza() {}

/**
 * Realiza el lanzamiento del dado y la animación
 */
function ejecutarTirada() {
    auGiraDado.play();
    enMovimientoGlobal = true;

    let valorDado = Phaser.Math.Between(1, 6);
    let jugadorActual = jugadores[turnoActual];
    msg(`Tirada de ${jugadorActual.nombre}: ${valorDado}`);

    dadoSprite.play('rodar');

    dadoSprite.once('animationcomplete', () => {
        auCaeDado.play();
        dadoSprite.setFrame(valorDado - 1);
        estaEsena.time.delayedCall(1000, () => {
             moverJugador(jugadorActual, valorDado); 
        });
    });
}

/**
 * Mueve la ficha del jugador actual paso a paso CON EFECTO DE SALTO
 */
async function moverJugador(jugadorActual, pasos) {
    let destino = jugadorActual.casilla + pasos;
    
    if (destino > 100) {
      let falta = 100 - jugadorActual.casilla;
        textoTurno.setText(`¡SE PASÓ! ${jugadorActual.nombre.toUpperCase()} NECESITA UN ${falta}`);
        textoTurno.setStyle({ fill: '#ffcc00' }); // Color amarillo de advertencia
        
         // Animar parpadeo del texto durante 3 segundos (6 ciclos de 500ms)
        estaEsena.tweens.add({
            targets: textoTurno,
            alpha: 0.1,
            duration: 250,
            yoyo: true,
            repeat: 2, 
            onComplete: () => {
                textoTurno.setAlpha(1);
            }
        });
        
        // Espera 500ms segundos para que el jugador pueda leer el mensaje antes de pasar turno
        estaEsena.time.delayedCall(2500, () => {
            siguienteTurno();
        });
        return;
    }

    let casillaOrigen = jugadorActual.casilla;

    for (let i = 1; i <= pasos; i++) {
        let siguienteCasilla = casillaOrigen + i;
        jugadorActual.casilla = siguienteCasilla;

        if (i === 1) {
            acomodarFichasEnCasilla(casillaOrigen);
        }

        let pos = getPosCasilla(siguienteCasilla);
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
            ease: 'Sine.easeOut',
            onComplete: ()=>{
                auMover.play();
            }
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
            
            auSerpiente.play();
            
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
            
            auSubeEscalera.play();
            let posFinal = getPosCasilla(destinoAtajo);

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
    let posBase = getPosCasilla(numCasilla);
    
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
    
    auSeparar.play();
    
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
            let mensajeGanador = jugadorActual.esIA ? '¡GANÓ LA IA! 🤖' : `¡GANÓ ${jugadorActual.nombre.toUpperCase()}! 🎉`;
            textoTurno.setText(mensajeGanador);
            textoTurno.setStyle({ fill: '#00ffcc', font: 'bold 36px Arial' });
            msg(mensajeGanador);
            
            auWin.play();

            // --- CELEBRACIÓN DE VICTORIA ---
            animarFichaGanadora(estaEsena, jugadorActual.ficha);
            lanzarParticulasEstrellas(estaEsena, textoTurno.x, textoTurno.y);
            
             // 👇 Aparece el botón de regresar al menú
            crearBotonVolverAJugar(estaEsena);
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

    // 👇 Si le faltan menos de 6 casillas, avisa arriba en el texto de turno
    let falta = 100 - jugadorActual.casilla;
    if (falta < 6) {
        textoTurno.setText(`Turno de: ${jugadorActual.nombre} (¡Necesita un ${falta}!)`);
    } else {
        textoTurno.setText(`Turno de: ${jugadorActual.nombre}`);
    }

    textoTurno.setStyle({ fill: jugadorActual.esIA ? '#ff6666' : '#4da6ff' });

    // Actualiza el resplandor al cambiar de turno
    actualizarResplandorTurno();
   
    enMovimientoGlobal = false;
    
    // 👇 CONTROL DE FLECHA: Solo visible si le toca a un humano
    if (!jugadorActual.esIA) {
        //flecha.setAlpha(1);
        flecha.setVisible(true);
        flecha.anim.restart();
    } else {
        flecha.setVisible(false);
    }

    if (jugadorActual.esIA) {
        estaEsena.time.delayedCall(1000, () => {
            ejecutarTirada();
        });
    }
}


/**
 * Calcula las coordenadas X, Y del centro de cualquier casilla (1 al 100)
 */
function getPosCasilla(numCasilla) {
    let num = parseInt(numCasilla) || 1;
    if (num < 1) num = 1;
    if (num > 100) num = 100;

    const TAMANO = 75;  // 750 / 10
    const BASE_Y = 950; // Borde inferior del tablero (575 + 375)
    const BASE_X = 0;   // Borde izquierdo

    let fila = Math.floor((num - 1) / 10);
    let col = (num - 1) % 10;

    if (fila % 2 !== 0) {
        col = 9 - col;
    }

    let posX = BASE_X + (col * TAMANO) + (TAMANO / 2);
    let posY = BASE_Y - (fila * TAMANO) - (TAMANO / 2);

    return { x: posX, y: posY };
}

// ==========================================
// 🎆 FUNCIONES DE CELEBRACIÓN Y EFECTOS
// ==========================================

/**
 * Crea una textura vectorial de estrella brillante
 */
function generarTexturaEstrella(scene) {
    if (scene.textures.exists('estrellaParticle')) return;

    let g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffd700, 1);

    let outerRadius = 12;
    let innerRadius = 5;
    let cx = 15, cy = 15;

    g.beginPath();
    for (let i = 0; i < 10; i++) {
        let r = (i % 2 === 0) ? outerRadius : innerRadius;
        let angle = (i * Math.PI) / 5 - Math.PI / 2;
        let px = cx + r * Math.cos(angle);
        let py = cy + r * Math.sin(angle);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.generateTexture('estrellaParticle', 30, 30);
}

/**
 * Hace saltar, agrandar y parpadear a la ficha ganadora
 */
function animarFichaGanadora(scene, ficha) {
    scene.children.bringToTop(ficha);

    scene.tweens.add({
        targets: ficha,
        y: ficha.y - 40,
        scaleX: 1.6,
        scaleY: 1.6,
        alpha: 0.3,
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

/**
 * Dispara ráfagas continuas de estrellas brillantes y animadas tipo confeti
 */
function lanzarParticulasEstrellas(scene, x, y) {
    // Generar 3 ráfagas seguidas para mayor impacto visual
    for (let rafaga = 0; rafaga < 7; rafaga++) {
        scene.time.delayedCall(rafaga * 300, () => {
            
            // Lanza 40 estrellas por ráfaga (120 en total)
            for (let i = 0; i < 40; i++) {
                let estrella = scene.add.image(x, y, 'estrellaParticle');

                // 1. MODO DE MEZCLA BRILLANTE (Efecto neón resplandeciente)
                estrella.setBlendMode(Phaser.BlendModes.ADD);

                // 2. TAMAÑOS MÁS GRANDES Y VARIADOS
                let escalaInicial = Phaser.Math.FloatBetween(0.6, 5);
                estrella.setScale(escalaInicial);

                // 3. TRAYECTORIA EN 360 GRADOS
                let angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
                let fuerza = Phaser.Math.Between(150, 450);
                
                let destX = x + Math.cos(angulo) * fuerza;
                // Le damos impulso hacia arriba inicialmente
                let destY = y + Math.sin(angulo) * fuerza - Phaser.Math.Between(50, 150);

                // 4. ANIMACIÓN DE EXPLOSIÓN Y CAÍDA CON GIRO
                scene.tweens.add({
                    targets: estrella,
                    x: destX,
                    y: destY + 200, // Caída tipo gravedad
                    scaleX: 0,
                    scaleY: 0,
                    angle: Phaser.Math.Between(-720, 720), // Giros más rápidos
                    alpha: { from: 1, to: 0 },
                    duration: Phaser.Math.Between(1500, 4000),
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        estrella.destroy();
                    }
                });
            }
            
        });
    }
}


/**
 * Crea el marco estilizado para el dado y las tarjetas flotantes de los jugadores
 * distribuidas a los lados.
 */
function crearInterfazDadoYJugadores() {
    let escena = estaEsena;
    let centroX = 375;
    let centroY = 1100;
    let tamMarco = 200;

    // ==========================================
    // 1. MARCO CONTORNO PARA EL DADO
    // ==========================================
    let marcoGfx = escena.add.graphics();
    
    // Fondo oscuro semitransparente
    marcoGfx.fillStyle(0x0c0c1e, 0.85);
    marcoGfx.fillRoundedRect(centroX - (tamMarco / 2), centroY - (tamMarco / 2), tamMarco, tamMarco, 24);

    // Contorno exterior neón
    marcoGfx.lineStyle(4, 0xffffff, 1);//0x00f2fe
    marcoGfx.strokeRoundedRect(centroX - (tamMarco / 2), centroY - (tamMarco / 2), tamMarco, tamMarco, 24);

    // Bisel/Línea interior decorativa
    marcoGfx.lineStyle(2, 0xffffff, 0.3);
    marcoGfx.strokeRoundedRect(centroX - (tamMarco / 2) + 6, centroY - (tamMarco / 2) + 6, tamMarco - 12, tamMarco - 12, 18);

    // Asegurar que el marco quede por detrás del sprite del dado
    escena.children.sendToBack(marcoGfx);

    // ==========================================
    // 2. TARJETAS DE JUGADORES
    // ==========================================
    let totalJugadores = jugadores.length;

    jugadores.forEach((jugador, idx) => {
        // Alternar lados: pares a la izquierda (X=135), impares a la derecha (X=615)
        let esIzquierda = (idx % 2 === 0);
        let posX = esIzquierda ? 135 : 615;

        // Distribución vertical si hay más de 2 jugadores
        let fila = Math.floor(idx / 2); 
        let posY = (totalJugadores > 2) ? (centroY) + (fila * 120) : centroY;

        let anchoCard = 220;
        let altoCard = (totalJugadores > 2) ? 100 : 130;

        let cardContainer = escena.add.container(posX, posY);
     
         // --- 👇 CREAR LÍNEA GRUESA DE RESPLANDOR (GLOW) ---
        let gGlow = escena.add.graphics();
        gGlow.lineStyle(10, jugador.color, 0.9);
        
        // Se resta la mitad del ancho y alto para que el marco quede alineado al centro del contenedor
        gGlow.strokeRoundedRect(-anchoCard / 2 - 5, -altoCard / 2 - 5, anchoCard + 10, altoCard + 10, 20);
        gGlow.setVisible(false);
        jugador.glowGfx = gGlow;
        
        let gCard = escena.add.graphics();

        // Fondo de la tarjeta
        gCard.fillStyle(0x101026, 0.9);
        gCard.fillRoundedRect(-anchoCard / 2, -altoCard / 2, anchoCard, altoCard, 16);

        // Contorno con el color representativo del jugador
        gCard.lineStyle(3, jugador.color, 1);
        gCard.strokeRoundedRect(-anchoCard / 2, -altoCard / 2, anchoCard, altoCard, 16);

        // Cabecera/Banda rellena con el color del jugador
        gCard.fillStyle(jugador.color, 0.25);
        gCard.fillRoundedRect(-anchoCard / 2 + 4, -altoCard / 2 + 4, anchoCard - 8, 36, 12);

        // Círculo del color de la ficha como indicador
        gCard.fillStyle(jugador.color, 1);
        gCard.fillCircle(-anchoCard / 2 + 25, -altoCard / 2 + 22, 10);
        gCard.lineStyle(2, 0xffffff, 0.9);
        gCard.strokeCircle(-anchoCard / 2 + 25, -altoCard / 2 + 22, 10);

      //
              // 1. Etiqueta superior (JUGADOR 1 / BOT IA) en la banda de color
        let rolTexto = jugador.esIA ? '🤖 BOT IA' : `JUGADOR ${jugador.id}`;
        let txtRol = escena.add.text(10, -altoCard / 2 + 22, rolTexto, {
            font: 'bold 15px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // 2. Nombre personalizado del jugador (RUBEN) en la parte de abajo
        let txtNombre = escena.add.text(0, (totalJugadores > 2) ? 12 : 20, jugador.nombre.toUpperCase(), {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        
        cardContainer.add([gGlow,gCard, txtRol, txtNombre]);

        // Guardar referencia en el objeto del jugador por si necesitas modificarla dinámicamente
        jugador.tarjetaUI = cardContainer;
    });

    // Colocar el dado por delante de todos los gráficos del marco
    if (dadoSprite) {
        escena.children.bringToTop(dadoSprite);
    }
    
        // Activar el resplandor para el jugador que empieza la partida
    actualizarResplandorTurno();
}



/**
 * Anima el contorno con resplandor neón del jugador que tiene el turno activo
 */
function actualizarResplandorTurno() {
    jugadores.forEach((j, idx) => {
        if (!j.glowGfx) return;

        // Detener animaciones previas
        estaEsena.tweens.killTweensOf(j.glowGfx);

        if (idx === turnoActual) {
            j.glowGfx.setVisible(true);
            j.glowGfx.setAlpha(0.2);

            // Animación de pulso de luz neón
            estaEsena.tweens.add({
                targets: j.glowGfx,
                alpha: 1,
                duration: 650,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else {
            j.glowGfx.setVisible(false);
        }
    });
}

/**
 * Crea el botón "Volver a jugar" al finalizar la partida para regresar al menú
 */
function crearBotonVolverAJugar(scene) {
    let posX = 375;
    let posY = 1380; // Posición en la zona inferior de la pantalla

    let btnContainer = scene.add.container(posX, posY);

    // Fondo del botón con estilo Neón
    let btnBg = scene.add.graphics();
    btnBg.fillStyle(0x00f2fe, 1);
    btnBg.fillRoundedRect(-170, -32, 340, 64, 20);
    btnBg.lineStyle(3, 0xffffff, 1);
    btnBg.strokeRoundedRect(-170, -32, 340, 64, 20);

    // Texto del botón
    let txtBtn = scene.add.text(0, 0, '🔄 VOLVER A JUGAR', {
        font: 'bold 28px Arial',
        fill: '#0a0a1a'
    }).setOrigin(0.5);

    btnContainer.add([btnBg, txtBtn]);
    btnContainer.setSize(100, 64);
    btnContainer.setInteractive({ useHandCursor: true });

    // Animación suave de pulso para llamar la atención
    scene.tweens.add({
        targets: btnContainer,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Acción al presionar: Cambiar a la escena del menú de configuración
    btnContainer.on('pointerdown', () => {
        auPlay.play();
        scene.scene.start('menu');
    });
}



