/**
 Original Source: Felix Turner 2011
 Adapted for non-commercial use: Sanjay Das 2017

 **/


//VARS

var _stage,
_lineGroup,
_lineHolder,
_stats,
_camera,
_scene,
_renderer,
_composer,
_effectGlitch,
_mouseX = 100,
_mouseY = 1,
_material,
_gui,
_inputImage,
_stageCenterX,
_stageCenterY,
_canvas,
_context,
_imageWidth,
_imageHeight,
_stageWidth,
_stageHeight,
_enableMouseMove = false,

//VARS ACCESSIBLE BY GUI
_guiOptions  = {
	stageSize:	 	1.,
	scale:	 		0.85,
	scanStep: 		10,
	lineThickness:	1.000,
	opacity: 		1.0,
	depth: 			200,
	autoRotate: 	false
},
_analyser;

$(document).ready( function() {

	$(window).bind('resize', doLayout);

	//init image drag and drop
	loadSample();

	// stop the user getting a text cursor
	document.onselectstart = function() {
		return false;
	};

	_stage = document.getElementById("stage");


	//init mouse listeners
	$("#stage").mousemove( onMouseMove);
	// $("#stage").tapmove( onTapMove);

	$('#stage').bind('touchmove',function(e){
      e.preventDefault();
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
      var elm = $(this).offset();
      var x = touch.pageX - elm.left;
      var y = touch.pageY - elm.top;
      if(x < $(this).width() && x > 0){
          if(y < $(this).height() && y > 0){
                  //CODE GOES HERE
                  _mouseX = x;
									_mouseY = y;
          }
      }
});



	$(window).mousewheel( onMouseWheel);
	$(window).keydown(onKeyDown);
	$(window).mousedown( function() {

		_enableMouseMove = true;
		_effectGlitch.goWild = true;

	});
	$(window).mouseup( function() {
		_enableMouseMove = false;
		// createLines();
		_effectGlitch.goWild = false;
	});

	doLayout();

	if (!Detector.webgl) {
		$("#overlay").empty();
		Detector.addGetWebGLMessage({
			parent: document.getElementById("overlay")
		});

	} else {
		initWebGL();

	}

});
function initWebGL() {

	//init camera
	_camera = new THREE.PerspectiveCamera(75, 16/9, 1, 5000);
	// _camera.position.y = 1000;
	_camera.position.z = 2500;
	// _camera.rotate = 180 * Math.PI / 180
	_scene = new THREE.Scene();

	//init renderer
	_renderer = new THREE.WebGLRenderer({
		antialias: false,
		clearAlpha: 1,
		sortObjects: false,
		sortElements: false
	});

	_lineHolder = new THREE.Object3D();
	_scene.add(_lineHolder);

			 	var renderPass = new THREE.RenderPass(_scene, _camera);
        _effectGlitch = new THREE.GlitchPass(64);


        _effectGlitch.renderToScreen = true;
				// console.log(effectGlitch);
				// renderPass.renderToScreen = true;
			  _composer = new THREE.EffectComposer(_renderer);
				_composer.setSize(window.innerWidth,window.innerHeight);
        _composer.addPass(renderPass);
        _composer.addPass(_effectGlitch);

	startAudio();
	doLayout();
	animate();
}

function startAudio(){

//Create an AudioListener and add it to the camera
var listener = new THREE.AudioListener();
_camera.add( listener );

// create a global audio source
var sound = new THREE.Audio( listener );

var audioLoader = new THREE.AudioLoader();

//Load a sound and set it as the Audio object's buffer
audioLoader.load( 'sounds/placeholdermuzak.mp3', function( buffer ) {
	sound.setBuffer( buffer );
	sound.setLoop(true);
	sound.setVolume(0.95);
	sound.play();
});
	_analyser = new THREE.AudioAnalyser( sound, 32 );
}



function onImageLoaded() {

	// load image into canvas pixels
	_imageWidth = _inputImage.width;
	_imageHeight = _inputImage.height;
	_canvas	= document.createElement('canvas');
	_canvas.width = _imageWidth
	_canvas.height = _imageHeight;
	_context = _canvas.getContext('2d');
	_context.drawImage(_inputImage, 0, 0);
	_pixels	= _context.getImageData(0,0,_imageWidth,_imageHeight).data;

	createLines();
}

/**
 * Create Lines from image
 */
function createLines() {

	$("#overlay").hide();
	_stage.appendChild(_renderer.domElement);

	var x = 0, y = 0;

	if (_lineGroup)
		_scene.removeObject(_lineGroup);

	_lineGroup = new THREE.Object3D();

	_material = new THREE.LineBasicMaterial({
		color: 0xffffff,
		opacity: _guiOptions.opacity,
		linewidth: _guiOptions.lineThickness,
		blending: THREE.AdditiveBlending,
		depthTest: false,
		vertexColors: true,
		needsUpdate: true
	} );

	// go through the image pixels
	for(y = 0; y < _imageHeight; y+= _guiOptions.scanStep) {
		var geometry = new THREE.Geometry();
		for(x = 0; x < _imageWidth ; x+= _guiOptions.scanStep) {
			var color = new THREE.Color(getColor(x, y));
			var brightness = getBrightness(color);
			var posn = new THREE.Vector3(x -_imageWidth/2,y - _imageHeight/2, -brightness * _guiOptions.depth + _guiOptions.depth/2);
			geometry.vertices.push(posn);

			geometry.colors.push(color);
		}
		//add a line
		var line = new THREE.Line(geometry, _material );
		_lineGroup.add(line);
	}

	_lineHolder.add(_lineGroup);
	_lineHolder.rotation.x =   Math.PI;

}

