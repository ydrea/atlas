// contexts/translations.js
// Translation dictionary for the app
// (UI only, no island name translations)

const translations = {
  // Common UI elements
  en: {
    compassCalibration: "Calibrating compass…",
    movePhone: "Move phone in a figure-8",
    stability: "Stability: {count}/15",
    selectLanguage: "Select Language:",
    startAR: "Start AR Experience",
    loading: "Loading…",
    arView: "AR View",
    visibleIslands: "{count} visible islands",
    debugLog: "Debug Log",
    settings: "Settings",
    camera: "Camera",
    map: "Map",
    islands: "Islands",
    about: "About",
    help: "Help",
    // Help Screen
    helpTitle: "Gesture Controls",
    helpSubtitle:
      "Control your AR experience with intuitive two-finger gestures",
    maxDistanceTitle: "MAX DISTANCE (Far Clip)",
    maxDistanceDesc: "Move top finger UP/DOWN to control how far you can see",
    minDistanceTitle: "MIN DISTANCE (Near Clip)",
    minDistanceDesc:
      "Move bottom finger UP/DOWN to control the minimum visible distance",
    cameraZoomTitle: "CAMERA ZOOM",
    cameraZoomDesc:
      "Move both fingers together (up/down) for classic pinch-to-zoom",
    fovTitle: "FIELD OF VIEW (FOV)",
    fovDesc:
      "Pinch horizontally to adjust lens width (30° telephoto → 120° ultra-wide)",
    visualFeedbackTitle: "Visual Feedback",
    yellowTopTooFar: "Yellow top arrow = too far",
    blueBottomTooClose: "Blue bottom arrow = too close",
    whiteEdgeTurn: "White edge arrow = turn to find",
    cyanPulsingRing: "Cyan pulsing ring = object found",
    proTipsTitle: "💡 Pro Tips",
    proTip1: "• Rubber band effect tells you when you've reached the limit",
    proTip2: "• Watch the distance bar at the bottom of the screen",
    proTip3: "• Use the reset button (🔍) to restore default settings",
    proTip4: "• Take screenshots (📸) to share your AR view",
    proTip5: "• Yellow/blue feedback helps you locate objects in space",
    helpFooter:
      "Gestures detected on two-finger touch • Rubber band provides physical feedback",
  },

  hr: {
    compassCalibration: "Kalibriranje kompasa…",
    movePhone: "Pomaknite telefon u obliku osmice",
    stability: "Stabilnost: {count}/15",
    selectLanguage: "Odaberite jezik:",
    startAR: "Pokreni AR iskustvo",
    loading: "Učitavanje…",
    arView: "AR Pregled",
    visibleIslands: "{count} vidljivih otoka",
    debugLog: "Debug Log",
    settings: "Postavke",
    camera: "Kamera",
    map: "Karta",
    islands: "Otoci",
    about: "O aplikaciji",
    help: "Pomoć",
    // Help Screen
    helpTitle: "Kontrole gestama",
    helpSubtitle:
      "Kontrolirajte svoje AR iskustvo intuitivnim dvoprstnim gestama",
    maxDistanceTitle: "MAKSIMALNA Udaljenost (Daljina vidika)",
    maxDistanceDesc:
      "Pomaknite gornji prst GORE/DOLJE za kontrolu najveće vidljivosti",
    minDistanceTitle: "MINIMALNA Udaljenost (Blizina vidika)",
    minDistanceDesc:
      "Pomaknite donji prst GORE/DOLJE za kontrolu minimalne vidljivosti",
    cameraZoomTitle: "ZOOM KAMERE",
    cameraZoomDesc:
      "Pomaknite oba prsta zajedno (gore/dolje) za klasično uvećanje",
    fovTitle: "POGLEDNO POLJE (FOV)",
    fovDesc:
      "Stisnite horizontalno za podešavanje širine leće (30° teleobjektiv → 120° ultraširoki)",
    visualFeedbackTitle: "Vizualna povratna informacija",
    yellowTopTooFar: "Žuta gornja strelica = predaleko",
    blueBottomTooClose: "Plava donja strelica = preblizu",
    whiteEdgeTurn: "Bijela ivična strelica = okreni da nađeš",
    cyanPulsingRing: "Cijan pulsirajući prsten = predmet pronađen",
    proTipsTitle: "💡 Savjeti",
    proTip1: "• Efekt gume upozorava kada dostignete granicu",
    proTip2: "• Promatrajte traku udaljenosti na dnu ekrana",
    proTip3:
      "• Koristite gumb za resetiranje (🔍) za vraćanje na zadanu postavku",
    proTip4: "• Napravite snimke zaslona (📸) za dijeljenje vašeg AR pogleda",
    proTip5:
      "• Žuta/plava povratna informacija pomaže vam da locirate objekte u prostoru",
    helpFooter:
      "Geste se detektiraju dvoprstnim dodirom • Efekt gume pruža fizičku povratnu informaciju",
  },

  it: {
    compassCalibration: "Calibrazione bussola…",
    movePhone: "Muovi il telefono a forma di otto",
    stability: "Stabilità: {count}/15",
    selectLanguage: "Seleziona lingua:",
    startAR: "Avvia esperienza AR",
    loading: "Caricamento…",
    arView: "Vista AR",
    visibleIslands: "{count} isole visibili",
    debugLog: "Debug Log",
    settings: "Impostazioni",
    camera: "Fotocamera",
    map: "Mappa",
    islands: "Isole",
    about: "Informazioni",
    help: "Aiuto",
    // Help Screen
    helpTitle: "Controlli con gesti",
    helpSubtitle:
      "Controlla la tua esperienza AR con gesti intuitivi a due dita",
    maxDistanceTitle: "Distanza MASSIMA (Clip Lontano)",
    maxDistanceDesc:
      "Muovi il dito in alto BASSO per controllare quanto lontano puoi vedere",
    minDistanceTitle: "Distanza MINIMA (Clip Vicino)",
    minDistanceDesc:
      "Muovi il dito in basso ALTO per controllare la distanza minima visibile",
    cameraZoomTitle: "ZOOM FOTOCAMERA",
    cameraZoomDesc:
      "Muovi entrambe le dita insieme (su/giù) per il classico pizzica-e-zoom",
    fovTitle: "Campo Visivo (FOV)",
    fovDesc:
      "Pizzica orizzontalmente per regolare la larghezza dell'obiettivo (30° teleobiettivo → 120° grandangolo)",
    visualFeedbackTitle: "Feedback Visivo",
    yellowTopTooFar: "Freccia gialla in alto = troppo lontano",
    blueBottomTooClose: "Freccia blu in basso = troppo vicino",
    whiteEdgeTurn: "Freccia bianca laterale = gira per trovare",
    cyanPulsingRing: "Anello ciano pulsante = oggetto trovato",
    proTipsTitle: "💡 Consigli Pro",
    proTip1: "• L'effetto elastico indica quando hai raggiunto il limite",
    proTip2: "• Guarda la barra di distanza in basso sullo schermo",
    proTip3:
      "• Usa il pulsante di reset (🔍) per ripristinare le impostazioni predefinite",
    proTip4: "• Fai screenshot (📸) per condividere la tua vista AR",
    proTip5:
      "• Feedback giallo/blu ti aiuta a localizzare oggetti nello spazio",
    helpFooter:
      "I gesti vengono rilevati con il tocco a due dita • L'effetto elastico fornisce feedback fisico",
  },

  de: {
    compassCalibration: "Kompass kalibrieren…",
    movePhone: "Telefon in Achterform bewegen",
    stability: "Stabilität: {count}/15",
    selectLanguage: "Sprache auswählen:",
    startAR: "AR-Erlebnis starten",
    loading: "Laden…",
    arView: "AR-Ansicht",
    visibleIslands: "{count} sichtbare Inseln",
    debugLog: "Debug Log",
    settings: "Einstellungen",
    camera: "Kamera",
    map: "Karte",
    islands: "Inseln",
    about: "Über",
    help: "Hilfe",
    // Help Screen
    helpTitle: "Gestensteuerung",
    helpSubtitle:
      "Steuern Sie Ihr AR-Erlebnis mit intuitiven Zwei-Finger-Gesten",
    maxDistanceTitle: "MAXIMALE ENTFERNUNG (Fern-Clipping)",
    maxDistanceDesc:
      "Bewegen Sie den oberen Finger HOCH/RUNTER, um zu steuern, wie weit Sie sehen können",
    minDistanceTitle: "MINIMALE ENTFERNUNG (Nah-Clipping)",
    minDistanceDesc:
      "Bewegen Sie den unteren Finger HOCH/RUNTER, um die minimale sichtbare Entfernung zu steuern",
    cameraZoomTitle: "KAMERA-ZOOM",
    cameraZoomDesc:
      "Bewegen Sie beide Finger zusammen (hoch/runter) für den klassischen Pinch-to-Zoom",
    fovTitle: "SICHTFELD (FOV)",
    fovDesc:
      "Zupfen Sie horizontal, um die Objektivbreite einzustellen (30° Teleobjektiv → 120° Ultra-Weitwinkel)",
    visualFeedbackTitle: "Visuelles Feedback",
    yellowTopTooFar: "Gelber Pfeil oben = zu weit entfernt",
    blueBottomTooClose: "Blauer Pfeil unten = zu nah",
    whiteEdgeTurn: "Weißer Randpfeil = drehen zum finden",
    cyanPulsingRing: "Cyan pulsierender Ring = Objekt gefunden",
    proTipsTitle: "💡 Profi-Tipps",
    proTip1: "• Gummi-Band-Effekt zeigt an, wenn Sie die Grenze erreicht haben",
    proTip2: "• Beobachten Sie die Entfernungsleiste am unteren Bildschirmrand",
    proTip3:
      "• Verwenden Sie die Zurücksetzen-Schaltfläche (🔍), um die Standard-Einstellungen wiederherzustellen",
    proTip4: "• Machen Sie Screenshots (📸), um Ihre AR-Ansicht zu teilen",
    proTip5:
      "• Gelbes/blaues Feedback hilft Ihnen, Objekte im Raum zu lokalisieren",
    helpFooter:
      "Gesten werden durch Zwei-Finger-Berührung erkannt • Gummi-Band bietet physisches Feedback",
  },

  fr: {
    compassCalibration: "Calibration de la boussole…",
    movePhone: "Déplacez le téléphone en forme de huit",
    stability: "Stabilité: {count}/15",
    selectLanguage: "Sélectionnez la langue:",
    startAR: "Démarrer l'expérience RA",
    loading: "Chargement…",
    arView: "Vue RA",
    visibleIslands: "{count} îles visibles",
    debugLog: "Debug Log",
    settings: "Paramètres",
    camera: "Caméra",
    map: "Carte",
    islands: "Îles",
    about: "À propos",
    help: "Aide",
    // Help Screen
    helpTitle: "Contrôles par gestes",
    helpSubtitle:
      "Contrôlez votre expérience RA avec des gestes intuitifs à deux doigts",
    maxDistanceTitle: "DISTANCE MAXIMUM (Clip Loin)",
    maxDistanceDesc:
      "Déplacez le doigt du haut HAUT/BAS pour contrôler la distance maximale de visibilité",
    minDistanceTitle: "DISTANCE MINIMUM (Clip Près)",
    minDistanceDesc:
      "Déplacez le doigt du bas HAUT/BAS pour contrôler la distance minimale visible",
    cameraZoomTitle: "ZOOM DE CAMÉRA",
    cameraZoomDesc:
      "Déplacez les deux doigts ensemble (haut/bas) pour le zoom pincer classique",
    fovTitle: "CHAMP DE VISION (FOV)",
    fovDesc:
      "Pincez horizontalement pour ajuster la largeur de l'objectif (30° téléobjectif → 120° ultra grand-angle)",
    visualFeedbackTitle: "Retour Visuel",
    yellowTopTooFar: "Flèche jaune en haut = trop loin",
    blueBottomTooClose: "Flèche bleue en bas = trop près",
    whiteEdgeTurn: "Flèche blanche latérale = tournez pour trouver",
    cyanPulsingRing: "Anneau cyan pulsant = objet trouvé",
    proTipsTitle: "💡 Conseils Pro",
    proTip1:
      "• L'effet élastique vous indique lorsque vous atteignez la limite",
    proTip2: "• Surveillez la barre de distance en bas de l'écran",
    proTip3:
      "• Utilisez le bouton de réinitialisation (🔍) pour restaurer les paramètres par défaut",
    proTip4: "• Prenez des captures d'écran (📸) pour partager votre vue RA",
    proTip5:
      "• Le feedback jaune/bleu vous aide à localiser les objets dans l'espace",
    helpFooter:
      "Les gestes sont détectés par un toucher à deux doigts • L'effet élastique fournit un retour physique",
  },
};

// Helper function to replace placeholders in translations
export const translate = (key, language, replacements = {}) => {
  // Fallback to English if language not available
  const lang = translations[language] || translations.en;

  if (!lang || !lang[key]) {
    return translations.en[key] || key;
  }

  let translation = lang[key];

  // Replace placeholders like {count}, {name}, etc.
  Object.entries(replacements).forEach(([placeholder, value]) => {
    translation = translation.replace(`{${placeholder}}`, value);
  });

  return translation;
};

// Get all available languages
export const getAvailableLanguages = () => {
  return Object.keys(translations);
};

// Simple pass-through function for island names (no translation)
// Uses original names from pois.optimized.json
export const getIslandName = (islandName) => {
  return islandName; // Return original name without translation
};

export default translations;
