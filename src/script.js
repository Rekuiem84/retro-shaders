import * as THREE from "three";
import { Timer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Terminal } from "./terminal.js";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

import retroVertexShader from "./shaders/retro/vertex.glsl";
import retroFragmentShader from "./shaders/retro/fragment.glsl";
import retroSnapShader from "./shaders/retro/snap.glsl";

/**
 * Base
 */
const gui = new Terminal(); // GUI custom dans terminal.js
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

	resizeRetro();
});

/**
 * Rétro PS2
 */
const retro = {
	enabled: true,
	pixelScale: 6,
	colorLevels: 8,
	ditherStrength: 0.6,
	vertexSnap: 128,
};

/**
 * Grille de snapping avec x cases de largeur et y cases de hauteur, chaque sommet est arrondi à la case la plus proche
 * ce qui fait "trembler" le modèle. Pas de précision sub-pixel. Valeur basse = effet + visible
 */
const snapUniforms = {
	uSnapGrid: { value: new THREE.Vector2() },
};

function updateSnapGrid() {
	const cells = retro.enabled ? retro.vertexSnap : 0;

	snapUniforms.uSnapGrid.value.set(cells, cells / (sizes.width / sizes.height));
}

updateSnapGrid();

/**
 * Applique le vertex snapping à un matériau
 */
function applyVertexSnap(material) {
	// Évite de réappliquer le vertex plusieurs fois à un même mesh
	if (material.userData.vertexSnap) return;

	material.userData.vertexSnap = true;

	// On applique le vertex snapping avant la compilation du shader
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uSnapGrid = snapUniforms.uSnapGrid;

		shader.vertexShader = shader.vertexShader
			.replace(
				"#include <common>",
				"#include <common>\nuniform vec2 uSnapGrid;", // On vient patch l'uniforme jsute après les déclarations communes de ThreeJS et GLSL
			)
			.replace("#include <project_vertex>", retroSnapShader);
		/**
		 * Remplace le calcul de position des vertices par celui dans snap.glsl
		 * Ce ficiher recalcule la position, puis l'applique comme si c'était le calcul d'origine
		 */
	};
	// Force la recompilation pour être sûr que le patch soit appliqué
	material.needsUpdate = true;
}

// Applique le vertex snapping à tous les matériaux d'un objet 3D.
// À appeler avant le premier rendu de l'objet pour que le shader soit compilé avec le snapping
function applyRetroToObject(object) {
	object.traverse((child) => {
		if (!child.isMesh) return; // Applique uniquement aux meshes (pas groupes, lumières, caméras, etc.)

		// Permet d'obtenir un tableau de matériaux peu importe la forme du mesh
		const materials = Array.isArray(child.material)
			? child.material
			: [child.material]; // Tableau avec 1 seul élément

		materials.forEach(applyVertexSnap);
	});
}

/**
 * Correction des plumes d'Aku Aku (transparence)
 */
function fixAkuAkuFeathers(model) {
	model.traverse((child) => {
		if (!child.isMesh) return;

		const materials = Array.isArray(child.material)
			? child.material
			: [child.material];

		for (const material of materials) {
			// Ne modifier que les matériaux texturés transparents.
			if (!material.map || !material.transparent) continue;

			material.alphaTest = 0.5;
			material.transparent = false;

			material.depthWrite = true;
			material.depthTest = true;

			material.side = THREE.DoubleSide;

			// Filtrage adapté aux textures rétro.
			material.map.magFilter = THREE.NearestFilter;
			material.map.minFilter = THREE.NearestMipmapNearestFilter;
			material.map.needsUpdate = true;

			material.needsUpdate = true;
		}
	});
}

/**
 * Groupe / sol / turntable
 */
const groundHeight = 0.25;
const groundRadius = 10;

const groundGeometry = new THREE.CylinderGeometry(
	groundRadius,
	groundRadius,
	groundHeight,
);

groundGeometry.translate(0, groundHeight / 2, 0);

