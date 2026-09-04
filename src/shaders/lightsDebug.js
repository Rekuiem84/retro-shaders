import * as THREE from "three";

export function setupLightsDebug({ gui, material, lightsParameters, helpers }) {
	const {
		directionalLightHelper,
		pointLightHelper1,
		pointLightHelper2,
		pointLightHelper3,
	} = helpers;

	const updateDirectionalLight = () => {
		material.uniforms.uDirectionalLightColor.value.set(
			lightsParameters.directionalLight.color,
		);
		material.uniforms.uDirectionalLightIntensity.value =
			lightsParameters.directionalLight.intensity;
		material.uniforms.uDirectionalLightSpecularPower.value =
			lightsParameters.directionalLight.specularPower;
		material.uniforms.uDirectionalLightPosition.value.set(
			lightsParameters.directionalLight.position.x,
			lightsParameters.directionalLight.position.y,
			lightsParameters.directionalLight.position.z,
		);
		material.uniforms.uDirectionalLightVisible.value = lightsParameters
			.directionalLight.visible
			? 1.0
			: 0.0;

		// Pour ce helper, on va faire pointer la flèche vers le centre, depuis une position
		const lightPos = new THREE.Vector3(
			lightsParameters.directionalLight.position.x,
			lightsParameters.directionalLight.position.y,
			lightsParameters.directionalLight.position.z,
		);
		const rayDirection = lightPos.clone().negate().normalize(); // sens des rayons, opposé à "dir vers la lumière"

		directionalLightHelper.position.copy(lightPos); // la flèche part de la position réglée dans le GUI
		directionalLightHelper.setDirection(rayDirection);
		directionalLightHelper.setColor(lightsParameters.directionalLight.color);
		directionalLightHelper.visible = lightsParameters.directionalLight.visible;
	};

	const updatePointLight1 = () => {
		material.uniforms.uPointLight1Color.value.set(
			lightsParameters.pointLight1.color,
		);
		material.uniforms.uPointLight1Intensity.value =
			lightsParameters.pointLight1.intensity;
		material.uniforms.uPointLight1SpecularPower.value =
			lightsParameters.pointLight1.specularPower;
		material.uniforms.uPointLight1Decay.value =
			lightsParameters.pointLight1.decay;
		material.uniforms.uPointLight1Position.value.set(
			lightsParameters.pointLight1.position.x,
			lightsParameters.pointLight1.position.y,
			lightsParameters.pointLight1.position.z,
		);
		material.uniforms.uPointLight1Visible.value = lightsParameters.pointLight1
			.visible
			? 1.0
			: 0.0;
		pointLightHelper1.position.set(
			lightsParameters.pointLight1.position.x,
			lightsParameters.pointLight1.position.y,
			lightsParameters.pointLight1.position.z,
		);
		pointLightHelper1.visible = lightsParameters.pointLight1.visible;
		pointLightHelper1.material.color.set(lightsParameters.pointLight1.color);
	};

	const updatePointLight2 = () => {
		material.uniforms.uPointLight2Color.value.set(
			lightsParameters.pointLight2.color,
		);
		material.uniforms.uPointLight2Intensity.value =
			lightsParameters.pointLight2.intensity;
		material.uniforms.uPointLight2SpecularPower.value =
			lightsParameters.pointLight2.specularPower;
		material.uniforms.uPointLight2Decay.value =
			lightsParameters.pointLight2.decay;
		material.uniforms.uPointLight2Position.value.set(
			lightsParameters.pointLight2.position.x,
			lightsParameters.pointLight2.position.y,
			lightsParameters.pointLight2.position.z,
		);
		material.uniforms.uPointLight2Visible.value = lightsParameters.pointLight2
			.visible
			? 1.0
			: 0.0;
		pointLightHelper2.position.set(
			lightsParameters.pointLight2.position.x,
			lightsParameters.pointLight2.position.y,
			lightsParameters.pointLight2.position.z,
		);
		pointLightHelper2.visible = lightsParameters.pointLight2.visible;
		pointLightHelper2.material.color.set(lightsParameters.pointLight2.color);
	};

	const updatePointLight3 = () => {
		material.uniforms.uPointLight3Color.value.set(
			lightsParameters.pointLight3.color,
		);
		material.uniforms.uPointLight3Intensity.value =
			lightsParameters.pointLight3.intensity;
		material.uniforms.uPointLight3SpecularPower.value =
			lightsParameters.pointLight3.specularPower;
		material.uniforms.uPointLight3Decay.value =
			lightsParameters.pointLight3.decay;
		material.uniforms.uPointLight3Position.value.set(
			lightsParameters.pointLight3.position.x,
			lightsParameters.pointLight3.position.y,
			lightsParameters.pointLight3.position.z,
		);
		material.uniforms.uPointLight3Visible.value = lightsParameters.pointLight3
			.visible
			? 1.0
			: 0.0;
		pointLightHelper3.position.set(
			lightsParameters.pointLight3.position.x,
			lightsParameters.pointLight3.position.y,
			lightsParameters.pointLight3.position.z,
		);
		pointLightHelper3.visible = lightsParameters.pointLight3.visible;
		pointLightHelper3.material.color.set(lightsParameters.pointLight3.color);
	};

	const ambientLightFolder = gui.addFolder("Ambient Light");

	ambientLightFolder
		.addColor(lightsParameters.ambientLight, "color")
		.onChange(() => {
			material.uniforms.uAmbientLightColor.value.set(
				lightsParameters.ambientLight.color,
			);
		});
	ambientLightFolder
		.add(lightsParameters.ambientLight, "intensity")
		.min(0)
		.max(1)
		.step(0.001)
		.onChange(() => {
			material.uniforms.uAmbientLightIntensity.value =
				lightsParameters.ambientLight.intensity;
		});
	ambientLightFolder
		.add(lightsParameters.ambientLight, "visible")
		.name("hide")
		.onChange(() => {
			material.uniforms.uAmbientLightVisible.value = lightsParameters
				.ambientLight.visible
				? 1.0
				: 0.0;
		});

	const directionalLightFolder = gui.addFolder("Directional Light");

	directionalLightFolder
		.addColor(lightsParameters.directionalLight, "color")
		.onChange(updateDirectionalLight);
	directionalLightFolder
		.add(lightsParameters.directionalLight.position, "x")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updateDirectionalLight);
	directionalLightFolder
		.add(lightsParameters.directionalLight.position, "y")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updateDirectionalLight);
	directionalLightFolder
		.add(lightsParameters.directionalLight.position, "z")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updateDirectionalLight);
	directionalLightFolder
		.add(lightsParameters.directionalLight, "intensity")
		.min(0)
		.max(5)
		.step(0.01)
		.onChange(updateDirectionalLight);
	directionalLightFolder
		.add(lightsParameters.directionalLight, "specularPower")
		.min(0)
		.max(100)
		.step(1)
		.onChange(updateDirectionalLight);
	directionalLightFolder
		.add(lightsParameters.directionalLight, "visible")
		.name("hide")
		.onChange(updateDirectionalLight);

	const pointLightFolder1 = gui.addFolder("Point Light 1");
	pointLightFolder1
		.addColor(lightsParameters.pointLight1, "color")
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1.position, "x")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1.position, "y")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1.position, "z")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1, "intensity")
		.min(0)
		.max(5)
		.step(0.01)
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1, "specularPower")
		.min(0)
		.max(100)
		.step(1)
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1, "decay")
		.min(0)
		.max(1)
		.step(0.001)
		.onChange(updatePointLight1);
	pointLightFolder1
		.add(lightsParameters.pointLight1, "visible")
		.name("hide")
		.onChange(updatePointLight1);

	const pointLightFolder2 = gui.addFolder("Point Light 2");
	pointLightFolder2
		.addColor(lightsParameters.pointLight2, "color")
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2.position, "x")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2.position, "y")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2.position, "z")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2, "intensity")
		.min(0)
		.max(5)
		.step(0.01)
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2, "specularPower")
		.min(0)
		.max(100)
		.step(1)
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2, "decay")
		.min(0)
		.max(1)
		.step(0.001)
		.onChange(updatePointLight2);
	pointLightFolder2
		.add(lightsParameters.pointLight2, "visible")
		.name("hide")
		.onChange(updatePointLight2);

	const pointLightFolder3 = gui.addFolder("Point Light 3");
	pointLightFolder3
		.addColor(lightsParameters.pointLight3, "color")
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3.position, "x")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3.position, "y")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3.position, "z")
		.min(-10)
		.max(10)
		.step(0.01)
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3, "intensity")
		.min(0)
		.max(5)
		.step(0.01)
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3, "specularPower")
		.min(0)
		.max(100)
		.step(1)
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3, "decay")
		.min(0)
		.max(1)
		.step(0.001)
		.onChange(updatePointLight3);
	pointLightFolder3
		.add(lightsParameters.pointLight3, "visible")
		.name("hide")
		.onChange(updatePointLight3);

	// Initialisation des uniforms au chargement
	updateDirectionalLight();
	updatePointLight1();
	updatePointLight2();
	updatePointLight3();
}
