varying vec2 vUv;

uniform vec3 uColor;

void main(){
  // Final color
  gl_FragColor = vec4(vec2(fract(vUv.x * 4.0), vUv.y), 1.0, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}