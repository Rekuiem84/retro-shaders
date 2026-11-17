#include <project_vertex>

// Vertex snapping : arrondi de la position écran sur une grille grossière
if (uSnapGrid.x > 0.0) {
	vec2 halfGrid = uSnapGrid * 0.5;
	vec2 ndc = gl_Position.xy / gl_Position.w;
	ndc = floor(ndc * halfGrid + 0.5) / halfGrid;
	gl_Position.xy = ndc * gl_Position.w;
}
