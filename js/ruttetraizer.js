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
_mouseX = 1,
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
	scale:	 		0.2025,
	scanStep: 		10,
	lineThickness:	1.000,
	opacity: 		1.0,
	depth: 			50,
	autoRotate: 	false
},
//AUDIO VARS
_sound,
_adCtx,
_analyser,

//HTML5
_enterButton;



var buffer;
var baseShader, feedbackShader;
var baseTex, tex1, tex2, tempTex;
var baseMesh, feedbackMesh;

var w, h;

var canPlay = false;
var enterButton = document.getElementById( 'enterButtonId');

$(document).ready( function() {

	$(window).bind('resize', doLayout);

	// stop the user getting a text cursor
	// document.onselectstart = function() {
	// 	return false;
	// };

	_stage = document.getElementById("stage");

	//init mouse listeners
	$("#stage").mousemove( onMouseMove);
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
						var mapMouseX = (_mouseX/w);
						var mapMouseY = (_mouseY/h);

						var max = 300;
						var mapMouseX = (_mouseX/window.innerWidth) * max;
						var mapMouseY = map(_mouseY, 0, window.innerHeight, w * 0.35, w);

						// console.log(mapMouseX,mapMouseY);

						feedbackMesh.position.z = mapMouseX;
						_camera.position.z = mapMouseY;

				}
			}
		});

	$(window).mousewheel( onMouseWheel);
	$(window).mousedown( function() {
		_enableMouseMove = true;
		// _effectGlitch.goWild = true;
	});
	$(window).mouseup( function() {
		_enableMouseMove = false;
		// _effectGlitch.goWild = false;
	});

	if (!Detector.webgl) {
		$("#overlay").empty();
		Detector.addGetWebGLMessage({
			parent: document.getElementById("overlay")
		});

	} else {
		initWebGL();
		imageHandler();
	}
});

