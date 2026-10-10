# Volvo

Cette intégration amène votre **Volvo** dans Gladys grâce aux API officielles de Volvo Cars : batterie ou carburant, autonomie, charge, verrouillage, portes et fenêtres, climatisation, position, entretien et alertes. Elle propose aussi des scènes (voiture déverrouillée, laissée ouverte, charge terminée, arrivée à la maison…) et un widget de tableau de bord avec la photo de votre voiture.

Voitures compatibles : modèles à partir de 2010 dont l'application Volvo Cars fonctionne, en Europe, Moyen-Orient, Afrique, États-Unis, Canada et Amérique latine ([liste des pays](https://developer.volvocars.com/terms-and-conditions/apis-supported-locations/)). Les informations disponibles dépendent du modèle, de l'année et du pays.

> Intégration communautaire, sans lien avec Volvo Cars.

## Configuration

La mise en place prend une dizaine de minutes, une seule fois. Elle se fait sur le **portail développeur Volvo**, avec le Volvo ID de votre voiture (celui de l'application Volvo Cars).

### 1. Créer une application d'API

1. Ouvrez le [portail développeur Volvo](https://developer.volvocars.com/), créez un compte ou connectez-vous avec votre Volvo ID.
2. Allez dans [Mes applications d'API](https://developer.volvocars.com/account/#your-api-applications) et créez une **API application** (nom libre, par exemple « Gladys »).
3. Copiez sa **VCC API key** (la clé primaire) dans le champ du même nom de l'intégration.

Chaque application a un **quota de requêtes quotidien** : si vous avez plusieurs voitures, le plus confortable est d'utiliser une application par voiture (et donc une installation par compte), ou d'augmenter l'intervalle de lecture.

### 2. Publier l'application

C'est ce qui permet à Gladys de se connecter avec votre Volvo ID.

1. Sous votre application, cliquez sur **Publish**.
2. Remplissez le formulaire. Deux points importants :
   - **Scopes** : cochez-les **tous** (dépliez chaque section). Un scope manquant fait échouer la connexion.
   - **Redirect URI** : ajoutez l'adresse affichée par Gladys à côté du bouton **Connecter** de l'intégration (par défaut `https://my.gladysassistant.com/redirect/oauth`). Volvo n'accepte que des adresses HTTPS : cette page de Gladys renvoie votre navigateur vers votre instance, même si vous y accédez en `http://` sur votre réseau local.
3. Cliquez sur **View summary**, puis confirmez.
4. Copiez le **client ID** et le **client secret** affichés dans les champs du même nom de l'intégration, puis **enregistrez**.

### 3. Se connecter

1. Cliquez sur **Connecter** : la page Volvo ID s'ouvre.
2. Identifiez-vous (Volvo envoie un code par e-mail) et autorisez l'accès.
3. Vous revenez sur Gladys : l'écran de configuration indique « Connecté à Volvo : 1 voiture(s) ».

Le bouton **Tester la connexion** vérifie la clé et la connexion, et liste les voitures du compte.

### Options

| Champ                     | Rôle                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Intervalle de lecture** | 5 minutes par défaut (de 2 à 60) : verrouillage, portes, batterie, charge, position. C'est aussi le délai de réaction des scènes |
| **Rayon du domicile**     | 200 m par défaut : en dessous, la voiture est « à la maison » (distance du domicile, scènes d'arrivée et de départ)              |

L'entretien, les alertes, le kilométrage et la pression des pneus sont lus toutes les 30 minutes. À 5 minutes, comptez environ 2 000 requêtes par jour et par voiture.

### Renouveler la connexion

Volvo limite dans le temps l'autorisation d'une application publiée pour un usage personnel. Quand elle prend fin, Gladys arrête la lecture, l'écran de configuration affiche « Volvo a mis fin à l'autorisation » et le déclencheur **Volvo : reconnexion nécessaire** se déclenche (pratique pour recevoir une notification). Il suffit de cliquer de nouveau sur **Connecter**.

## Ajouter la voiture

Dans l'onglet **Découverte**, chaque voiture du compte apparaît comme un appareil « Volvo _modèle_ (_année_) ». Ajoutez-le et placez-le dans une pièce. Le widget et les scènes fonctionnent aussi sans appareil, mais le choix de la voiture dans leurs réglages passe par la liste des appareils.

Les fonctionnalités dépendent de ce que la voiture transmet : une thermique n'a ni batterie ni charge, une voiture sans toit ouvrant n'a pas de toit ouvrant. Si une valeur manque juste après l'installation (voiture jamais démarrée depuis), relancez une découverte plus tard.

## Les fonctionnalités de la voiture

| Fonctionnalité                                              | Valeur                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Batterie**, **Autonomie électrique**                      | électriques et hybrides rechargeables                                                   |
| **Énergie dans la batterie**                                | calculée à partir de la capacité de la batterie                                         |
| **Câble de charge branché**, **État de la charge**          | branché ou non ; en charge, charge terminée, programmée…                                |
| **Puissance de charge**, **Temps de charge restant**        | selon le modèle                                                                         |
| **Objectif de charge**, **Limite du courant de charge**     | en lecture seule : Volvo ne permet pas de les modifier                                  |
| **Carburant**, **Autonomie carburant**                      | thermiques et hybrides                                                                  |
| **Consommation moyenne**                                    | kWh/100 km, depuis la remise à zéro du trajet                                           |
| **Kilométrage**                                             | compteur kilométrique                                                                   |
| **Verrouillage**                                            | 1 = verrouillée ; se pilote depuis Gladys quand la voiture le permet                    |
| **Portes**, **Hayon**, **Capot**, **Trappe à carburant**    | 1 = ouvert ; « Portes » regroupe les quatre portes                                      |
| **Fenêtres**, **Toit ouvrant**                              | 1 = ouvert ; « Fenêtres » regroupe les quatre vitres                                    |
| **Climatisation**                                           | démarre ou arrête la climatisation à distance (voir ci-dessous)                         |
| **Distance avant l'entretien**, **Délai avant l'entretien** | en km et en jours                                                                       |
| **Alertes**                                                 | texte : « Aucune », ou la liste (pneu, niveau d'huile, lave-glace, ampoule, entretien…) |
| **Distance du domicile**                                    | en km, si la voiture transmet sa position et si votre maison est localisée dans Gladys  |

L'historique est conservé : graphique du niveau de batterie, du kilométrage… Les scènes classiques sur la valeur d'un appareil fonctionnent (« batterie sous 20 % », « fenêtre ouverte »…).

**Climatisation** : Volvo ne dit pas si la climatisation tourne. Gladys affiche donc la dernière commande, et repasse à l'arrêt au bout de 30 minutes.

**Commandes** : Volvo répond une fois que la voiture a exécuté l'ordre, ce qui peut prendre jusqu'à une minute (voiture en veille). Gladys envoie la commande en arrière-plan et met la voiture à jour une vingtaine de secondes après.

## Scènes : déclencheurs

Dans l'éditeur de scène, rubrique **Volvo** (chacun peut se limiter à une voiture) :

| Déclencheur                                      | Se déclenche quand…                                                                                  | Filtre              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------- |
| **Volvo : verrouillée ou déverrouillée**         | la voiture est verrouillée ou déverrouillée                                                          | nouvel état         |
| **Volvo : verrouillée mais ouverte**             | la voiture est verrouillée alors qu'une porte, une fenêtre, le toit, le hayon ou le capot est ouvert | —                   |
| **Volvo : moteur démarré ou arrêté**             | le moteur démarre ou s'arrête                                                                        | démarré / arrêté    |
| **Volvo : état de la charge modifié**            | la charge démarre, se termine, s'arrête, est programmée ou échoue                                    | nouvel état         |
| **Volvo : câble de charge branché ou débranché** | le câble est branché ou débranché                                                                    | branché / débranché |
| **Volvo : arrivée ou départ de la maison**       | la voiture entre dans le rayon du domicile ou en sort                                                | arrivée / départ    |
| **Volvo : nouvelle alerte**                      | une nouvelle alerte apparaît (pneu, liquide, ampoule, entretien)                                     | —                   |
| **Volvo : reconnexion nécessaire**               | Volvo a mis fin à l'autorisation de Gladys                                                           | —                   |

Chaque déclencheur fournit un **résumé** prêt à envoyer (« Volvo XC40 (2024) est verrouillée mais ouverte : fenêtre avant gauche. ») et des informations propres : ce qui est ouvert, niveau de batterie, distance du domicile, nom de l'alerte…

Exemples :

- **Verrouillée mais ouverte** → m'envoyer une notification avec le résumé ;
- **Arrivée à la maison** → ouvrir le portail et allumer l'éclairage extérieur ;
- **Charge terminée** → me prévenir ;
- **Reconnexion nécessaire** → m'envoyer un message pour penser à cliquer sur Connecter.

Bon à savoir : Volvo ne pousse rien, l'intégration lit la voiture à l'intervalle choisi. Une scène réagit donc avec quelques minutes de décalage. Au démarrage de l'intégration, la première lecture sert de référence : une voiture déjà déverrouillée ne déclenche rien.

## Scènes : actions

| Action                           | Résultat                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Volvo : envoyer une commande** | verrouiller, déverrouiller (surveillance réduite possible), climatiser, faire clignoter, klaxonner, démarrer ou arrêter le moteur ; attend la voiture et indique si la commande a été exécutée |
| **Volvo : état de la voiture**   | verrouillée, tout fermé, ce qui est ouvert, batterie, carburant, autonomies, charge, moteur, kilométrage, à la maison, distance, latitude, longitude, lien vers la carte, alertes, résumé      |

Une commande que la voiture ne propose pas (par exemple le démarrage du moteur sur une électrique) est refusée. L'état utilise la dernière lecture ; cochez **Lire la voiture maintenant** pour une valeur fraîche (cela consomme du quota).

Prudence avec **klaxonner** et **faire clignoter** : ces commandes ont déjà vidé la batterie 12 V de certaines voitures. L'intégration ne les envoie jamais d'elle-même.

## Widget de tableau de bord

Le widget **Voiture Volvo** affiche la photo de votre voiture (modèle et couleur exacts), la batterie ou le carburant et l'autonomie, puis l'état : verrouillage, ouvrants, charge, moteur, position, entretien, alertes et l'âge des données. Ses boutons : **Verrouiller** / **Déverrouiller** (avec confirmation), **Climatiser** / **Arrêter la clim**, **Faire clignoter** (pour retrouver la voiture sur un parking, avec confirmation) et **Voir sur la carte**. Les boutons peuvent être masqués dans les réglages du widget.

## Dépannage

| Symptôme                                            | Cause probable                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| La page Volvo ID affiche une erreur de redirect URI | l'adresse de redirection déclarée lors de la publication ne correspond pas exactement à celle affichée par Gladys                      |
| La page Volvo ID refuse les scopes                  | tous les scopes n'ont pas été cochés lors de la publication                                                                            |
| « Volvo refuse la clé d'API »                       | VCC API key mal copiée, ou application sans les scopes nécessaires                                                                     |
| « Quota quotidien de l'API Volvo atteint »          | trop de requêtes pour une seule application : augmentez l'intervalle de lecture ou créez une application par voiture                   |
| « Volvo a mis fin à l'autorisation »                | fin de la période d'autorisation de l'application : cliquez sur Connecter                                                              |
| Pas de position ni de distance du domicile          | la position n'est pas disponible dans votre pays, ou votre maison n'est pas localisée dans Gladys                                      |
| Une commande reste sans effet                       | voiture en veille profonde ou sans réseau : la commande échoue au bout d'un moment ; les journaux de l'intégration indiquent le statut |