const groundMaterial = new THREE.MeshBasicMaterial({
	color: "#222233",
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
applyRetroToObject(ground);

const turntable = new THREE.Group(); // Groupe parent, le faire bouger fait tout bouger
turntable.add(ground);

const objectPositionFromCenter = groundRadius * 0.8;
const numberOfDisplays = 13; // Nombre d'd'emplacements sur le plateau
const stepAngle = (Math.PI * 2) / numberOfDisplays; // Angle entre 2 emplacements voisins

const objectGroups = []; // Groupes vides qui serviront d'emplacements pour les objets

for (let i = 0; i < numberOfDisplays; i++) {
	const angleRad = stepAngle * i;
	const group = new THREE.Group();

	group.position.set(
		Math.cos(angleRad) * objectPositionFromCenter,
		groundHeight,
		Math.sin(angleRad) * objectPositionFromCenter,
	);

	// Orient l'emplacement pour que son "avant" regarde vers le centre de la table (en gros la caméra)
	group.rotation.y = -angleRad;

	turntable.add(group); // Chaque emplacement est ajouté au plateau en suivant sa rotation
	objectGroups.push(group); // On garde la référence des groupes pour y placer les modèles plus tard
}

scene.add(turntable);

/**
 * Emplacements
 * Le plateau a un nombre fixe d'emplacements (objectGroups). Chaque objet affiché en réserve un, dans l'ordre des appels
 */
let nextDisplayIndex = 0;
const displayNames = [];

// Réserve le prochain emplacement vide et lui donne un nom
function reserveDisplaySlot(name = "") {
	if (nextDisplayIndex >= objectGroups.length) {
		// Plateau plein
		console.warn("Plus de place sur le plateau pour :", name);
		return null;
	}

	displayNames[nextDisplayIndex] = name;

	return objectGroups[nextDisplayIndex++];
}

// Stocke les objets 3D qu'on souhaite faire touner (en l'occurence, tous)
// Chaque élément contient une référence vers l'objet et son/ses axes de rotation
const spinningModels = [];

// Ajoute un objet dans l'emplacement qui lui a été réservé sur le plateau
function addToTurntable(object, slot) {
	slot.add(object);
}

/**
 * Échelle des modèles
 */
const modelScaleFolder = gui.addFolder("Échelle des modèles");
const modelScales = [];

// Debug qui permet de copier toutes les valeurs des scale des modèles
function copyModelScales() {
	const text = modelScales
		.map(({ name, state }) => `${name} : scale: ${state.scale}`)
		.join("\n");

	console.log(text);
	navigator.clipboard?.writeText(text);
}

// Charge un modèle 3D et l'installe dans un des emplacements du plateau avec ses paramètres
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

	const state = { scale };
	let model = null; // Prépare la variable du modèle pour y accéder dans et hors le callback du gltfLoader.load

	// Interface pour la taille du modèle
	modelScaleFolder
		.add(state, "scale", 0.01, 3, 0.01)
		.name(name || url)
		.onChange((value) => model?.scale.setScalar(value));

	modelScales.push({ name: name || url, state });

	gltfLoader.load(url, (gltf) => {
		model = gltf.scene;

		model.scale.setScalar(state.scale);
		model.rotateX(rotateX);
		model.rotateY(rotateY);
		model.rotateZ(rotateZ);
		model.position.setY(positionY);

		// Correction appliquée uniquement à Aku Aku (à plumes transparentes).
		if (name === "Aku Aku") {
			fixAkuAkuFeathers(model);
		}

		applyRetroToObject(model);
		addToTurntable(model, slot); // Ajoute le modèle dans l'emplacement qui lui a été réservé

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

	if (i == 0) {
		geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
	} else if (i == 1) {
		geometry = new THREE.SphereGeometry(0.25);
	} else if (i == 2) {
		geometry = new THREE.IcosahedronGeometry(0.3);
	} else if (i == 3) {
		geometry = new THREE.TorusGeometry(0.2, 0.085);
	} else if (i == 4) {
		geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4);
	} else {
		geometry = new THREE.ConeGeometry(0.3, 0.4);
	}

	const material = new THREE.MeshLambertMaterial({
		// Matériau simple qui réagit à la lumière (plus performant que MeshStandardMaterial (absence de PBR))
		color: carouselColors[i % carouselColors.length],
		flatShading: true,
	});

	const mesh = new THREE.Mesh(geometry, material);

	const angle = (i / numberOfShapes) * Math.PI * 2;

	mesh.position.set(
		Math.cos(angle) * carouselRadius,
		1.1,
		Math.sin(angle) * carouselRadius,
	);

	carouselShapes.push(mesh);
	carouselGroup.add(mesh);
}

applyRetroToObject(carouselGroup);
addToTurntable(carouselGroup, carouselSlot);

spinningModels.push({
	object: carouselGroup,
	y: 0.35,
});

/**
 * 3D Models
 */
loadModelToTurntable("./models/mario/star.glb", {
	name: "Étoile",
	scale: 0.45,
	positionY: 1.1,
	spin: { y: Math.PI },
});

loadModelToTurntable("./models/zelda/triforce.glb", {
	name: "Triforce",
	scale: 0.5,
	positionY: 1.1,
	spin: { y: 1.25 },
});

loadModelToTurntable("./models/sonic/ring.glb", {
	name: "Ring",
	scale: 0.9,
	positionY: 1,
	spin: { y: 1.4 },
});

loadModelToTurntable("./models/final-fantasy-vii/buster-sword.glb", {
	name: "Buster Sword",
	spin: { y: 1.6 },
	positionY: 0.7,
	scale: 1.1,
});

loadModelToTurntable("./models/zelda/ocarina.glb", {
	name: "Ocarina du Temps",
	scale: 0.15,
	positionY: 1,
	spin: { y: 1.4 },
});

loadModelToTurntable("./models/mario/fludd.glb", {
	name: "J.E.T.",
	scale: 0.85,
	positionY: 0.45,
	spin: { y: 1.2 },
});

loadModelToTurntable("./models/sonic/shoes.glb", {
	name: "Air Shoes",
	scale: 1,
	spin: { y: 1.6 },
});

loadModelToTurntable("./models/zelda/master-sword.glb", {
	name: "Master Sword",
	scale: 0.45,
	// positionY: 0.7,
	spin: { y: 1.4 },
});

loadModelToTurntable("./models/kingdom-hearts/keyblade.glb", {
	name: "Keyblade",
	scale: 0.6,
	positionY: 0.9,
	rotateY: 0,
	rotateZ: Math.PI / 2,
	spin: { y: 1 },
});

loadModelToTurntable("./models/banjo-kazooie/jiggy.glb", {
	name: "Jiggy",
	positionY: 0.65,
	spin: { y: 1.6 },
});

loadModelToTurntable("./models/crash-bandicoot/akuaku.glb", {
	name: "Aku Aku",
	scale: 0.35,
	positionY: 0.8,
	spin: { y: 1.4 },
});

loadModelToTurntable("./models/mario/poltergust-3000.glb", {
	name: "Ectoblast 3000",
	scale: 0.35,
	positionY: 0.65,
	spin: { y: 1 },
});

modelScaleFolder
	.add({ copy: copyModelScales }, "copy")
	.name("Copier les valeurs");

if (nextDisplayIndex !== numberOfDisplays) {
	console.warn(
		`numberOfDisplays vaut ${numberOfDisplays} mais ${nextDisplayIndex} objets sont déjà placés`,
	);
}

/**
 * Camera
 */
const cameraRig = {
	offset: -3.6, // décalage par rapport au centre de la scène
	height: 2.6,
	targetHeight: 2, // hauteur du point regardé
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

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enabled = false; // la caméra est fixée de base

const helper = new THREE.AxesHelper(1);
helper.position.setY(0.5);
helper.visible = false;
scene.add(helper);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas,
	antialias: false,
});

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

debugObject.clearColor = "#252a41";
debugObject.freezeTime = false;
debugObject.freeCamera = false;

renderer.setClearColor(debugObject.clearColor);

gui.addColor(debugObject, "clearColor").onChange(() => {
	renderer.setClearColor(debugObject.clearColor);
});

gui.add(debugObject, "freezeTime").name("Arrêter le temps");

const cameraFolder = gui.addFolder("Caméra");

cameraFolder.add(cameraRig, "offset", -5, 5, 0.05).name("recul");

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
 * Rétro PS2 : post-traitement
 * Permet de dessiner la scène dans une texture intermédiaire, plutôt que directement à l'écran
 * La texture sera récupérée pour modifier l'image avant le rendu final
 * (réduire la résolution pour avoir des gros pixels, dithering, réduction des couleurs, CRT, etc.)
 */
const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
	// 1, 1 est la taille de base et sera modifiée par la fonction resizeRetro()
	minFilter: THREE.NearestFilter,
	magFilter: THREE.NearestFilter, // rendu pixélisé avec des pixels bien nets, sans mélange de couleurs
	type: THREE.HalfFloatType,
});

