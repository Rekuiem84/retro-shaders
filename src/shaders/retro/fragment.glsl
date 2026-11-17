uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform vec2 uCrtResolution;
uniform vec2 uScreenSize;
uniform float uColorLevels;
uniform float uDitherStrength;
uniform float uRetroEnabled;
uniform float uTime;

// Effets d'écran (0 = désactivé)
uniform float uScanlines;
uniform float uHalo;
uniform float uMask;
uniform float uMaskType;
uniform float uMaskPitch;
uniform float uCurvature;
uniform float uAberration;
uniform float uNoise;
uniform float uFlicker;

varying vec2 vUv;

// Matrice de Bayer 4x4 (dithering ordonné, technique pour ajouter des variations aux couleurs)
// Le motif se répète tous les 4 pixels pour un dithering régulier plutôt qu'un bruit random
const float bayer[16] = float[16](
	0.0, 8.0, 2.0, 10.0,
	12.0, 4.0, 14.0, 6.0,
	3.0, 11.0, 1.0, 9.0,
	15.0, 7.0, 13.0, 5.0
);

// Courbure de l'écran : les bords se replient vers l'intérieur (tube cathodique)
// Déforme les coordonées UV pour simuler une courbure
vec2 curve(vec2 uv, float amount) {
	vec2 pos = uv * 2.0 - 1.0;
	float warp = amount * 0.12; // Facteur de déformation
	pos *= vec2(1.0 + pos.y * pos.y * warp, 1.0 + pos.x * pos.x * warp);
	return pos * 0.5 + 0.5;
}

// Transforme une position 2D en valeur pseudo random entre 0 et 1 (sert à animer le grain et le bruit)
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Halo : flou des zones lumineuses, calculé en lumière linéaire (HDR)
// Réglages : seuil de luminosité (0.3) et écart entre les prises de mesure (1.5 gros pixels)
vec3 halo(vec2 uv) {
	vec3 sum = vec3(0.0);
	float total = 0.0;

	for (int x = -2; x <= 2; x++) {
		for (int y = -2; y <= 2; y++) {
			vec2 offset = vec2(float(x), float(y));
			float weight = exp(-dot(offset, offset) * 0.25);
			vec3 tap = texture2D(tDiffuse, uv + offset * 1.5 / uCrtResolution).rgb;
			sum += max(tap - 0.3, 0.0) * weight;
			total += weight;
		}
	}

	return sum / total;
}

/**
 * Masques de phosphores
 * screen : position du pixel en pixels CSS
 * pitch : largeur d'une triade rouge/verte/bleue (dot pitch)
 */

// Distance (0 à 0.5) entre t et un centre, sur une période qui boucle
float wrapDistance(float t, float center) {
	return abs(fract(t - center + 0.5) - 0.5);
}

// Trois bandes rouge, verte, bleue réparties sur une période t (0 à 1)
vec3 triadStripes(float t) {
	return vec3(
		1.0 - smoothstep(0.09, 0.16, wrapDistance(t, 1.0 / 6.0)),
		1.0 - smoothstep(0.09, 0.16, wrapDistance(t, 3.0 / 6.0)),
		1.0 - smoothstep(0.09, 0.16, wrapDistance(t, 5.0 / 6.0))
	);
}

// Aperture grille (Trinitron) : bandes verticales continues
vec3 apertureGrille(vec2 screen, float pitch) {
	return triadStripes(screen.x / pitch);
}

// Shadow mask : points ronds en triades, une ligne sur deux décalée d'une demi-triade
vec3 shadowMask(vec2 screen, float pitch) {
	float dotSpacing = pitch / 3.0;
	float rowHeight = pitch * 0.4;
	float row = floor(screen.y / rowHeight);
	float x = screen.x / pitch + 0.5 * mod(row, 2.0);
	vec2 local = vec2(fract(x) * pitch, fract(screen.y / rowHeight) * rowHeight);

	vec3 result = vec3(0.0);
	for (int c = 0; c < 3; c++) {
		vec2 center = vec2((float(c) + 0.5) * dotSpacing, rowHeight * 0.5);
		float d = length(local - center);
		result[c] = 1.0 - smoothstep(dotSpacing * 0.3, dotSpacing * 0.5, d);
	}
	return result;
}

