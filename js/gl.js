var gl;
function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}


function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}


var shaderProgram;

function initShaders() {
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
}


function handleLoadedTexture(texture) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

var metalTexture;

function initTextures() {
	metalTexture = gl.createTexture();
	metalTexture.image = new Image();
	metalTexture.image.onload = function () {
		handleLoadedTexture(metalTexture)
	}
	metalTexture.image.src = "textures/metal.jpg";
}


var mvMatrix = mat4.create();
var pMatrix = mat4.create();

function setMatrixUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function loadModelFromJSON() {
        var request = new XMLHttpRequest();
        request.open("GET", "models/model.json");
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                handleLoadedModel(JSON.parse(request.responseText));
            }
        }
        request.send();
    }
	
var modelVertexPositionBuffer;
var modelVertexNormalBuffer;
var modelVertexTextureCoordBuffer;
var modelVertexIndexBuffer;

function handleLoadedModel(modelData) {
	modelVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.vertexNormals), gl.STATIC_DRAW);
	modelVertexNormalBuffer.itemSize = 3;
	modelVertexNormalBuffer.numItems = modelData.vertexNormals.length / 3;

	modelVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.vertexTextureCoords), gl.STATIC_DRAW);
	modelVertexTextureCoordBuffer.itemSize = 2;
	modelVertexTextureCoordBuffer.numItems = modelData.vertexTextureCoords.length / 2;

	modelVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.vertexPositions), gl.STATIC_DRAW);
	modelVertexPositionBuffer.itemSize = 3;
	modelVertexPositionBuffer.numItems = modelData.vertexPositions.length / 3;

	modelVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelData.indices), gl.STATIC_DRAW);
	modelVertexIndexBuffer.itemSize = 1;
	modelVertexIndexBuffer.numItems = modelData.indices.length;
}
	
	var modelAngle = 180 ;
	
function drawScene() 
{
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

	if (modelVertexPositionBuffer == null 
		|| modelVertexNormalBuffer == null 
			|| modelVertexTextureCoordBuffer == null 
				|| modelVertexIndexBuffer == null) {
		return;
	}
	
	mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, -5]);
    mat4.rotate(mvMatrix, Math.PI * (modelAngle / 180.0), [-1, 1, 0.5]);

	//Activate and bind textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, metalTexture);
	gl.uniform1i(shaderProgram.samplerUniform, 0);
	gl.uniform1i(shaderProgram.useTexturesUniform, true);
	
	//Bind buffers and set attributes
	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, modelVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, modelVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, modelVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, modelVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

var lastTime = 0;

function animate() {
	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;

		modelAngle += 0.05 * elapsed;
	}
	lastTime = timeNow;
}


function tick() {
	requestAnimFrame(tick);
	drawScene();
	animate();
}

window.onload = function() {
	var canvas = document.getElementById("canvas_JSON");
	initGL(canvas);
	initShaders();
    initTextures();
	loadModelFromJSON() ;

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	tick();
}