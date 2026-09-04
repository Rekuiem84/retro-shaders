vec3 pointLight(
    vec3 lightColor, 
    float lightIntensity, 
    vec3 normal, 
    vec3 lightPosition, 
    vec3 viewDirection, 
    float specularPower, 
    vec3 position, 
    float lightDecay){
    // Contrairement à directionalLight, lightPosition est ici une VRAIE position dans l'espace.
    // On calcule donc une direction propre à CHAQUE fragment (lightPosition - position),
    // qui varie selon l'endroit de la surface concerné; d'où l'atténuation avec la distance
    // (decay) plus bas, qui n'a pas de sens pour une lumière directionnelle.
    vec3 lightDelta = lightPosition - position;
    float lightDistance = length(lightDelta);

    vec3 lightDirection = normalize(lightDelta);
    vec3 lightReflection = reflect(- lightDirection, normal); // Voir directionalLight pour explication de reflect

    // Shading
    float shading = dot(normal, lightDirection); // Voir directionalLight pour explication de la fonction dot pour le shading

    // La normale opposée à la lumière (derrière l'objet) retourne -1, donc l'arrère est complètement noir
    // On vient donc le clamp entre 0 et 1
    shading = max(0.0, shading);

    // Specular
    // Voir directionalLight pour explication du specular
    float specular = - dot(lightReflection, viewDirection);
    specular = max(0.0, specular);
    specular = pow(specular, specularPower);

    // Decay
    // Atténuation linéaire de l'intensité avec la distance à la source : 
    // plus lightDistance est grand, plus decay diminue. lightDecay contrôle la vitesse de cette chute
    // (0 = pas d'atténuation du tout, valeurs plus hautes = lumière qui s'éteint plus vite).
    // On clamp à 0 pour éviter une intensité négative au-delà d'une certaine distance.
    float decay = 1.0 - lightDistance * lightDecay;
    decay = max(0.0, decay);

    return (shading + specular) * lightColor * lightIntensity * decay;
}