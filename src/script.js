import * as THREE from "three";
import { Timer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

/**
 * Base
 */
const gui = new GUI({ width: 325 });
const debugObject = {};

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

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
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Groupe / sol / turntable
 *
 * Repère utilisé : la scène visible est toujours celle située sur l'axe +X du monde.
 * C'est le plateau qui tourne (turntable.rotation.y), jamais la caméra.
 */
const groundHeight = 0.25;
const groundRadius = 5;

const groundGeometry = new THREE.CylinderGeometry(
	groundRadius,
	groundRadius,
	groundHeight,
);
groundGeometry.translate(0, groundHeight / 2, 0);

const groundMaterial = new THREE.MeshBasicMaterial({
	color: "#222233",
	// wireframe: true,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);

const turntable = new THREE.Group();
turntable.add(ground);

const objectPositionFromCenter = groundRadius * 0.8;
const numberOfDisplays = 6; // = nombre total d'objets (formes + modèles) sur le plateau
const stepAngle = (Math.PI * 2) / numberOfDisplays;

const objectGroups = [];
for (let i = 0; i < numberOfDisplays; i++) {
	const angleRad = stepAngle * i;
	const group = new THREE.Group();
	group.position.set(
		Math.cos(angleRad) * objectPositionFromCenter,
		groundHeight,
		Math.sin(angleRad) * objectPositionFromCenter,
	);
	group.rotation.y = -angleRad; // l'axe local +X pointe vers l'extérieur du plateau
	turntable.add(group);
	objectGroups.push(group);
}

scene.add(turntable);

/**
 * Emplacements
 * La place est réservée de façon synchrone, dans l'ordre des appels,
 * même si les modèles finissent de charger dans un autre ordre.
 */
let nextDisplayIndex = 0;
const displayNames = [];

function reserveDisplaySlot(name = "") {
	if (nextDisplayIndex >= objectGroups.length) {
		console.warn("Plus de place sur le plateau pour :", name);
		return null;
	}
	displayNames[nextDisplayIndex] = name;
	return objectGroups[nextDisplayIndex++];
}

// Modèles ayant une rotation continue sur eux-mêmes : { object, x, y, z } en radians/seconde
const spinningModels = [];

function addToTurntable(object, slot) {
	slot.add(object);
}

function loadModelToTurntable(
	url,
	{
		name = "",
		scale = 0.4,
		positionY = 1,
		rotateX = 0,
		rotateY = -Math.PI / 2,
		rotateZ = 0,
		spin = null,
	} = {},
) {
	const slot = reserveDisplaySlot(name);
	if (!slot) return;

	gltfLoader.load(url, (gltf) => {
		const model = gltf.scene;
		model.scale.setScalar(scale);
		model.rotateX(rotateX);
		model.rotateY(rotateY);
		model.rotateZ(rotateZ);
		model.position.setY(positionY);
		addToTurntable(model, slot);

		if (spin) {
			spinningModels.push({ object: model, ...spin });
		}
	});
}

/**
 * Carousel de formes
 */
const numberOfShapes = 6;
const carouselColors = [
	0xff5555, 0x55ff66, 0x55aaff, 0xffcc55, 0xdd55ff, 0xff7711,
];
const carouselShapes = [];
const carouselRadius = 1;
const carouselGroup = new THREE.Group();
const carouselSlot = reserveDisplaySlot("Formes");

for (let i = 0; i < numberOfShapes; i++) {
	let geometry;
	if (i == 0) geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
	else if (i == 1) geometry = new THREE.SphereGeometry(0.25);
	else if (i == 2) geometry = new THREE.IcosahedronGeometry(0.3);
	else if (i == 3) geometry = new THREE.TorusGeometry(0.2, 0.085);
	else if (i == 4) geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4);
	else geometry = new THREE.ConeGeometry(0.3, 0.4);

	const material = new THREE.MeshLambertMaterial({
		color: carouselColors[i % carouselColors.length],
		flatShading: true,
	});
	const mesh = new THREE.Mesh(geometry, material);
	const angle = (i / numberOfShapes) * Math.PI * 2;
	mesh.position.set(
		Math.cos(angle) * carouselRadius,
		1,
		Math.sin(angle) * carouselRadius,
	);
	carouselShapes.push(mesh);
	carouselGroup.add(mesh);
}
addToTurntable(carouselGroup, carouselSlot);
spinningModels.push({ object: carouselGroup, y: 0.35 }); // vitesse en rad/s

/**
 * 3D Models
 */
loadModelToTurntable("./mario/star.glb", { name: "Étoile", spin: { y: 0.8 } });
loadModelToTurntable("./zelda/triforce.glb", {
	name: "Triforce",
	spin: { y: 1.2 },
});
loadModelToTurntable("./sonic/ring.glb", { name: "Ring", spin: { y: 1.4 } });
loadModelToTurntable("./sonic/shoes.glb", {
	name: "Chaussures",
	spin: { y: 1.6 },
});
loadModelToTurntable("./kingdom-hearts/keyblade.glb", {
	name: "Keyblade",
	rotateY: 0,
	rotateZ: Math.PI / 2,
	spin: { y: 1 },
});

if (nextDisplayIndex !== numberOfDisplays) {
	console.warn(
		`numberOfDisplays vaut ${numberOfDisplays} mais ${nextDisplayIndex} objets sont placés : ajuste la valeur.`,
	);
}

/**
 * Camera
 * Placée près du centre du plateau, regardant vers l'objet actif (axe +X).
 * Seul un léger parallax suit la souris : la caméra n'est jamais libre.
 */
const cameraRig = {
	offset: 1, // recul par rapport au centre du plateau (0 = pile au centre)
	height: 2.6,
	targetHeight: 2, // hauteur du point visé (là où flottent les objets)
};

const camera = new THREE.PerspectiveCamera(
	35,
	sizes.width / sizes.height,
	0.1,
	100,
);
camera.position.set(-cameraRig.offset, cameraRig.height, 0);
camera.lookAt(objectPositionFromCenter, cameraRig.targetHeight, 0);
scene.add(camera);

// Contrôles libres : uniquement pour le debug, désactivés par défaut
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enabled = false;

const helper = new THREE.AxesHelper(1);
helper.position.setY(0.5);
helper.visible = false;
scene.add(helper);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

debugObject.clearColor = "#282c3e";
debugObject.freeCamera = false;
renderer.setClearColor(debugObject.clearColor);

gui.addColor(debugObject, "clearColor").onChange(() => {
	renderer.setClearColor(debugObject.clearColor);
});

const cameraFolder = gui.addFolder("Caméra");
cameraFolder.add(cameraRig, "offset", 0, 3, 0.05).name("recul");
cameraFolder.add(cameraRig, "height", 0.5, 5, 0.05).name("hauteur");
cameraFolder.add(cameraRig, "targetHeight", 0, 4, 0.05).name("hauteur visée");
cameraFolder
	.add(camera, "fov", 20, 80, 1)
	.onChange(() => camera.updateProjectionMatrix());
cameraFolder
	.add(debugObject, "freeCamera")
	.name("caméra libre (debug)")
	.onChange((free) => {
		controls.enabled = free;
		helper.visible = free;
		if (free) {
			controls.target.set(objectPositionFromCenter, cameraRig.targetHeight, 0);
		}
	});

/**
 * Sélecteur de scène
 *
 * Pour afficher l'objet d'indice i face à la caméra, le plateau doit avoir
 * rotation.y = i * stepAngle. targetRotation n'est volontairement pas ramené
 * entre 0 et 2π : le passage de la dernière scène à la première reste ainsi
 * un simple quart de tour dans le même sens, sans repartir à l'envers.
 */
let currentIndex = 0;
let targetRotation = 0;

function goToIndex(index) {
	const count = numberOfDisplays;

	// Chemin le plus court entre l'indice actuel et l'indice demandé
	let delta = (index - currentIndex) % count;
	if (delta > count / 2) delta -= count;
	if (delta < -count / 2) delta += count;

	currentIndex = ((index % count) + count) % count;
	targetRotation += delta * stepAngle;
	updateSelector();
}

const goNext = () => goToIndex(currentIndex + 1);
const goPrevious = () => goToIndex(currentIndex - 1);

const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const selectorTitle = document.querySelector("#title");
const selectorDots = document.querySelector("#dots");

previousButton.addEventListener("click", goPrevious);
nextButton.addEventListener("click", goNext);

// Un point par scène, généré à partir de numberOfDisplays
const dots = [];
for (let i = 0; i < numberOfDisplays; i++) {
	const dot = document.createElement("button");
	dot.type = "button";
	dot.className = "selector__dot";
	dot.setAttribute("aria-label", `Aller à la scène ${i + 1}`);
	dot.addEventListener("click", () => goToIndex(i));
	dots.push(dot);
	selectorDots.appendChild(dot);
}

function updateSelector() {
	selectorTitle.textContent = displayNames[currentIndex] ?? "";
	dots.forEach((dot, i) =>
		dot.classList.toggle("is-active", i === currentIndex),
	);
}
updateSelector();

// Clavier : flèches gauche / droite
window.addEventListener("keydown", (event) => {
	if (event.repeat || event.target instanceof HTMLInputElement) return;
	if (event.key === "ArrowRight") goNext();
	else if (event.key === "ArrowLeft") goPrevious();
});

// Tactile : swipe horizontal sur le canvas
let swipeStartX = null;
canvas.addEventListener("pointerdown", (event) => {
	if (event.pointerType === "touch") swipeStartX = event.clientX;
});
canvas.addEventListener("pointerup", (event) => {
	if (swipeStartX === null) return;
	const deltaX = event.clientX - swipeStartX;
	swipeStartX = null;
	if (debugObject.freeCamera || Math.abs(deltaX) < 50) return;
	if (deltaX < 0) goNext();
	else goPrevious();
});

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
	const deltaTime = Math.min(timer.getDelta(), 0.1); // évite les sauts après un onglet en pause

	// Rotation douce du plateau vers la scène choisie
	turntable.rotation.y = THREE.MathUtils.damp(
		turntable.rotation.y,
		targetRotation,
		4,
		deltaTime,
	);

	carouselShapes.forEach((mesh, i) => {
		mesh.rotation.x = elapsedTime * 0.3 + i;
		mesh.rotation.y = elapsedTime * 0.4 + i;
		mesh.position.y = 1 + Math.sin(elapsedTime + i) * 0.2;
	});

	objectGroups.forEach((group, i) => {
		group.position.y = 1 + Math.sin(elapsedTime + i) * 0.2;
	});

	// Rotation continue des modèles (étoile, ring, keyblade...)
	spinningModels.forEach(({ object, x = 0, y = 0, z = 0 }) => {
		object.rotation.x += x * deltaTime;
		object.rotation.y += y * deltaTime;
		object.rotation.z += z * deltaTime;
	});

	// Caméra fixe, ou OrbitControls en mode debug
	if (debugObject.freeCamera) {
		controls.update();
	} else {
		camera.position.set(-cameraRig.offset, cameraRig.height, 0);
		camera.lookAt(objectPositionFromCenter, cameraRig.targetHeight, 0);
	}

	renderer.render(scene, camera);
	window.requestAnimationFrame(tick);
};

tick();
