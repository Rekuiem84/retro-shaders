# Three.js Boilerplate

Un projet boilerplate complet pour démarrer rapidement avec **Three.js**, **Vite**, et des shaders GLSL avancés.

## Fonctionnalités

- **Shaders GLSL** - Vertex et fragment shaders modulaires
- **OrbitControls** - Navigation 3D interactive
- **lil-GUI** - Panneau de contrôle/débogage en temps réel
- **Compression DRACO** - Décompression des modèles 3D optimisés
- **Support des lumières** - Ambient, directional et point lights custom
- **Bruit Perlin et Simplex** - Générateurs de bruit pour effets procéduraux

## Important

- Penser à modifier le nom du projet à la ligne 5 dans vite.config.js

## Structure

```
├── src/
│   ├── script.js
│   └── shaders/
│       ├── includes/                   # Shaders réutilisables
│       │   ├── ambientLight.glsl
│       │   ├── directionalLight.glsl
│       │   ├── pointLight.glsl
│       │   ├── perlinClassic3D.glsl
│       │   ├── simplexNoise3d.glsl
│       │   └── simplexNoise4d.glsl
│       ├── basic/
│       │   ├── fragment.glsl
│       │   └── vertex.glsl
│       ├── shading/                    # Shaders de rendu avancés qui supportent la lumière
│       │   ├── fragment.glsl
│       │   └── vertex.glsl
│       ├── lightsDebug.js              # Utilitaires de débogage lumières
│       └── lightsParameters.js         # Paramètres des lumières
├── static/
│   ├── draco/                          # Fichiers DRACO pour compression
│   └── suzanne.glb
```
