uniform float uPositionY;

varying vec2 vUv;

void main(){
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  // Final position
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPosition = projectionMatrix * viewPosition;
  
  gl_Position = projectionPosition;

  gl_Position.y += uPositionY;

  vUv = uv;
}