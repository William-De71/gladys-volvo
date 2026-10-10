// -----------------------------------------------------------------------------
// Texts of the integration, in English and French (English fallback).
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: device and feature names, text states, widget contents, scene
// summaries, messages of the Configuration screen.
// -----------------------------------------------------------------------------

const TEXTS = {
  // devices
  deviceName: { en: 'Volvo {model}', fr: 'Volvo {model}' },
  featureBatteryLevel: { en: 'Battery', fr: 'Batterie' },
  featureBatteryRange: { en: 'Electric range', fr: 'Autonomie électrique' },
  featureBatteryEnergy: { en: 'Energy in the battery', fr: 'Énergie dans la batterie' },
  featurePlugged: { en: 'Charging cable plugged in', fr: 'Câble de charge branché' },
  featureChargingStatus: { en: 'Charging status', fr: 'État de la charge' },
  featureChargePower: { en: 'Charging power', fr: 'Puissance de charge' },
  featureChargeCurrentLimit: { en: 'Charging current limit', fr: 'Limite du courant de charge' },
  featureTargetLevel: { en: 'Charge target', fr: 'Objectif de charge' },
  featureChargeTime: { en: 'Charging time left', fr: 'Temps de charge restant' },
  featureFuelAmount: { en: 'Fuel', fr: 'Carburant' },
  featureFuelRange: { en: 'Fuel range', fr: 'Autonomie carburant' },
  featureAverageEnergy: { en: 'Average consumption', fr: 'Consommation moyenne' },
  featureOdometer: { en: 'Odometer', fr: 'Kilométrage' },
  featureLock: { en: 'Lock', fr: 'Verrouillage' },
  featureDoors: { en: 'Doors', fr: 'Portes' },
  featureTailgate: { en: 'Tailgate', fr: 'Hayon' },
  featureHood: { en: 'Hood', fr: 'Capot' },
  featureTankLid: { en: 'Tank lid', fr: 'Trappe à carburant' },
  featureWindows: { en: 'Windows', fr: 'Fenêtres' },
  featureSunroof: { en: 'Sunroof', fr: 'Toit ouvrant' },
  featureClimate: { en: 'Climate', fr: 'Climatisation' },
  featureHonk: { en: 'Honk', fr: 'Klaxon' },
  featureFlash: { en: 'Flash the lights', fr: 'Faire clignoter les feux' },
  featureHonkFlash: { en: 'Honk and flash', fr: 'Klaxon et feux' },
  featureServiceDistance: { en: 'Distance to service', fr: 'Distance avant l’entretien' },
  featureServiceDays: { en: 'Time to service', fr: 'Délai avant l’entretien' },
  featureWarnings: { en: 'Warnings', fr: 'Alertes' },
  featureDistanceHome: { en: 'Distance from home', fr: 'Distance du domicile' },

  // charge
  charge_charging: { en: 'Charging', fr: 'En charge' },
  charge_discharging: { en: 'Discharging', fr: 'En décharge' },
  charge_done: { en: 'Charge complete', fr: 'Charge terminée' },
  charge_error: { en: 'Charging error', fr: 'Erreur de charge' },
  charge_idle: { en: 'Not charging', fr: 'Pas en charge' },
  charge_scheduled: { en: 'Charge scheduled', fr: 'Charge programmée' },
  connection_connected: { en: 'Plugged in', fr: 'Branchée' },
  connection_disconnected: { en: 'Unplugged', fr: 'Débranchée' },
  connection_fault: { en: 'Charger fault', fr: 'Défaut du chargeur' },

  // availability of the car
  availability_available: { en: 'Online', fr: 'En ligne' },
  availability_unavailable: { en: 'Unavailable', fr: 'Indisponible' },
  availability_car_in_use: { en: 'In use', fr: 'En cours d’utilisation' },
  availability_no_internet: { en: 'No connection', fr: 'Sans connexion' },
  availability_ota_installation_in_progress: { en: 'Updating', fr: 'Mise à jour en cours' },
  availability_power_saving_mode: { en: 'Power saving', fr: 'Économie d’énergie' },

  // service
  service_ok: { en: 'Up to date', fr: 'À jour' },
  service_soon: { en: 'Soon', fr: 'Bientôt' },
  service_due: { en: 'Due', fr: 'À faire' },
  service_overdue: { en: 'Overdue', fr: 'En retard' },

  // warnings
  noWarning: { en: 'None', fr: 'Aucune' },
  warning_service: { en: 'Service due', fr: 'Entretien à prévoir' },
  warning_brakeFluidLevelWarning: { en: 'Brake fluid low', fr: 'Liquide de frein bas' },
  warning_oilLevelWarning: { en: 'Oil level', fr: 'Niveau d’huile' },
  warning_engineCoolantLevelWarning: { en: 'Coolant low', fr: 'Liquide de refroidissement bas' },
  warning_washerFluidLevelWarning: { en: 'Washer fluid low', fr: 'Lave-glace bas' },
  'warning_tyre:frontLeft': { en: 'Front left tyre', fr: 'Pneu avant gauche' },
  'warning_tyre:frontRight': { en: 'Front right tyre', fr: 'Pneu avant droit' },
  'warning_tyre:rearLeft': { en: 'Rear left tyre', fr: 'Pneu arrière gauche' },
  'warning_tyre:rearRight': { en: 'Rear right tyre', fr: 'Pneu arrière droit' },
  warning_brakeLightCenterWarning: { en: 'Centre brake light', fr: 'Feu stop central' },
  warning_brakeLightLeftWarning: { en: 'Left brake light', fr: 'Feu stop gauche' },
  warning_brakeLightRightWarning: { en: 'Right brake light', fr: 'Feu stop droit' },
  warning_daytimeRunningLightLeftWarning: { en: 'Left daytime light', fr: 'Feu de jour gauche' },
  warning_daytimeRunningLightRightWarning: { en: 'Right daytime light', fr: 'Feu de jour droit' },
  warning_fogLightFrontWarning: { en: 'Front fog light', fr: 'Antibrouillard avant' },
  warning_fogLightRearWarning: { en: 'Rear fog light', fr: 'Antibrouillard arrière' },
  warning_hazardLightsWarning: { en: 'Hazard lights', fr: 'Feux de détresse' },
  warning_highBeamLeftWarning: { en: 'Left high beam', fr: 'Feu de route gauche' },
  warning_highBeamRightWarning: { en: 'Right high beam', fr: 'Feu de route droit' },
  warning_lowBeamLeftWarning: { en: 'Left low beam', fr: 'Feu de croisement gauche' },
  warning_lowBeamRightWarning: { en: 'Right low beam', fr: 'Feu de croisement droit' },
  warning_positionLightFrontLeftWarning: {
    en: 'Front left position light',
    fr: 'Veilleuse avant gauche',
  },
  warning_positionLightFrontRightWarning: {
    en: 'Front right position light',
    fr: 'Veilleuse avant droite',
  },
  warning_positionLightRearLeftWarning: {
    en: 'Rear left position light',
    fr: 'Veilleuse arrière gauche',
  },
  warning_positionLightRearRightWarning: {
    en: 'Rear right position light',
    fr: 'Veilleuse arrière droite',
  },
  warning_registrationPlateLightWarning: { en: 'Plate light', fr: 'Éclairage de plaque' },
  warning_reverseLightsWarning: { en: 'Reverse lights', fr: 'Feux de recul' },
  warning_sideMarkLightsWarning: { en: 'Side marker lights', fr: 'Feux de position latéraux' },
  warning_turnIndicationFrontLeftWarning: {
    en: 'Front left indicator',
    fr: 'Clignotant avant gauche',
  },
  warning_turnIndicationFrontRightWarning: {
    en: 'Front right indicator',
    fr: 'Clignotant avant droit',
  },
  warning_turnIndicationRearLeftWarning: {
    en: 'Rear left indicator',
    fr: 'Clignotant arrière gauche',
  },
  warning_turnIndicationRearRightWarning: {
    en: 'Rear right indicator',
    fr: 'Clignotant arrière droit',
  },
  warning_other: { en: 'Bulb failure', fr: 'Ampoule défectueuse' },

  // openings
  opening_frontLeftDoor: { en: 'front left door', fr: 'porte avant gauche' },
  opening_frontRightDoor: { en: 'front right door', fr: 'porte avant droite' },
  opening_rearLeftDoor: { en: 'rear left door', fr: 'porte arrière gauche' },
  opening_rearRightDoor: { en: 'rear right door', fr: 'porte arrière droite' },
  opening_tailgate: { en: 'tailgate', fr: 'hayon' },
  opening_hood: { en: 'hood', fr: 'capot' },
  opening_tankLid: { en: 'tank lid', fr: 'trappe à carburant' },
  opening_frontLeftWindow: { en: 'front left window', fr: 'fenêtre avant gauche' },
  opening_frontRightWindow: { en: 'front right window', fr: 'fenêtre avant droite' },
  opening_rearLeftWindow: { en: 'rear left window', fr: 'fenêtre arrière gauche' },
  opening_rearRightWindow: { en: 'rear right window', fr: 'fenêtre arrière droite' },
  opening_sunroof: { en: 'sunroof', fr: 'toit ouvrant' },

  // commands
  command_lock: { en: 'Lock', fr: 'Verrouillage' },
  command_unlock: { en: 'Unlock', fr: 'Déverrouillage' },
  command_lock_reduced_guard: {
    en: 'Lock (reduced guard)',
    fr: 'Verrouillage (surveillance réduite)',
  },
  command_honk: { en: 'Honk', fr: 'Klaxon' },
  command_flash: { en: 'Flash', fr: 'Clignotement des feux' },
  command_honk_flash: { en: 'Honk and flash', fr: 'Klaxon et feux' },
  command_climatization_start: { en: 'Climate start', fr: 'Démarrage de la climatisation' },
  command_climatization_stop: { en: 'Climate stop', fr: 'Arrêt de la climatisation' },
  command_engine_start: { en: 'Engine start', fr: 'Démarrage du moteur' },
  command_engine_stop: { en: 'Engine stop', fr: 'Arrêt du moteur' },
  commandSent: {
    en: '{command}: sent to the car, it takes up to a minute.',
    fr: '{command} : envoyé à la voiture, cela peut prendre une minute.',
  },
  commandDone: { en: '{command}: done.', fr: '{command} : effectué.' },
  commandFailed: {
    en: '{command}: the car did not carry it out ({status}).',
    fr: '{command} : la voiture ne l’a pas exécuté ({status}).',
  },
  commandUnsupported: {
    en: '{command}: not offered by this car.',
    fr: '{command} : non proposé par cette voiture.',
  },

  // widget
  locked: { en: 'Locked', fr: 'Verrouillée' },
  unlocked: { en: 'Unlocked', fr: 'Déverrouillée' },
  lockState: { en: 'Lock', fr: 'Verrouillage' },
  openings: { en: 'Openings', fr: 'Ouvrants' },
  allClosed: { en: 'All closed', fr: 'Tout est fermé' },
  open: { en: '{list} open', fr: 'Ouvert : {list}' },
  engine: { en: 'Engine', fr: 'Moteur' },
  running: { en: 'Running', fr: 'En marche' },
  stopped: { en: 'Off', fr: 'Arrêté' },
  charging: { en: 'Charge', fr: 'Charge' },
  battery: { en: 'Battery', fr: 'Batterie' },
  range: { en: 'Range', fr: 'Autonomie' },
  fuel: { en: 'Fuel', fr: 'Carburant' },
  odometer: { en: 'Odometer', fr: 'Compteur' },
  service: { en: 'Service', fr: 'Entretien' },
  serviceIn: { en: 'in {km} km / {days} d', fr: 'dans {km} km / {days} j' },
  warnings: { en: 'Warnings', fr: 'Alertes' },
  connection: { en: 'Car', fr: 'Voiture' },
  updated: { en: 'Updated', fr: 'Mise à jour' },
  position: { en: 'Position', fr: 'Position' },
  atHome: { en: 'Home', fr: 'À la maison' },
  awayFrom: { en: '{km} km away', fr: 'À {km} km' },
  buttonLock: { en: 'Lock', fr: 'Verrouiller' },
  buttonUnlock: { en: 'Unlock', fr: 'Déverrouiller' },
  buttonClimateStart: { en: 'Start climate', fr: 'Climatiser' },
  buttonClimateStop: { en: 'Stop climate', fr: 'Arrêter la clim' },
  buttonFlash: { en: 'Flash lights', fr: 'Faire clignoter' },
  buttonMap: { en: 'Show on map', fr: 'Voir sur la carte' },
  noVehicle: {
    en: 'No Volvo found on this account yet.',
    fr: 'Aucune Volvo trouvée sur ce compte pour l’instant.',
  },
  notReady: {
    en: 'Finish the setup of the Volvo integration (API key, client, Connect).',
    fr: 'Terminez la configuration de l’intégration Volvo (clé d’API, client, Connecter).',
  },
  loading: {
    en: 'Reading the car… try again in a minute.',
    fr: 'Lecture de la voiture… réessayez dans une minute.',
  },
  ago_now: { en: 'just now', fr: 'à l’instant' },
  ago_minutes: { en: '{n} min ago', fr: 'il y a {n} min' },
  ago_hours: { en: '{n} h ago', fr: 'il y a {n} h' },
  ago_days: { en: '{n} d ago', fr: 'il y a {n} j' },

  // scene summaries
  summaryStatus: {
    en: '{car}: {lock}, {openings}. {energy}',
    fr: '{car} : {lock}, {openings}. {energy}',
  },
  summaryBattery: { en: 'Battery {level} %, {range} km.', fr: 'Batterie {level} %, {range} km.' },
  summaryFuel: { en: 'Fuel {liters} L, {range} km.', fr: 'Carburant {liters} L, {range} km.' },
  summaryLocked: { en: '{car} is locked.', fr: '{car} est verrouillée.' },
  summaryUnlocked: { en: '{car} is unlocked.', fr: '{car} est déverrouillée.' },
  summaryLeftOpen: {
    en: '{car} is locked but open: {list}.',
    fr: '{car} est verrouillée mais ouverte : {list}.',
  },
  summaryEngineStarted: { en: '{car}: engine started.', fr: '{car} : moteur démarré.' },
  summaryEngineStopped: { en: '{car}: engine stopped.', fr: '{car} : moteur arrêté.' },
  summaryCharging: { en: '{car}: {status} ({level} %).', fr: '{car} : {status} ({level} %).' },
  summaryPlugged: { en: '{car}: {status}.', fr: '{car} : {status}.' },
  summaryArrived: { en: '{car} arrived home.', fr: '{car} est arrivée à la maison.' },
  summaryLeft: { en: '{car} left home.', fr: '{car} a quitté la maison.' },
  summaryWarning: { en: '{car}: {warning}.', fr: '{car} : {warning}.' },
  summaryReauth: {
    en: 'Volvo ended the authorization of Gladys: click Connect again in the Volvo integration.',
    fr: 'Volvo a mis fin à l’autorisation de Gladys : cliquez de nouveau sur Connecter dans l’intégration Volvo.',
  },

  // connection status
  statusConnected: {
    en: 'Connected to Volvo: {count} car(s).',
    fr: 'Connecté à Volvo : {count} voiture(s).',
  },
  statusNoApiKey: {
    en: 'Enter the VCC API key of your Volvo developer application.',
    fr: 'Renseignez la clé d’API (VCC API key) de votre application développeur Volvo.',
  },
  statusNoClient: {
    en: 'Enter the client id and client secret of your published Volvo application.',
    fr: 'Renseignez l’identifiant et le secret client de votre application Volvo publiée.',
  },
  statusNotSignedIn: {
    en: 'Click Connect to sign in with your Volvo ID.',
    fr: 'Cliquez sur Connecter pour vous identifier avec votre Volvo ID.',
  },
  statusReauth: {
    en: 'Volvo ended the authorization: click Connect again.',
    fr: 'Volvo a mis fin à l’autorisation : cliquez de nouveau sur Connecter.',
  },
  statusInvalidApiKey: {
    en: 'Volvo refuses the API key or a scope: check the VCC API key and the scopes of the application.',
    fr: 'Volvo refuse la clé d’API ou une autorisation : vérifiez la VCC API key et les scopes de l’application.',
  },
  statusRateLimited: {
    en: 'Daily quota of the Volvo API reached; retrying later.',
    fr: 'Quota quotidien de l’API Volvo atteint ; nouvel essai plus tard.',
  },
  statusUnreachable: {
    en: 'The Volvo API cannot be reached; retrying.',
    fr: 'L’API Volvo est injoignable ; nouvel essai en cours.',
  },
};