const postScene = new THREE.Scene();

const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const postMaterial = new THREE.ShaderMaterial({
	uniforms: {
		uRetroEnabled: { value: retro.enabled ? 1.0 : 0.0 }, // bool pour toogle les effets rétro de base
		tDiffuse: { value: renderTarget.texture }, // texture obtenue par le renderTarget (image intermédiaire de la scène que le shader va traiter)
		uResolution: { value: new THREE.Vector2(1, 1) }, // taille de l'image pour calculer la taille des pixels
		uCrtResolution: { value: new THREE.Vector2(1, 1) }, // résolution des effets d'écran
		uColorLevels: { value: retro.colorLevels },
		uDitherStrength: { value: retro.ditherStrength },
		uTime: { value: 0 },
		uScanlines: { value: 0 },
		uHalo: { value: 0 },
		uMask: { value: 0 },
		uMaskType: { value: 0 },
		uMaskPitch: { value: 6 },
		uScreenSize: { value: new THREE.Vector2(1, 1) },
		uCurvature: { value: 0 },
		uAberration: { value: 0 },
		uNoise: { value: 0 },
		uFlicker: { value: 0 },
	},
	vertexShader: retroVertexShader,
	fragmentShader: retroFragmentShader,
	depthTest: false,
	depthWrite: false,
});