// Slot mask : bandes verticales coupées par des fentes, décalées d'une colonne à l'autre
vec3 slotMask(vec2 screen, float pitch) {
	float x = screen.x / pitch;
	float column = floor(x * 3.0);
	float y = screen.y / pitch + 0.5 * mod(column, 2.0);
	float inSlot = fract(y);
	float slot = smoothstep(0.0, 0.16, inSlot) * (1.0 - smoothstep(0.84, 1.0, inSlot));
	return triadStripes(x) * slot;
}

void main() {
	// Courbure
	vec2 uv = curve(vUv, uCurvature);

	// Hors de l'écran courbé : bordure noire
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	// Aberration chromatique
	// Rouge et bleu décalés en sens opposés, de plus en plus vers les bords
	vec2 shift = (uv - 0.5) * uAberration * 0.02;
	vec3 base = vec3(
		texture2D(tDiffuse, uv + shift).r,
		texture2D(tDiffuse, uv).g,
		texture2D(tDiffuse, uv - shift).b
	);

	// Halo 
	if (uHalo > 0.0) {
		base += halo(uv) * uHalo * 2.0;
	}

	gl_FragColor = vec4(base, 1.0);

	// Même rendu final que sans l'effet : tone mapping puis conversion sRGB
	#include <tonemapping_fragment>
	#include <colorspace_fragment>

	vec3 color = gl_FragColor.rgb;

	// Rendu rétro PS2
	// Le dithering et la quantification ne fonctionnent
	// que lorsque le mode Rétro PS2 est activé.

	if (uRetroEnabled > 0.5) {
		ivec2 pixel = ivec2(floor(uv * uResolution)) % 4;
		float threshold = (bayer[pixel.x + pixel.y * 4] + 0.5) / 16.0 - 0.5;

		float steps = uColorLevels - 1.0;
		color = color + threshold * uDitherStrength / steps;
		color = floor(color * steps + 0.5) / steps;
	}

	// Bruit : grain animé à 24 images/s, aligné sur les gros pixels
	vec2 cell = floor(uv * uCrtResolution);
	float grain = hash(cell + floor(uTime * 24.0) * 17.0) - 0.5;
	color += grain * uNoise * 0.3;

	// Masque de phosphores
	// Fixé à la dalle : il utilise vUv (écran) et non uv (image courbée)
	if (uMask > 0.0) {
		vec2 screen = vUv * uScreenSize;
		int maskType = int(uMaskType + 0.5);
		vec3 pattern;
		float gain; // compense en partie l'assombrissement du masque

		if (maskType == 0) {
			pattern = apertureGrille(screen, uMaskPitch);
			gain = 2.2;
		} else if (maskType == 1) {
			pattern = shadowMask(screen, uMaskPitch);
			gain = 4.0;
		} else {
			pattern = slotMask(screen, uMaskPitch);
			gain = 2.8;
		}

		color *= mix(vec3(1.0), pattern * gain, uMask);
	}

	// Scanlines : une ligne sombre entre chaque rangée de gros pixels
	float scan = 0.5 + 0.5 * cos(6.2831853 * (uv.y * uCrtResolution.y - 0.5));
	color *= mix(1.0, scan, uScanlines) * (1.0 + 0.3 * uScanlines);

	// Scintillement : léger battement de luminosité + bande sombre qui descend lentement
	float flicker = 1.0 - uFlicker * 0.03 * sin(uTime * 90.0);
	float band = pow(0.5 + 0.5 * sin(6.2831853 * (uv.y + uTime * 0.1)), 6.0);
	color *= flicker * (1.0 - uFlicker * 0.25 * band);

	// Vignettage (bords et coins assombris, lié à la courbure)
	float vignette = 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
	color *= mix(1.0, clamp(pow(vignette, 0.25), 0.0, 1.0), uCurvature);

	gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
