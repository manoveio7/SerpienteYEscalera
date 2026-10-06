var Entrada = {
    key: 'Entrada',
    active: false,
    preload: E_carga,
    create: E_inicio,
    extends: Phaser.Scene
};

var camera;
var estaScena;
var textoIntro;
var toco = false;

function E_carga()
{
    this.load.image('logo','./img/jebiyu.png');
    this.load.image('cajaCarga','./img/cajaCarga.png');
    this.load.image('barraCarga','./img/barraCarga.png');
}

function E_inicio()
{
    camera = this.cameras.main;
    estaScena = this;
	
    textoIntro = this.add.text(camera.width/2,camera.height/1.2,'Toca la Pantalla!')
    .setFontFamily('Arial')
    .setFontSize(30)
    .setColor('White')
    .setOrigin(0.5).setAlpha(0);
    
    camera.fadeIn(500,0,0,0);

    camera.once('camerafadeincomplete',() =>{
        this.time.addEvent({
			delay: 500,
			callback: ()=> {
				estaScena.tweens.add({
                    targets: textoIntro,
                    duration: 500,
                    alpha: 1,
                    ease: 'Linear',//'back',
                    repeat: -1,
                    yoyo: true
                });

                this.input.on('pointerdown', () => {
                    if(toco)
                	    return;
                	
                	toco = true;
                    camera.fadeOut(1000,0,0,0);

                    camera.once('camerafadeoutcomplete',() =>{
                        this.scene.start('Carga');
                    });
                });
			}
		});
    });

    this.add.image(camera.width/2, camera.height/2,'logo').setDisplaySize(camera.width/1.5, camera.width/3);
}