/**
 * Quad de post-traitement
 * Il s'agit d'une surface 2D sur laquel Three pas afficher le rendu de la texture du renderTarget APRÈS son passage dans le postMaterial
 */
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);

postQuad.frustumCulled = false;
postScene.add(postQuad);

const crtSettings = {
	lineSize: 4, // taille d'une « ligne » CRT en px, utilisée quand le rétro est désactivé
};

function resizeRetro() {
	const scale = retro.enabled ? retro.pixelScale : 1;

	const width = Math.max(1, Math.floor(sizes.width / scale));
	const height = Math.max(1, Math.floor(sizes.height / scale));

	renderTarget.setSize(width, height);

	postMaterial.uniforms.uResolution.value.set(width, height);
	postMaterial.uniforms.uScreenSize.value.set(sizes.width, sizes.height);

	// Résolution virtuelle des effets CRT :
	// rétro activé : les gros pixels
	// rétro désactivé : écran divisé par lineSize
	if (retro.enabled) {
		postMaterial.uniforms.uCrtResolution.value.set(width, height);
	} else {
		postMaterial.uniforms.uCrtResolution.value.set(
			Math.max(1, Math.floor(sizes.width / crtSettings.lineSize)),
			Math.max(1, Math.floor(sizes.height / crtSettings.lineSize)),
		);
	}

	updateSnapGrid();
}

resizeRetro();

const retroFolder = gui.addFolder("Rétro PS2");

retroFolder
	.add(retro, "enabled")
	.name("activé")
	.onChange((value) => {
		postMaterial.uniforms.uRetroEnabled.value = value ? 1.0 : 0.0;
		updateSnapGrid();
		resizeRetro();
	});

retroFolder
	.add(retro, "pixelScale", 1, 12, 1)
	.name("taille des pixels")
	.onChange(() => resizeRetro());

retroFolder
	.add(retro, "colorLevels", 2, 32, 1)
	.name("niveaux de couleur")
	.onChange((value) => {
		postMaterial.uniforms.uColorLevels.value = value;
	});

retroFolder
	.add(retro, "ditherStrength", 0, 1, 0.01)
	.name("dithering")
	.onChange((value) => {
		postMaterial.uniforms.uDitherStrength.value = value;
	});

retroFolder
	.add(retro, "vertexSnap", 16, 512, 1)
	.name("précision des sommets")
	.onChange(() => updateSnapGrid());

/**
 * Effets d'écran CRT
 */
const crt = {
	scanlines: {
		label: "Scanlines",
		uniform: "uScanlines",
		enabled: true,
		strength: 0.65,
	},
	halo: {
		label: "Halo (bloom)",
		uniform: "uHalo",
		enabled: false,
		strength: 0.5,
	},
	mask: {
		label: "Masque de phosphores",
		uniform: "uMask",
		enabled: true,
		strength: 0.35,
	},
	curvature: {
		label: "Courbure + vignettage",
		uniform: "uCurvature",
		enabled: false,
		strength: 0.5,
	},
	aberration: {
		label: "Aberration chromatique",
		uniform: "uAberration",
		enabled: false,
		strength: 0.5,
	},
	noise: {
		label: "Bruit",
		uniform: "uNoise",
		enabled: true,
		strength: 0.1,
	},
	flicker: {
		label: "Flicker",
		uniform: "uFlicker",
		enabled: false,
		strength: 0.5,
	},
};

const maskSettings = {
	type: 2,
	pitch: 8,
};

function updateCrt() {
	Object.values(crt).forEach(({ uniform, enabled, strength }) => {
		postMaterial.uniforms[uniform].value = enabled ? strength : 0;
	});

	postMaterial.uniforms.uMaskType.value = maskSettings.type;
	postMaterial.uniforms.uMaskPitch.value = maskSettings.pitch;
}

