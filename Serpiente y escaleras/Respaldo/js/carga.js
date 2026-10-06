var Carga = {
    key: 'Carga',
    active: false,
    preload: C_carga,
    create: C_inicio,
	extends: Phaser.Scene
};

function C_carga()
{
	let camera = this.cameras.main;
	
	let cajaCarga = this.add.image(camera.width/2,camera.height/2,'cajaCarga').setScale(2,1.4);
	let barraCarga = this.add.image(camera.width/2,camera.height/2,'barraCarga').setScale(2,1.4);
	let txt = this.add.text(cajaCarga.x,cajaCarga.y).setFontFamily('Arial').setFontSize(40).setColor('#000000').setOrigin(0.5,0);
	
	this.load.on('progress',(valor) => {
		let ancho = Math.round(barraCarga.width * valor);
		barraCarga.setCrop(0,0,ancho,cajaCarga.height);
		txt.setText(Math.round(valor * 100)+'%');
		
		if(valor === 1)
			txt.setText('Listo!');
	});


	this.load.image('fondo', './img/fondo1.jpg');

	// spritesheet animaciones
//	this.load.spritesheet('explota','./img/explosion.png',{ frameWidth: 64, frameHeight: 64 });
	
	
	//Cargar fonts...
//	this.load.font('titan','./fonts/titan.ttf','truetype');

	
	// Cargar los audios
	this.load.audio('auBala', './audios/laser.mp3');

}

function C_inicio()
{
	this.cameras.main.fadeOut(1000,0,0,0);
	
	this.cameras.main.once('camerafadeoutcomplete',() => {
		this.scene.start('main');
	});
}