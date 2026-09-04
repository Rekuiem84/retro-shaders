varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    // Position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    // Model normal
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
    /* 
    Permet de mettre à jour la normale du modèle en fonction d'une matrice de transformation (scale, translation, rotation)
    Le dernier paramètre du vec4 permet d'indiquer que le modèle est non-homogène (càd qu'on ignore sa translation)
    Le dernier paramètre w, indique soit une position (avec w = 1.0), soit une direction/normale (w = 0.0)
    Ici on indique donc bien qu'on veut obtenir une normale, sans prendre en compte la transaction (directionalLight)
    */
    // Varying
    vNormal = modelNormal.xyz;
    vPosition = modelPosition.xyz;
}