updateCrt();

const crtFolder = gui.addFolder("Effets d'écran (CRT)");

crtFolder
	.add(crtSettings, "lineSize", 1, 12, 0.5)
	.name("taille des lignes (hors rétro)")
	.onChange(() => resizeRetro());

// Génère un interface pour chaque effet CRT
Object.values(crt).forEach((effect) => {
	crtFolder.add(effect, "enabled").name(effect.label).onChange(updateCrt);

	crtFolder
		.add(effect, "strength", 0, 1, 0.01)
		.name("↳ intensité")
		.onChange(updateCrt);

	if (effect === crt.mask) {
		crtFolder
			.add(maskSettings, "type", {
				"Aperture grille (Trinitron)": 0,
				"Shadow mask (points en delta)": 1,
				"Slot mask (fentes décalées)": 2,
			})
			.name("↳ type de masque")
			.onChange(updateCrt);

		crtFolder
			.add(maskSettings, "pitch", 3, 12, 0.5)
			.name("↳ dot pitch (px)")
			.onChange(updateCrt);
	}
});

/**
 * Sélecteur de scène
 */
const startIndex = 1;

let currentIndex = startIndex;
let targetRotation = startIndex * stepAngle;

// Positionne le plateau immédiatement, sans animation au chargement.
turntable.rotation.y = targetRotation;

function goToIndex(index) {
	const count = numberOfDisplays;

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

	dots.forEach((dot, i) => {
		dot.classList.toggle("is-active", i === currentIndex);
	});
}

updateSelector();

window.addEventListener("keydown", (event) => {
	if (
		event.repeat ||
		event.target instanceof HTMLInputElement || // empêche d'activer si input est focus
		event.target instanceof HTMLSelectElement // empêche d'activer si select est focus
	) {
		return;
	}

	if (event.key === "ArrowRight") {
		goNext();
	} else if (event.key === "ArrowLeft") {
		goPrevious();
	}
});

/**
 * Navigation tactile
 */
let swipeStartX = null;

canvas.addEventListener("pointerdown", (event) => {
	if (event.pointerType === "touch") {
		swipeStartX = event.clientX;
	}
});

canvas.addEventListener("pointerup", (event) => {
	if (swipeStartX === null) return;

	const deltaX = event.clientX - swipeStartX;
	swipeStartX = null;

	if (debugObject.freeCamera || Math.abs(deltaX) < 50) {
		return;
	}

	if (deltaX < 0) {
		goNext();
	} else {
		goPrevious();
	}
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

modelScaleFolder.close();
cameraFolder.close();
retroFolder.close();

/**
 * Animate
 */
const timer = new Timer();
let elapsedTime = 0;

const tick = () => {
	timer.update();

	const rotationDelta = Math.min(timer.getDelta(), 0.1);

	const animationDelta = debugObject.freezeTime ? 0 : rotationDelta;

	elapsedTime += animationDelta;

	// Rotation du plateau (avec un damp géré depuis Three)
	turntable.rotation.y = THREE.MathUtils.damp(
		turntable.rotation.y,
		targetRotation,
		4,
		rotationDelta,
	);

	// Flottement des formes
	carouselShapes.forEach((mesh, i) => {
		mesh.position.y = 1 + Math.sin(elapsedTime + i) * 0.2;
	});

	// Flottement des modèles
	objectGroups.forEach((group, i) => {
		group.position.y = 1 + Math.sin(elapsedTime + i) * 0.2;
	});

	// Rotation individuelle des modèles.
	spinningModels.forEach(({ object, x = 0, y = 0, z = 0 }) => {
		object.rotation.x += x * animationDelta;
		object.rotation.y += y * animationDelta;
		object.rotation.z += z * animationDelta;
	});

	// Caméra.
	if (debugObject.freeCamera) {
		controls.update();
	} else {
		camera.position.set(-cameraRig.offset, cameraRig.height, 0);

		camera.lookAt(objectPositionFromCenter, cameraRig.targetHeight, 0);
	}

	postMaterial.uniforms.uTime.value = elapsedTime;

	// Post-traitement toujours actif, même sans le mode rétro.
	renderer.setRenderTarget(renderTarget);
	renderer.render(scene, camera);

	renderer.setRenderTarget(null);
	renderer.render(postScene, postCamera);

	window.requestAnimationFrame(tick);
};

tick();
