vec3 directionalLight(
    vec3 lightColor, 
    float lightIntensity, 
    vec3 normal, 
    vec3 lightDirection, // Direction VERS la lumière, pas DEPUIS la lumière (identique pour toute la scène)
    vec3 viewDirection, 
    float specularPower){
    // Cette lumière éclaire toute la scène de façon uniforme, sans atténuation (pas de decay),
    // contrairement à pointLight qui calcule une direction propre à chaque fragment.

    // Le helper peut être trompeur, mais même un objet placé "derrière" le helper de la lumière
    // sera éclairé, depuis la même direction que les autres objets.

    // La lumière éclairant de manière uniforme, on la normalize
    vec3 normalizedLightDirection = normalize(lightDirection);

    // reflect(I, N) réfléchit le vecteur d'incidence I par rapport à la normale N, comme un rayon
    // qui rebondit sur un miroir. On passe -normalizedLightDirection (donc la direction
    // DEPUIS la lumière, opposée à normalizedLightDirection) pour obtenir la direction
    // que prendrait un rayon lumineux après avoir rebondi sur cette surface.
    vec3 lightReflection = reflect(- normalizedLightDirection, normal);

    // Shading
    // On vient calculer à quel point la surface fait face à la lumière avec un produit scalaire
    // entre deux vecteurs normalisés (on obtient donc le cosinus de l'angle)
    float shading = dot(normal, normalizedLightDirection);

    // La normale opposée à la lumière (derrière l'objet) retourne -1, donc l'arrière est complètement noir
    // On vient donc mettre en valeur minimale 0
    shading = max(0.0, shading);

    // Specular
    // On compare la direction du reflet de la lumière à la direction vers la caméra (viewDirection) :
    // si le reflet pointe droit vers l'œil, on est pile dans l'axe du reflet spéculaire (effect cercle lumineux).
    // Le signe "-" compense le sens de viewDirection, défini dans le vertex shader comme
    // (vPosition - cameraPosition), donc orienté depuis la caméra vers la surface (et non l'inverse).
    float specular = - dot(lightReflection, viewDirection);

    // Comme pour shading, on ignore les valeurs négatives (reflet qui pointe à l'opposé de la caméra)
    specular = max(0.0, specular);

    // specularPower ne change pas l'intensité du reflet mais sa forme : plus il est élevé, plus le
    // reflet est petit et net (aspect métal poli) ; plus il est bas, plus il est large et doux
    // (aspect mat). Attention : specularPower = 0 donne pow(x, 0) = 1 pour tout x > 0, ce qui produit
    // un reflet saturé sur toute la zone éclairée plutôt qu'un point localisé.
    specular = pow(specular, specularPower);

    return (shading + specular) * lightColor * lightIntensity;
}