function initWebGL() {
	
	w = window.innerWidth;
	h = window.innerHeight;
	//init camera
	_camera = new THREE.PerspectiveCamera(75, 9/16, 1, 15000);
	// _camera.position.y = 1000;
	_camera.position.z = 3500;
	// _camera.rotate = 180 * Math.PI / 180
	_scene = new THREE.Scene();

	buffer = new THREE.Scene();
	tex1 = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  tex2 = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  tempTex = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });

	//init renderer
	_renderer = new THREE.WebGLRenderer({
		antialias: true,
		clearAlpha: 1,
		sortObjects: false,
		sortElements: false
	});

	document.body.appendChild(_renderer.domElement);


	var geometry = new THREE.PlaneBufferGeometry(w, h);

  baseTex = new THREE.ImageUtils.loadTexture();

  baseShader = new THREE.ShaderMaterial({
    uniforms: {
      tex: { type: 't', value: baseTex},
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent
  });

  baseMesh = new THREE.Mesh(geometry, baseShader);

  buffer.add(_camera)
  buffer.add(baseMesh);

  feedbackShader = new THREE.ShaderMaterial({
    uniforms: {
      tex: { type: 't', value: tex1 },
      step_w: { type: 'f', value: 1.0/w },
      step_h: { type: 'f', value: 1.0/h }
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('sharpenShader').textContent,
    side:THREE.DoubleSide,
    depthTest:true
  });
  feedbackShader.uniforms.tex.value = tex1;

  feedbackMesh = new THREE.Mesh(geometry, feedbackShader);
	// feedbackMesh.position.z = 6000;

  _scene.add(_camera)
  _scene.add(feedbackMesh);

	_lineHolder = new THREE.Object3D();
	_lineHolder.visible = false;
	_scene.add(_lineHolder);

 	var renderPass = new THREE.RenderPass(_scene, _camera);
  _effectGlitch = new THREE.GlitchPass(64);


  _effectGlitch.renderToScreen = true;
	// console.log(effectGlitch);
	renderPass.renderToScreen = false;
  _composer = new THREE.EffectComposer(_renderer);
	_composer.setSize(window.innerWidth,window.innerHeight);
  _composer.addPass(renderPass);
  _composer.addPass(_effectGlitch);

	doLayout();
	
	// startAudio();
	// animate();
}

function startAudio(){

	//Create an AudioListener and add it to the camera
	var listener = new THREE.AudioListener();
	_adCtx = listener.context;
	_camera.add( listener );

	// create a global audio source
	_sound = new THREE.Audio( listener );

	var audioLoader = new THREE.AudioLoader();

	var geometry = new THREE.CircleBufferGeometry( 700, 32 );
	var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
	var circle = new THREE.Mesh( geometry, material );
	geometry.setDrawRange( 0, 0 );
	_scene.add( circle );

	//Load a sound and set it as the Audio object's buffer
	audioLoader.load( 'sounds/ykm.mp3', function( buffer ) {
		_sound.setBuffer( buffer );
		_sound.setLoop(true);
		_sound.setVolume(0.95);
		_sound.canPlay = true;
		_sound.play();
		_scene.remove( circle );
		_lineHolder.visible = true;
		canPlay = true;
	},
	// Function called when download progresses
	function ( xhr ) {
		geometry.setDrawRange( 0, xhr.loaded/xhr.total * 100 );
			// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},
		// Function called when download errors
	function ( xhr ) {
		console.log( 'An error happened' );
		}
	);
		// _scene.remove( circle );
	_analyser = new THREE.AudioAnalyser( _sound, 32 );
}

function imageHandler() {
	// load image into canvas pixels
	_inputImage = new Image();
	_inputImage.src = ("img/Emersion.png");

	_inputImage.onload = function() {
		_imageWidth = _inputImage.width;
		_imageHeight = _inputImage.height;
		_canvas	= document.createElement('canvas');
		_canvas.width = _imageWidth
		_canvas.height = _imageHeight;
		_context = _canvas.getContext('2d');
		_context.drawImage(_inputImage, 0, 0);
		_pixels	= _context.getImageData(0,0,_imageWidth,_imageHeight).data;
		createLines();
	};
}

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

function onMouseMove(event) {
	if (_enableMouseMove) {
		_mouseX = event.pageX - _stageCenterX;
		_mouseY = event.pageY - _stageCenterY;
	}
	// var mapMouseX = (_mouseX/w);
	// var mapMouseY = (_mouseY/h);
	var max = 300;
	var mapMouseX = (_mouseX/window.innerWidth) * max;
	var mapMouseY = map(_mouseY, 0, window.innerHeight, w * 0.35, w);
	feedbackMesh.position.z = mapMouseX;
	_camera.position.z = mapMouseY;

	// console.log(mapMouseX);
	// console.log(mapMouseY);



}

function onMouseWheel(e,delta) {

	// console.log(e,delta);
	_guiOptions.scale += delta * 0.1;
	//limit
	_guiOptions.scale = Math.max(_guiOptions.scale, .1);
	_guiOptions.scale = Math.min(_guiOptions.scale, 10);
}

function buttonClicked(){
	
	
	if(canPlay != true){
		startAudio();
		animate();
		var btn = document.getElementById( 'enterButtonId');
		btn.value = "PRE-SAVE";
		btn.innerHTML = "PRE-SAVE";
		// console.log(btn);	
	}else{
		// window.location = "https://distrokid.com/hyperfollow/philtersoupxsat/philtersoup-x-sat-emersion-2";
		window.open(
			'https://distrokid.com/hyperfollow/philtersoupxsat/philtersoup-x-sat-emersion-2',
			'_blank' // <- This is what makes it open in a new window.
		  );
	}
	
	
}

function animate() {
	requestAnimationFrame(animate);
	render();
	// _stats.update();
}


window.addEventListener('touchstart', function() {

	// create empty buffer
	var buffer = _adCtx.createBuffer(1, 1, 22050);
	var source = _adCtx.createBufferSource();
	source.buffer = buffer;

	// connect to output (your speakers)
	source.connect(_adCtx.destination);
	source.start();


}, false);
function render() {

	//update the scale value to simulate displacement based on audio input

	var anal = _analyser.getFrequencyData();

	//console.log(anal);

  _lineHolder.scale.x = _guiOptions.scale ;
  _lineHolder.scale.y = _guiOptions.scale ;
  _lineHolder.scale.z = -(anal[3]-180)/50 || 1;

	_effectGlitch.goWild = anal[3] > 250 ;
	var xrot = _mouseX/_stageWidth * Math.PI*2  ;
	var yrot = _mouseY/_stageHeight* Math.PI*2 + Math.PI;
	// _camera.position.z = anal[1] * 2;


	_lineHolder.rotation.x += (yrot - _lineHolder.rotation.x) * 0.3;
	_lineHolder.rotation.y += (xrot - _lineHolder.rotation.y) * 0.3;
	// _guiOptions.scale += 0.0005;
		// _lineHolder.rotation.y = 90 / Math.PI;
		if(_material){
	_material.color = new THREE.Color( anal[3]/100 || 0.01, anal[7]/100 || 0.1 , anal[12]/100 || 0.1 );
	}

	// _renderer.render(_scene, _camera);

	baseShader.uniforms.tex.value = baseTex;
	feedbackShader.uniforms.tex.value = tex1;

	feedbackShader.uniforms.step_h.value = (anal[1]-180)/100;
	// console.log("HELLO");
	feedbackShader.uniforms.step_w.value = 0.5;

	_renderer.render(_scene, _camera, tex2, false);

	_renderer.render(_scene, _camera);
	_composer.render();
	//swap buffers
	tempTex = tex2;
	tex2 = tex1;
	tex1 = tempTex;

	// var max = 300;
	// var mapMouseX = (_mouseX/window.innerWidth) * max;
	// var mapMouseY = map(_mouseY, 0, window.innerHeight, w * 0.35, w);

	console.log(feedbackMesh.position.z,_camera.position.z);

	// feedbackMesh.position.z = mapMouseX;
	// _camera.position.z = mapMouseY;
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

function getColor(x, y) {
	// Returns a hexidecimal color for a given pixel in the pixel array.
	var base = (Math.floor(y) * _imageWidth + Math.floor(x)) * 4;
	var c = {
		r: _pixels[base + 0],
		g: _pixels[base + 1],
		b: _pixels[base + 2],
		a: _pixels[base + 3]
	};
	return (c.r << 16) + (c.g << 8) + c.b;
};

function getBrightness(c) {
	//return pixel brightness between 0 and 1 based on human perceptual bias
	return ( 0.5 * c.r + 0.5 * c.g + 0.16 * c.b );
};

function map(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