function updateMaterial() {
	if (_material) {
		_material.opacity = _guiOptions.opacity;
		_material.linewidth = _guiOptions.lineThickness;
	}
}

function onMouseMove(event) {
	if (_enableMouseMove) {
		_mouseX = event.pageX - _stageCenterX;
		_mouseY = event.pageY - _stageCenterY;
	}
}



function onMouseWheel(e,delta) {

	// console.log(e,delta);
	_guiOptions.scale += delta * 0.1;
	//limit
	_guiOptions.scale = Math.max(_guiOptions.scale, .1);
	_guiOptions.scale = Math.min(_guiOptions.scale, 10);
}

function onKeyDown(evt) {
	//save on 'S' key
	if (event.keyCode == '83') {
		// saveImage();
	}
}

function animate() {
	requestAnimationFrame(animate);
	render();
	// _stats.update();
}

function render() {

	//update the scale value to simulate displacement based on audio input

	var anal = _analyser.getFrequencyData();

	//console.log(anal);

  _lineHolder.scale.x = _guiOptions.scale ;
  _lineHolder.scale.y = _guiOptions.scale ;
  _lineHolder.scale.z = -(anal[3]-180)/10 || 1;

	_effectGlitch.goWild = anal[3] > 210 ;
	var xrot = anal[2]/100*_mouseX/_stageWidth * Math.PI*2 ;
	var yrot = _mouseY/_stageHeight* Math.PI*2 + Math.PI;
	// _camera.position.z = anal[1] * 2;


	_lineHolder.rotation.x += (yrot - _lineHolder.rotation.x) * 0.3;
	_lineHolder.rotation.y += (xrot - _lineHolder.rotation.y) * 0.3;
	_guiOptions.scale += 0.0005;
		// _lineHolder.rotation.y = 90 / Math.PI;
		if(_material){
	_material.color = new THREE.Color( anal[3]/100 || 0.01, anal[7]/100 || 0.1 , anal[12]/100 || 0.1 );
	}
	_composer.render();
	// _renderer.render(_scene, _camera);

}

function doLayout() {

	var winHeight, winWidth, controlsWidth, containerWidth;

	//get dims
	winHeight = window.innerHeight ? window.innerHeight : $(window).height();
	winWidth = window.innerWidth ? window.innerWidth : $(window).width();
	controlsWidth = $('#controls').outerWidth();

	//set container size
	$('#container').height(parseInt(winHeight));
	$('#container').width(parseInt(winWidth) - parseInt(controlsWidth));
	containerWidth = $('#container').outerWidth();

	//set stage size as fraction of window size
	//use letterbox dimensions unless 100%
	_stageWidth = containerWidth * _guiOptions.stageSize;
	_stageHeight = containerWidth * _guiOptions.stageSize * 9 / 16;

	if (_guiOptions.stageSize === 1) {
		_stageHeight = $('#container').outerHeight();
	}
	$('#stage').width(_stageWidth);
	$('#stage').height(_stageHeight);

	//Center stage div inside window
	$('#stage').css({
		left: Math.max((containerWidth - _stageWidth)/2 + controlsWidth,controlsWidth),
		top: (winHeight -_stageHeight)/2,
		visibility:"visible"
	});

	//set webgl size
	if (_renderer) {
		_renderer.setSize(_stageWidth, _stageHeight);
		_camera.aspect = _stageWidth / _stageHeight;
		_camera.updateProjectionMatrix();
	}

	_stageCenterX = $('#stage').offset().left +_stageWidth / 2;
	_stageCenterY = window.innerHeight / 2;
}

// Returns a hexidecimal color for a given pixel in the pixel array.
function getColor(x, y) {
	var base = (Math.floor(y) * _imageWidth + Math.floor(x)) * 4;
	var c = {
		r: _pixels[base + 0],
		g: _pixels[base + 1],
		b: _pixels[base + 2],
		a: _pixels[base + 3]
	};
	return (c.r << 16) + (c.g << 8) + c.b;
};

//return pixel brightness between 0 and 1 based on human perceptual bias
function getBrightness(c) {
	return ( 0.5 * c.r + 0.5 * c.g + 0.16 * c.b );
};

function loadSample() {
	_inputImage = new Image();
	_inputImage.src = ("img/philterSoup.jpg");

	_inputImage.onload = function() {
		onImageLoaded();
	};
}
