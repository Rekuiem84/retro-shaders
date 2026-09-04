export const lightsParameters = {
	ambientLight: {
		color: "#ffffff",
		intensity: 0.02,
		visible: true,
	},
	directionalLight: {
		color: "#1a1aff",
		position: {
			x: 0,
			y: 0,
			z: 3,
		},
		intensity: 1,
		specularPower: 20,
		visible: true,
	},
	pointLight1: {
		color: "#ff1a1a",
		position: {
			x: 0,
			y: 2.5,
			z: 0,
		},
		intensity: 1,
		specularPower: 20,
		decay: 0.25,
		visible: true,
	},
	pointLight2: {
		color: "#1aff80",
		position: {
			x: 2,
			y: 2,
			z: 2,
		},
		intensity: 1,
		specularPower: 20,
		decay: 0.25,
		visible: true,
	},
	pointLight3: {
		color: "#cc9933",
		position: {
			x: -2,
			y: -1,
			z: -3,
		},
		intensity: 1,
		specularPower: 20,
		decay: 0.18,
		visible: true,
	},
};
