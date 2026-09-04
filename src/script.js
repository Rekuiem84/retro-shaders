import * as THREE from "three";
import { Timer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

import basicVertexShader from "./shaders/basic/vertex.glsl";
import basicFragmentShader from "./shaders/basic/fragment.glsl";

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 325 });
const debugObject = {};

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./draco/");
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
	35,
	sizes.width / sizes.height,
	0.1,
	100,
);
camera.position.set(4, 3, 4);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

debugObject.clearColor = "#282c3e";
renderer.setClearColor(debugObject.clearColor);

gui.addColor(debugObject, "clearColor").onChange(() => {
	renderer.setClearColor(debugObject.clearColor);
});

/**
 * Sphere
 */
const cubeGeometry = new THREE.BoxGeometry();
const cubeMaterial = new THREE.ShaderMaterial({
	vertexShader: basicVertexShader,
	fragmentShader: basicFragmentShader,
	uniforms: {
		uPositionY: new THREE.Uniform(0),
	},
});

const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
// cube.castShadow = true;
scene.add(cube);
gui
	.add(cubeMaterial.uniforms.uPositionY, "value")
	.min(-5)
	.max(5)
	.step(0.1)
	.name("positionY");

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight("#ffffff", 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(0.25, 2, -2.25);
scene.add(directionalLight);

/**
 * Animate
 */
const timer = new Timer();

const tick = () => {
	timer.update();
	const elapsedTime = timer.getElapsed();

	controls.update();

	renderer.render(scene, camera);

	window.requestAnimationFrame(tick);
};

tick();
