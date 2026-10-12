// -----------------------------------------------------------------------------
// Texts of the integration, in English, French, German and Spanish (English
// fallback), the four languages of the Gladys interface.
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: device and feature names, text states, widget contents, scene
// summaries, messages of the Configuration screen.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de', 'es'];

const TEXTS = {
  // devices
  deviceName: {
    en: 'Volvo {model}',
    fr: 'Volvo {model}',
    de: 'Volvo {model}',
    es: 'Volvo {model}',
  },
  featureBatteryLevel: { en: 'Battery', fr: 'Batterie', de: 'Batterie', es: 'Batería' },
  featureBatteryRange: {
    en: 'Electric range',
    fr: 'Autonomie électrique',
    de: 'Elektrische Reichweite',
    es: 'Autonomía eléctrica',
  },
  featureBatteryEnergy: {
    en: 'Energy in the battery',
    fr: 'Énergie dans la batterie',
    de: 'Energie in der Batterie',
    es: 'Energía en la batería',
  },
  featurePlugged: {
    en: 'Charging cable plugged in',
    fr: 'Câble de charge branché',
    de: 'Ladekabel angeschlossen',
    es: 'Cable de carga enchufado',
  },
  featureChargingStatus: {
    en: 'Charging status',
    fr: 'État de la charge',
    de: 'Ladestatus',
    es: 'Estado de la carga',
  },
  featureChargePower: {
    en: 'Charging power',
    fr: 'Puissance de charge',
    de: 'Ladeleistung',
    es: 'Potencia de carga',
  },
  featureChargeCurrentLimit: {
    en: 'Charging current limit',
    fr: 'Limite du courant de charge',
    de: 'Ladestrombegrenzung',
    es: 'Límite de la corriente de carga',
  },
  featureTargetLevel: {
    en: 'Charge target',
    fr: 'Objectif de charge',
    de: 'Ladeziel',
    es: 'Objetivo de carga',
  },
  featureChargeTime: {
    en: 'Charging time left',
    fr: 'Temps de charge restant',
    de: 'Verbleibende Ladezeit',
    es: 'Tiempo de carga restante',
  },
  featureFuelAmount: { en: 'Fuel', fr: 'Carburant', de: 'Kraftstoff', es: 'Combustible' },
  featureFuelRange: {
    en: 'Fuel range',
    fr: 'Autonomie carburant',
    de: 'Kraftstoffreichweite',
    es: 'Autonomía de combustible',
  },
  featureAverageEnergy: {
    en: 'Average consumption',
    fr: 'Consommation moyenne',
    de: 'Durchschnittsverbrauch',
    es: 'Consumo medio',
  },
  featureOdometer: {
    en: 'Odometer',
    fr: 'Kilométrage',
    de: 'Kilometerstand',
    es: 'Cuentakilómetros',
  },
  featureLock: { en: 'Lock', fr: 'Verrouillage', de: 'Verriegelung', es: 'Bloqueo' },
  featureDoors: { en: 'Doors', fr: 'Portes', de: 'Türen', es: 'Puertas' },
  featureTailgate: { en: 'Tailgate', fr: 'Hayon', de: 'Heckklappe', es: 'Portón trasero' },
  featureHood: { en: 'Hood', fr: 'Capot', de: 'Motorhaube', es: 'Capó' },
  featureTankLid: {
    en: 'Tank lid',
    fr: 'Trappe à carburant',
    de: 'Tankklappe',
    es: 'Tapa del depósito',
  },
  featureWindows: { en: 'Windows', fr: 'Fenêtres', de: 'Fenster', es: 'Ventanillas' },
  featureSunroof: { en: 'Sunroof', fr: 'Toit ouvrant', de: 'Schiebedach', es: 'Techo solar' },
  featureClimate: { en: 'Climate', fr: 'Climatisation', de: 'Klimatisierung', es: 'Climatización' },
  featureHonk: { en: 'Honk', fr: 'Klaxon', de: 'Hupe', es: 'Claxon' },
  featureFlash: {
    en: 'Flash the lights',
    fr: 'Faire clignoter les feux',
    de: 'Lichter blinken lassen',
    es: 'Hacer parpadear las luces',
  },
  featureHonkFlash: {
    en: 'Honk and flash',
    fr: 'Klaxon et feux',
    de: 'Hupe und Licht',
    es: 'Claxon y luces',
  },
  featureServiceDistance: {
    en: 'Distance to service',
    fr: 'Distance avant l’entretien',
    de: 'Entfernung bis zur Wartung',
    es: 'Distancia hasta el mantenimiento',
  },
  featureServiceDays: {
    en: 'Time to service',
    fr: 'Délai avant l’entretien',
    de: 'Zeit bis zur Wartung',
    es: 'Tiempo hasta el mantenimiento',
  },
  featureWarnings: { en: 'Warnings', fr: 'Alertes', de: 'Warnungen', es: 'Alertas' },
  featureDistanceHome: {
    en: 'Distance from home',
    fr: 'Distance du domicile',
    de: 'Entfernung von zu Hause',
    es: 'Distancia desde casa',
  },

  // charge
  charge_charging: { en: 'Charging', fr: 'En charge', de: 'Lädt', es: 'Cargando' },
  charge_discharging: { en: 'Discharging', fr: 'En décharge', de: 'Entlädt', es: 'Descargando' },
  charge_done: {
    en: 'Charge complete',
    fr: 'Charge terminée',
    de: 'Laden abgeschlossen',
    es: 'Carga completada',
  },
  charge_error: {
    en: 'Charging error',
    fr: 'Erreur de charge',
    de: 'Ladefehler',
    es: 'Error de carga',
  },
  charge_idle: {
    en: 'Not charging',
    fr: 'Pas en charge',
    de: 'Lädt nicht',
    es: 'No está cargando',
  },
  charge_scheduled: {
    en: 'Charge scheduled',
    fr: 'Charge programmée',
    de: 'Laden geplant',
    es: 'Carga programada',
  },
  connection_connected: { en: 'Plugged in', fr: 'Branchée', de: 'Angeschlossen', es: 'Enchufado' },
  connection_disconnected: {
    en: 'Unplugged',
    fr: 'Débranchée',
    de: 'Nicht angeschlossen',
    es: 'Desenchufado',
  },
  connection_fault: {
    en: 'Charger fault',
    fr: 'Défaut du chargeur',
    de: 'Ladegerätfehler',
    es: 'Fallo del cargador',
  },

  // availability of the car
  availability_available: { en: 'Online', fr: 'En ligne', de: 'Online', es: 'En línea' },
  availability_unavailable: {
    en: 'Unavailable',
    fr: 'Indisponible',
    de: 'Nicht verfügbar',
    es: 'No disponible',
  },
  availability_car_in_use: {
    en: 'In use',
    fr: 'En cours d’utilisation',
    de: 'In Benutzung',
    es: 'En uso',
  },
  availability_no_internet: {
    en: 'No connection',
    fr: 'Sans connexion',
    de: 'Keine Verbindung',
    es: 'Sin conexión',
  },
  availability_ota_installation_in_progress: {
    en: 'Updating',
    fr: 'Mise à jour en cours',
    de: 'Wird aktualisiert',
    es: 'Actualizando',
  },
  availability_power_saving_mode: {
    en: 'Power saving',
    fr: 'Économie d’énergie',
    de: 'Energiesparmodus',
    es: 'Ahorro de energía',
  },

  // service
  service_ok: { en: 'Up to date', fr: 'À jour', de: 'Aktuell', es: 'Al día' },
  service_soon: { en: 'Soon', fr: 'Bientôt', de: 'Bald', es: 'Pronto' },
  service_due: { en: 'Due', fr: 'À faire', de: 'Fällig', es: 'Pendiente' },
  service_overdue: { en: 'Overdue', fr: 'En retard', de: 'Überfällig', es: 'Atrasado' },

  // warnings
  noWarning: { en: 'None', fr: 'Aucune', de: 'Keine', es: 'Ninguna' },
  warning_service: {
    en: 'Service due',
    fr: 'Entretien à prévoir',
    de: 'Wartung fällig',
    es: 'Mantenimiento pendiente',
  },
  warning_brakeFluidLevelWarning: {
    en: 'Brake fluid low',
    fr: 'Liquide de frein bas',
    de: 'Bremsflüssigkeit niedrig',
    es: 'Líquido de frenos bajo',
  },
  warning_oilLevelWarning: {
    en: 'Oil level',
    fr: 'Niveau d’huile',
    de: 'Ölstand',
    es: 'Nivel de aceite',
  },
  warning_engineCoolantLevelWarning: {
    en: 'Coolant low',
    fr: 'Liquide de refroidissement bas',
    de: 'Kühlmittel niedrig',
    es: 'Refrigerante bajo',
  },
  warning_washerFluidLevelWarning: {
    en: 'Washer fluid low',
    fr: 'Lave-glace bas',
    de: 'Waschwasser niedrig',
    es: 'Líquido limpiaparabrisas bajo',
  },
  'warning_tyre:frontLeft': {
    en: 'Front left tyre',
    fr: 'Pneu avant gauche',
    de: 'Reifen vorne links',
    es: 'Neumático delantero izquierdo',
  },
  'warning_tyre:frontRight': {
    en: 'Front right tyre',
    fr: 'Pneu avant droit',
    de: 'Reifen vorne rechts',
    es: 'Neumático delantero derecho',
  },
  'warning_tyre:rearLeft': {
    en: 'Rear left tyre',
    fr: 'Pneu arrière gauche',
    de: 'Reifen hinten links',
    es: 'Neumático trasero izquierdo',
  },
  'warning_tyre:rearRight': {
    en: 'Rear right tyre',
    fr: 'Pneu arrière droit',
    de: 'Reifen hinten rechts',
    es: 'Neumático trasero derecho',
  },
  warning_brakeLightCenterWarning: {
    en: 'Centre brake light',
    fr: 'Feu stop central',
    de: 'Mittlere Bremsleuchte',
    es: 'Luz de freno central',
  },
  warning_brakeLightLeftWarning: {
    en: 'Left brake light',
    fr: 'Feu stop gauche',
    de: 'Bremsleuchte links',
    es: 'Luz de freno izquierda',
  },
  warning_brakeLightRightWarning: {
    en: 'Right brake light',
    fr: 'Feu stop droit',
    de: 'Bremsleuchte rechts',
    es: 'Luz de freno derecha',
  },
  warning_daytimeRunningLightLeftWarning: {
    en: 'Left daytime light',
    fr: 'Feu de jour gauche',
    de: 'Tagfahrlicht links',
    es: 'Luz diurna izquierda',
  },
  warning_daytimeRunningLightRightWarning: {
    en: 'Right daytime light',
    fr: 'Feu de jour droit',
    de: 'Tagfahrlicht rechts',
    es: 'Luz diurna derecha',
  },
  warning_fogLightFrontWarning: {
    en: 'Front fog light',
    fr: 'Antibrouillard avant',
    de: 'Nebelscheinwerfer',
    es: 'Antiniebla delantero',
  },
  warning_fogLightRearWarning: {
    en: 'Rear fog light',
    fr: 'Antibrouillard arrière',
    de: 'Nebelschlussleuchte',
    es: 'Antiniebla trasero',
  },
  warning_hazardLightsWarning: {
    en: 'Hazard lights',
    fr: 'Feux de détresse',
    de: 'Warnblinkanlage',
    es: 'Luces de emergencia',
  },
  warning_highBeamLeftWarning: {
    en: 'Left high beam',
    fr: 'Feu de route gauche',
    de: 'Fernlicht links',
    es: 'Luz de carretera izquierda',
  },
  warning_highBeamRightWarning: {
    en: 'Right high beam',
    fr: 'Feu de route droit',
    de: 'Fernlicht rechts',
    es: 'Luz de carretera derecha',
  },
  warning_lowBeamLeftWarning: {
    en: 'Left low beam',
    fr: 'Feu de croisement gauche',
    de: 'Abblendlicht links',
    es: 'Luz de cruce izquierda',
  },
  warning_lowBeamRightWarning: {
    en: 'Right low beam',
    fr: 'Feu de croisement droit',
    de: 'Abblendlicht rechts',
    es: 'Luz de cruce derecha',
  },
  warning_positionLightFrontLeftWarning: {
    en: 'Front left position light',
    fr: 'Veilleuse avant gauche',
    de: 'Standlicht vorne links',
    es: 'Luz de posición delantera izquierda',
  },
  warning_positionLightFrontRightWarning: {
    en: 'Front right position light',
    fr: 'Veilleuse avant droite',
    de: 'Standlicht vorne rechts',
    es: 'Luz de posición delantera derecha',
  },
  warning_positionLightRearLeftWarning: {
    en: 'Rear left position light',
    fr: 'Veilleuse arrière gauche',
    de: 'Schlussleuchte hinten links',
    es: 'Luz de posición trasera izquierda',
  },
  warning_positionLightRearRightWarning: {
    en: 'Rear right position light',
    fr: 'Veilleuse arrière droite',
    de: 'Schlussleuchte hinten rechts',
    es: 'Luz de posición trasera derecha',
  },
  warning_registrationPlateLightWarning: {
    en: 'Plate light',
    fr: 'Éclairage de plaque',
    de: 'Kennzeichenbeleuchtung',
    es: 'Luz de matrícula',
  },
  warning_reverseLightsWarning: {
    en: 'Reverse lights',
    fr: 'Feux de recul',
    de: 'Rückfahrscheinwerfer',
    es: 'Luces de marcha atrás',
  },
  warning_sideMarkLightsWarning: {
    en: 'Side marker lights',
    fr: 'Feux de position latéraux',
    de: 'Seitenmarkierungsleuchten',
    es: 'Luces de posición laterales',
  },
  warning_turnIndicationFrontLeftWarning: {
    en: 'Front left indicator',
    fr: 'Clignotant avant gauche',
    de: 'Blinker vorne links',
    es: 'Intermitente delantero izquierdo',
  },
  warning_turnIndicationFrontRightWarning: {
    en: 'Front right indicator',
    fr: 'Clignotant avant droit',
    de: 'Blinker vorne rechts',
    es: 'Intermitente delantero derecho',
  },
  warning_turnIndicationRearLeftWarning: {
    en: 'Rear left indicator',
    fr: 'Clignotant arrière gauche',
    de: 'Blinker hinten links',
    es: 'Intermitente trasero izquierdo',
  },
  warning_turnIndicationRearRightWarning: {
    en: 'Rear right indicator',
    fr: 'Clignotant arrière droit',
    de: 'Blinker hinten rechts',
    es: 'Intermitente trasero derecho',
  },
  warning_other: {
    en: 'Bulb failure',
    fr: 'Ampoule défectueuse',
    de: 'Lampe defekt',
    es: 'Bombilla averiada',
  },

  // openings
  opening_frontLeftDoor: {
    en: 'front left door',
    fr: 'porte avant gauche',
    de: 'Tür vorne links',
    es: 'puerta delantera izquierda',
  },
  opening_frontRightDoor: {
    en: 'front right door',
    fr: 'porte avant droite',
    de: 'Tür vorne rechts',
    es: 'puerta delantera derecha',
  },
  opening_rearLeftDoor: {
    en: 'rear left door',
    fr: 'porte arrière gauche',
    de: 'Tür hinten links',
    es: 'puerta trasera izquierda',
  },
  opening_rearRightDoor: {
    en: 'rear right door',
    fr: 'porte arrière droite',
    de: 'Tür hinten rechts',
    es: 'puerta trasera derecha',
  },
  opening_tailgate: { en: 'tailgate', fr: 'hayon', de: 'Heckklappe', es: 'portón trasero' },
  opening_hood: { en: 'hood', fr: 'capot', de: 'Motorhaube', es: 'capó' },
  opening_tankLid: {
    en: 'tank lid',
    fr: 'trappe à carburant',
    de: 'Tankklappe',
    es: 'tapa del depósito',
  },
  opening_frontLeftWindow: {
    en: 'front left window',
    fr: 'fenêtre avant gauche',
    de: 'Fenster vorne links',
    es: 'ventanilla delantera izquierda',
  },
  opening_frontRightWindow: {
    en: 'front right window',
    fr: 'fenêtre avant droite',
    de: 'Fenster vorne rechts',
    es: 'ventanilla delantera derecha',
  },
  opening_rearLeftWindow: {
    en: 'rear left window',
    fr: 'fenêtre arrière gauche',
    de: 'Fenster hinten links',
    es: 'ventanilla trasera izquierda',
  },
  opening_rearRightWindow: {
    en: 'rear right window',
    fr: 'fenêtre arrière droite',
    de: 'Fenster hinten rechts',
    es: 'ventanilla trasera derecha',
  },
  opening_sunroof: { en: 'sunroof', fr: 'toit ouvrant', de: 'Schiebedach', es: 'techo solar' },

  // commands
  command_lock: { en: 'Lock', fr: 'Verrouillage', de: 'Verriegelung', es: 'Bloqueo' },
  command_unlock: { en: 'Unlock', fr: 'Déverrouillage', de: 'Entriegelung', es: 'Desbloqueo' },
  command_lock_reduced_guard: {
    en: 'Lock (reduced guard)',
    fr: 'Verrouillage (surveillance réduite)',
    de: 'Verriegelung (reduzierte Überwachung)',
    es: 'Bloqueo (vigilancia reducida)',
  },
  command_honk: { en: 'Honk', fr: 'Klaxon', de: 'Hupe', es: 'Claxon' },
  command_flash: {
    en: 'Flash',
    fr: 'Clignotement des feux',
    de: 'Lichtsignal',
    es: 'Parpadeo de las luces',
  },
  command_honk_flash: {
    en: 'Honk and flash',
    fr: 'Klaxon et feux',
    de: 'Hupe und Licht',
    es: 'Claxon y luces',
  },
  command_climatization_start: {
    en: 'Climate start',
    fr: 'Démarrage de la climatisation',
    de: 'Start der Klimatisierung',
    es: 'Inicio de la climatización',
  },
  command_climatization_stop: {
    en: 'Climate stop',
    fr: 'Arrêt de la climatisation',
    de: 'Stopp der Klimatisierung',
    es: 'Parada de la climatización',
  },
  command_engine_start: {
    en: 'Engine start',
    fr: 'Démarrage du moteur',
    de: 'Motorstart',
    es: 'Arranque del motor',
  },
  command_engine_stop: {
    en: 'Engine stop',
    fr: 'Arrêt du moteur',
    de: 'Motorstopp',
    es: 'Parada del motor',
  },
  commandSent: {
    en: '{command}: sent to the car, it takes up to a minute.',
    fr: '{command} : envoyé à la voiture, cela peut prendre une minute.',
    de: '{command}: an das Auto gesendet, dies kann bis zu einer Minute dauern.',
    es: '{command}: enviado al coche, puede tardar hasta un minuto.',
  },
  commandDone: {
    en: '{command}: done.',
    fr: '{command} : effectué.',
    de: '{command}: erledigt.',
    es: '{command}: completado.',
  },
  commandFailed: {
    en: '{command}: the car did not carry it out ({status}).',
    fr: '{command} : la voiture ne l’a pas exécuté ({status}).',
    de: '{command}: Das Auto hat den Befehl nicht ausgeführt ({status}).',
    es: '{command}: el coche no lo ha ejecutado ({status}).',
  },
  commandUnsupported: {
    en: '{command}: not offered by this car.',
    fr: '{command} : non proposé par cette voiture.',
    de: '{command}: von diesem Auto nicht angeboten.',
    es: '{command}: no disponible en este coche.',
  },
  commandCount: {
    en: '{count} commands',
    fr: '{count} commandes',
    de: '{count} Befehle',
    es: '{count} órdenes',
  },

  // widget
  locked: { en: 'Locked', fr: 'Verrouillée', de: 'Verriegelt', es: 'Bloqueado' },
  unlocked: { en: 'Unlocked', fr: 'Déverrouillée', de: 'Entriegelt', es: 'Desbloqueado' },
  lockState: { en: 'Lock', fr: 'Verrouillage', de: 'Verriegelung', es: 'Bloqueo' },
  openings: { en: 'Openings', fr: 'Ouvrants', de: 'Öffnungen', es: 'Aperturas' },
  allClosed: { en: 'All closed', fr: 'Tout est fermé', de: 'Alles zu', es: 'Todo cerrado' },
  open: { en: '{list} open', fr: 'Ouvert : {list}', de: '{list} offen', es: 'Abierto: {list}' },
  engine: { en: 'Engine', fr: 'Moteur', de: 'Motor', es: 'Motor' },
  running: { en: 'Running', fr: 'En marche', de: 'Läuft', es: 'En marcha' },
  stopped: { en: 'Off', fr: 'Arrêté', de: 'Aus', es: 'Apagado' },
  charging: { en: 'Charge', fr: 'Charge', de: 'Laden', es: 'Carga' },
  battery: { en: 'Battery', fr: 'Batterie', de: 'Batterie', es: 'Batería' },
  range: { en: 'Range', fr: 'Autonomie', de: 'Reichweite', es: 'Autonomía' },
  fuel: { en: 'Fuel', fr: 'Carburant', de: 'Kraftstoff', es: 'Combustible' },
  odometer: { en: 'Odometer', fr: 'Compteur', de: 'Kilometerstand', es: 'Cuentakilómetros' },
  service: { en: 'Service', fr: 'Entretien', de: 'Wartung', es: 'Mantenimiento' },
  serviceIn: {
    en: 'in {km} km / {days} d',
    fr: 'dans {km} km / {days} j',
    de: 'in {km} km / {days} T.',
    es: 'en {km} km / {days} d',
  },
  warnings: { en: 'Warnings', fr: 'Alertes', de: 'Warnungen', es: 'Alertas' },
  connection: { en: 'Car', fr: 'Voiture', de: 'Auto', es: 'Coche' },
  updated: { en: 'Updated', fr: 'Mise à jour', de: 'Aktualisiert', es: 'Actualizado' },
  position: { en: 'Position', fr: 'Position', de: 'Position', es: 'Posición' },
  atHome: { en: 'Home', fr: 'À la maison', de: 'Zu Hause', es: 'En casa' },
  awayFrom: { en: '{km} km away', fr: 'À {km} km', de: '{km} km entfernt', es: 'A {km} km' },
  buttonLock: { en: 'Lock', fr: 'Verrouiller', de: 'Verriegeln', es: 'Bloquear' },
  buttonUnlock: { en: 'Unlock', fr: 'Déverrouiller', de: 'Entriegeln', es: 'Desbloquear' },
  buttonClimateStart: { en: 'Start climate', fr: 'Climatiser', de: 'Klima an', es: 'Climatizar' },
  buttonClimateStop: {
    en: 'Stop climate',
    fr: 'Arrêter la clim',
    de: 'Klima aus',
    es: 'Parar clima',
  },
  buttonFlash: {
    en: 'Flash lights',
    fr: 'Faire clignoter',
    de: 'Lichtsignal',
    es: 'Ráfaga de luces',
  },
  buttonMap: {
    en: 'Show on map',
    fr: 'Voir sur la carte',
    de: 'Auf Karte zeigen',
    es: 'Ver en el mapa',
  },
  noVehicle: {
    en: 'No Volvo found on this account yet.',
    fr: 'Aucune Volvo trouvée sur ce compte pour l’instant.',
    de: 'Noch kein Volvo in diesem Konto gefunden.',
    es: 'Aún no se ha encontrado ningún Volvo en esta cuenta.',
  },
  notReady: {
    en: 'Finish the setup of the Volvo integration (API key, client, Connect).',
    fr: 'Terminez la configuration de l’intégration Volvo (clé d’API, client, Connecter).',
    de: 'Schließen Sie die Konfiguration der Volvo-Integration ab (API-Schlüssel, Client, Verbinden).',
    es: 'Termine la configuración de la integración Volvo (clave de API, cliente, Conectar).',
  },
  loading: {
    en: 'Reading the car… try again in a minute.',
    fr: 'Lecture de la voiture… réessayez dans une minute.',
    de: 'Das Auto wird ausgelesen… versuchen Sie es in einer Minute erneut.',
    es: 'Leyendo el coche… inténtelo de nuevo en un minuto.',
  },
  ago_now: { en: 'just now', fr: 'à l’instant', de: 'gerade eben', es: 'ahora mismo' },
  ago_minutes: { en: '{n} min ago', fr: 'il y a {n} min', de: 'vor {n} Min.', es: 'hace {n} min' },
  ago_hours: { en: '{n} h ago', fr: 'il y a {n} h', de: 'vor {n} Std.', es: 'hace {n} h' },
  ago_days: { en: '{n} d ago', fr: 'il y a {n} j', de: 'vor {n} T.', es: 'hace {n} d' },

  // scene summaries
  summaryStatus: {
    en: '{car}: {lock}, {openings}. {energy}',
    fr: '{car} : {lock}, {openings}. {energy}',
    de: '{car}: {lock}, {openings}. {energy}',
    es: '{car}: {lock}, {openings}. {energy}',
  },
  summaryBattery: {
    en: 'Battery {level} %, {range} km.',
    fr: 'Batterie {level} %, {range} km.',
    de: 'Batterie {level} %, {range} km.',
    es: 'Batería {level} %, {range} km.',
  },
  summaryFuel: {
    en: 'Fuel {liters} L, {range} km.',
    fr: 'Carburant {liters} L, {range} km.',
    de: 'Kraftstoff {liters} L, {range} km.',
    es: 'Combustible {liters} L, {range} km.',
  },
  summaryLocked: {
    en: '{car} is locked.',
    fr: '{car} est verrouillée.',
    de: '{car} ist verriegelt.',
    es: '{car} está bloqueado.',
  },
  summaryUnlocked: {
    en: '{car} is unlocked.',
    fr: '{car} est déverrouillée.',
    de: '{car} ist entriegelt.',
    es: '{car} está desbloqueado.',
  },
  summaryLeftOpen: {
    en: '{car} is locked but open: {list}.',
    fr: '{car} est verrouillée mais ouverte : {list}.',
    de: '{car} ist verriegelt, aber offen: {list}.',
    es: '{car} está bloqueado pero abierto: {list}.',
  },
  summaryEngineStarted: {
    en: '{car}: engine started.',
    fr: '{car} : moteur démarré.',
    de: '{car}: Motor gestartet.',
    es: '{car}: motor arrancado.',
  },
  summaryEngineStopped: {
    en: '{car}: engine stopped.',
    fr: '{car} : moteur arrêté.',
    de: '{car}: Motor abgestellt.',
    es: '{car}: motor apagado.',
  },
  summaryCharging: {
    en: '{car}: {status} ({level} %).',
    fr: '{car} : {status} ({level} %).',
    de: '{car}: {status} ({level} %).',
    es: '{car}: {status} ({level} %).',
  },
  summaryPlugged: {
    en: '{car}: {status}.',
    fr: '{car} : {status}.',
    de: '{car}: {status}.',
    es: '{car}: {status}.',
  },
  summaryArrived: {
    en: '{car} arrived home.',
    fr: '{car} est arrivée à la maison.',
    de: '{car} ist zu Hause angekommen.',
    es: '{car} ha llegado a casa.',
  },
  summaryLeft: {
    en: '{car} left home.',
    fr: '{car} a quitté la maison.',
    de: '{car} hat das Zuhause verlassen.',
    es: '{car} ha salido de casa.',
  },
  summaryWarning: {
    en: '{car}: {warning}.',
    fr: '{car} : {warning}.',
    de: '{car}: {warning}.',
    es: '{car}: {warning}.',
  },
  summaryReauth: {
    en: 'Volvo ended the authorization of Gladys: click Connect again in the Volvo integration.',
    fr: 'Volvo a mis fin à l’autorisation de Gladys : cliquez de nouveau sur Connecter dans l’intégration Volvo.',
    de: 'Volvo hat die Autorisierung von Gladys beendet: Klicken Sie in der Volvo-Integration erneut auf Verbinden.',
    es: 'Volvo ha revocado la autorización de Gladys: vuelva a hacer clic en Conectar en la integración Volvo.',
  },

  // connection status
  statusConnected: {
    en: 'Connected to Volvo: {count} car(s).',
    fr: 'Connecté à Volvo : {count} voiture(s).',
    de: 'Mit Volvo verbunden: {count} Auto(s).',
    es: 'Conectado a Volvo: {count} coche(s).',
  },
  statusNoApiKey: {
    en: 'Enter the VCC API key of your Volvo developer application.',
    fr: 'Renseignez la clé d’API (VCC API key) de votre application développeur Volvo.',
    de: 'Geben Sie den VCC API key Ihrer Volvo-Entwickleranwendung ein.',
    es: 'Introduzca la VCC API key de su aplicación de desarrollador de Volvo.',
  },
  statusNoClient: {
    en: 'Enter the client id and client secret of your published Volvo application.',
    fr: 'Renseignez l’identifiant et le secret client de votre application Volvo publiée.',
    de: 'Geben Sie die Client-ID und das Client-Secret Ihrer veröffentlichten Volvo-Anwendung ein.',
    es: 'Introduzca el ID de cliente y el secreto de cliente de su aplicación Volvo publicada.',
  },
  statusNotSignedIn: {
    en: 'Click Connect to sign in with your Volvo ID.',
    fr: 'Cliquez sur Connecter pour vous identifier avec votre Volvo ID.',
    de: 'Klicken Sie auf Verbinden, um sich mit Ihrer Volvo ID anzumelden.',
    es: 'Haga clic en Conectar para iniciar sesión con su Volvo ID.',
  },
  statusReauth: {
    en: 'Volvo ended the authorization: click Connect again.',
    fr: 'Volvo a mis fin à l’autorisation : cliquez de nouveau sur Connecter.',
    de: 'Volvo hat die Autorisierung beendet: Klicken Sie erneut auf Verbinden.',
    es: 'Volvo ha revocado la autorización: vuelva a hacer clic en Conectar.',
  },
  statusInvalidApiKey: {
    en: 'Volvo refuses the API key or a scope: check the VCC API key and the scopes of the application.',
    fr: 'Volvo refuse la clé d’API ou une autorisation : vérifiez la VCC API key et les scopes de l’application.',
    de: 'Volvo lehnt den API-Schlüssel oder einen Scope ab: Prüfen Sie den VCC API key und die Scopes der Anwendung.',
    es: 'Volvo rechaza la clave de API o un scope: compruebe la VCC API key y los scopes de la aplicación.',
  },
  statusRateLimited: {
    en: 'Daily quota of the Volvo API reached; retrying later.',
    fr: 'Quota quotidien de l’API Volvo atteint ; nouvel essai plus tard.',
    de: 'Tageskontingent der Volvo-API erreicht; neuer Versuch später.',
    es: 'Cuota diaria de la API de Volvo alcanzada; se reintentará más tarde.',
  },
  statusUnreachable: {
    en: 'The Volvo API cannot be reached; retrying.',
    fr: 'L’API Volvo est injoignable ; nouvel essai en cours.',
    de: 'Die Volvo-API ist nicht erreichbar; neuer Versuch läuft.',
    es: 'No se puede acceder a la API de Volvo; reintentando.',
  },

  // Configuration screen actions
  testConnected: {
    en: 'Connected. {list}',
    fr: 'Connecté. {list}',
    de: 'Verbunden. {list}',
    es: 'Conectado. {list}',
  },
  disconnected: {
    en: 'Disconnected. You can also revoke the access of the application on the Volvo developer portal.',
    fr: 'Déconnecté. Vous pouvez aussi révoquer l’accès de l’application sur le portail développeur Volvo.',
    de: 'Getrennt. Sie können den Zugriff der Anwendung auch im Volvo-Entwicklerportal widerrufen.',
    es: 'Desconectado. También puede revocar el acceso de la aplicación en el portal para desarrolladores de Volvo.',
  },

  // transport badge (degraded), 200 characters at most
  transport_no_internet: {
    en: 'The car has no connection: the values may be old and the commands wait.',
    fr: 'La voiture n’a pas de connexion : les valeurs peuvent dater et les commandes attendent.',
    de: 'Das Auto hat keine Verbindung: Die Werte können veraltet sein und die Befehle warten.',
    es: 'El coche no tiene conexión: los valores pueden estar desactualizados y las órdenes quedan en espera.',
  },
  transport_car_in_use: {
    en: 'The car is in use: remote commands are unavailable.',
    fr: 'La voiture est en cours d’utilisation : les commandes à distance sont indisponibles.',
    de: 'Das Auto wird gerade benutzt: Fernbefehle sind nicht verfügbar.',
    es: 'El coche está en uso: las órdenes remotas no están disponibles.',
  },
  transport_power_saving_mode: {
    en: 'The car is in power saving mode: remote commands are unavailable.',
    fr: 'La voiture est en mode économie d’énergie : les commandes à distance sont indisponibles.',
    de: 'Das Auto ist im Energiesparmodus: Fernbefehle sind nicht verfügbar.',
    es: 'El coche está en modo de ahorro de energía: las órdenes remotas no están disponibles.',
  },
  transport_ota_installation_in_progress: {
    en: 'A software update is being installed: remote commands are unavailable.',
    fr: 'Une mise à jour logicielle est en cours d’installation : les commandes à distance sont indisponibles.',
    de: 'Ein Software-Update wird installiert: Fernbefehle sind nicht verfügbar.',
    es: 'Se está instalando una actualización de software: las órdenes remotas no están disponibles.',
  },
  transport_unavailable: {
    en: 'Volvo says the car cannot run remote commands right now.',
    fr: 'Volvo indique que la voiture ne peut pas exécuter de commandes à distance pour l’instant.',
    de: 'Laut Volvo kann das Auto derzeit keine Fernbefehle ausführen.',
    es: 'Según Volvo, el coche no puede ejecutar órdenes remotas en este momento.',
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
 * @description A multi-language message built language by language.
 * @param {Function} build - `(language) => string`.
 * @returns {{ en: string, fr: string, de: string, es: string }} The message.
 * @example
 * each((lang) => t('commandSent', lang, { command: t('command_lock', lang) }));
 */
function each(build) {
  return Object.fromEntries(LANGUAGES.map((language) => [language, build(language)]));
}

/**
 * @description The text in every language, for a multi-language message.
 * @param {string} key - The TEXTS key.
 * @param {object} [values] - The substitutions.
 * @returns {{ en: string, fr: string, de: string, es: string }} The message.
 * @example
 * all('statusConnected', { count: 1 });
 */
function all(key, values = {}) {
  return each((language) => t(key, language, values));
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

export { LANGUAGES, TEXTS, t, all, each, warningLabel, openingsLabel, ago };
