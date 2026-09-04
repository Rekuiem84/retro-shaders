uniform vec3 uColor;

uniform vec3 uAmbientLightColor;
uniform float uAmbientLightIntensity;
uniform float uAmbientLightVisible;

uniform vec3 uDirectionalLightColor;
uniform float uDirectionalLightIntensity;
uniform float uDirectionalLightSpecularPower;
uniform vec3 uDirectionalLightPosition;
uniform float uDirectionalLightVisible;

uniform vec3 uPointLight1Color;
uniform float uPointLight1Intensity;
uniform float uPointLight1SpecularPower;
uniform float uPointLight1Decay;
uniform vec3 uPointLight1Position;
uniform float uPointLight1Visible;

uniform vec3 uPointLight2Color;
uniform float uPointLight2Intensity;
uniform float uPointLight2SpecularPower;
uniform float uPointLight2Decay;
uniform vec3 uPointLight2Position;
uniform float uPointLight2Visible;

uniform vec3 uPointLight3Color;
uniform float uPointLight3Intensity;
uniform float uPointLight3SpecularPower;
uniform float uPointLight3Decay;
uniform vec3 uPointLight3Position;
uniform float uPointLight3Visible;

varying vec3 vNormal;
varying vec3 vPosition;

#include ../includes/ambientLight.glsl
#include ../includes/directionalLight.glsl
#include ../includes/pointLight.glsl

void main()
{
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 color = uColor;

    // Lights
    vec3 light = vec3(0.0);
    light += ambientLight(
        uAmbientLightColor,                             // Color
        uAmbientLightIntensity * uAmbientLightVisible    // Intensity
    );
    light += directionalLight(
        uDirectionalLightColor,     // Color
        uDirectionalLightIntensity * uDirectionalLightVisible, // Intensité (en fonction de si hide est coché)
        normal,                     // Normal
        uDirectionalLightPosition,  // Light position
        viewDirection ,             // View direction
        uDirectionalLightSpecularPower
    );
    light += pointLight(
        uPointLight1Color,          // Color
        uPointLight1Intensity * uPointLight1Visible,
        normal,                     // Normal
        uPointLight1Position,       // Light position
        viewDirection ,             // View direction
        uPointLight1SpecularPower,  // Specular power
        vPosition,                  // Position
        uPointLight1Decay           // Light decay
    );
    light += pointLight(
        uPointLight2Color,          // Color
        uPointLight2Intensity * uPointLight2Visible,
        normal,                     // Normal
        uPointLight2Position,       // Light position
        viewDirection ,             // View direction
        uPointLight2SpecularPower,  // Specular power
        vPosition,                  // Position
        uPointLight2Decay           // Light decay
    );
    light += pointLight(
        uPointLight3Color,          // Color
        uPointLight3Intensity * uPointLight3Visible,
        normal,                     // Normal
        uPointLight3Position,       // Light position
        viewDirection ,             // View direction
        uPointLight3SpecularPower,  // Specular power
        vPosition,                  // Position
        uPointLight3Decay           // Light decay
    );
    color *= light;

    // Final color
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}

