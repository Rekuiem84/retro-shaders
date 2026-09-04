varying vec2 vUv;

uniform vec3 uColor;

void main(){
  // Final color
  gl_FragColor = vec4(vUv, 1.0, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}