/**
 * @description Pick a text in a language (English fallback), with `{name}`
 * substitutions.
 * @param {string} key - The TEXTS key.
 * @param {string} language - The language.
 * @param {object} [values] - The substitutions.
 * @returns {string} The text.
 * @example
 * t('summaryArrived', 'fr', { car: 'Volvo XC40' });
 */
function t(key, language, values = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    return key;
  }
  const template = entry[language] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/**
 * @description The text in every language, for a multi-language message.
 * @param {string} key - The TEXTS key.
 * @param {object} [values] - The substitutions.
 * @returns {{ en: string, fr: string }} The message.
 * @example
 * all('statusConnected', { count: 1 });
 */
function all(key, values = {}) {
  return { en: t(key, 'en', values), fr: t(key, 'fr', values) };
}

/**
 * @description The label of a warning key (vehicle.js readWarnings).
 * @param {string} warning - The key.
 * @param {string} language - The language.
 * @returns {string} The label.
 * @example
 * warningLabel('tyre:frontLeft', 'fr'); // -> 'Pneu avant gauche'
 */
function warningLabel(warning, language) {
  const key = `warning_${warning}`;
  return TEXTS[key] ? t(key, language) : t('warning_other', language);
}

/**
 * @description A list of openings, "front left door, tailgate".
 * @param {string[]} openings - The opening names.
 * @param {string} language - The language.
 * @returns {string} The list.
 */
function openingsLabel(openings, language) {
  return openings.map((name) => t(`opening_${name}`, language)).join(', ');
}

/**
 * @description "12 min ago" for an instant.
 * @param {number} instant - The instant, in ms.
 * @param {number} now - Now, in ms.
 * @param {string} language - The language.
 * @returns {string} The relative time.
 * @example
 * ago(Date.now() - 600000, Date.now(), 'en'); // -> '10 min ago'
 */
function ago(instant, now, language) {
  const minutes = Math.max(0, Math.floor((now - instant) / 60000));
  if (minutes < 1) {
    return t('ago_now', language);
  }
  if (minutes < 60) {
    return t('ago_minutes', language, { n: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('ago_hours', language, { n: hours });
  }
  return t('ago_days', language, { n: Math.floor(hours / 24) });
}

export { TEXTS, t, all, warningLabel, openingsLabel, ago };
