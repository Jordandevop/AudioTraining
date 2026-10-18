# AudioTraining — Cahier des charges et prompt pour Codex / Claude

## L'idée en bref

- **Pour qui :** ma femme, en reconversion pour devenir secrétaire médicale, et plus largement tous les étudiants en secrétariat médical.
- **Le problème :** pour s'entraîner à la retranscription, il faut des dictées audio (comptes rendus, courriers médicaux, ordonnances…). On en trouve peu, et elles ne correspondent pas toujours aux textes que l'on veut travailler.
- **La solution :** une petite application web où l'on colle n'importe quel texte. Elle le lit avec une voix française naturelle et produit un fichier MP3 à télécharger. On écoute ensuite ce MP3 et on retranscrit dans Word, comme en situation réelle.

## Déroulement d'utilisation

1. **Coller le texte** à travailler (compte rendu, courrier, etc.) dans le champ prévu.
2. **Choisir la voix et la vitesse** (plus lente au début, puis vitesse normale).
3. **Cliquer sur « Générer l'audio »** et attendre la fin de la génération.
4. **Écouter** le résultat dans le lecteur intégré et **télécharger le MP3**.
5. **Retranscrire** en écoutant le MP3 dans son lecteur habituel et en tapant dans Word.
6. **Comparer** sa retranscription avec le texte d'origine pour repérer ses erreurs.

---

## 1. Objectif du projet

Créer une petite application web appelée **AudioTraining** qui permet de coller un texte, de le transformer en une voix française naturelle et fluide, puis de télécharger le résultat en **fichier MP3**.

L'objectif principal est de créer des supports audio pour s'entraîner à la retranscription, notamment pour les étudiants en secrétariat médical. L'utilisateur écoute l'audio dans son application habituelle et retranscrit ce qu'il entend dans Word ou un autre traitement de texte.

Le projet doit rester simple, rapide à construire, facile à maintenir et accessible en ligne depuis n'importe quel ordinateur.

## 2. Priorité absolue : déploiement rapide et gratuit

**Je veux pouvoir mettre l'application en ligne rapidement, idéalement en moins d'une journée, et sans frais d'hébergement pour le MVP.** Choisir des technologies et des services qui simplifient au maximum le déploiement.

Contraintes de déploiement :
- Privilégier des offres gratuites réellement utilisables pour un prototype public.
- Minimiser le nombre de services à configurer et éviter toute infrastructure complexe.
- Prévoir des étapes de déploiement claires, adaptées à un développeur junior.
- Fournir un fichier `README.md` avec les commandes locales et une procédure de déploiement pas à pas.
- Utiliser des variables d'environnement pour les clés API et les URL.
- Ne jamais placer une clé API secrète dans le code frontend ou dans le dépôt Git.
- Vérifier les limites des hébergeurs gratuits : mise en veille, durée maximale des requêtes, stockage temporaire, limites de bande passante et disponibilité.
- Si le backend gratuit risque de se mettre en veille ou de couper la génération d'audios longs, proposer l'option gratuite la plus simple et documenter les compromis.
- Ne pas choisir un service payant obligatoire sans le signaler explicitement.

**Important : gratuit à héberger ne signifie pas nécessairement gratuit à générer.** Le fournisseur de synthèse vocale (TTS) peut facturer les caractères ou les minutes audio. Vérifier les tarifs et crédits gratuits actuels avant de choisir le fournisseur. Présenter clairement les éventuels coûts et, si possible, prévoir une solution alternative gratuite ou un mode de démonstration sans clé API. Ne jamais promettre une génération gratuite illimitée si elle n'est pas garantie.

## 3. Fonctionnalités MVP

### Interface utilisateur
Créer une interface moderne, sobre, professionnelle et responsive, en français, avec :
- Un champ de texte large pour coller ou saisir le texte à convertir.
- Un compteur de caractères et de mots.
- Une estimation indicative de la durée audio.
- Un choix de voix françaises disponibles (si le fournisseur le permet).
- Un réglage simple de vitesse de lecture si pris en charge.
- Un bouton « Générer l'audio ».
- Un indicateur de progression pendant la génération.
- Des messages d'erreur clairs et compréhensibles.
- Un lecteur audio HTML pour écouter le résultat.
- Un bouton « Télécharger le MP3 ».
- Une mise en page utilisable sur ordinateur et mobile.

### Audio
- Voix française naturelle, fluide et agréable à écouter.
- Priorité à une prononciation claire, adaptée aux exercices de retranscription.
- Durée cible : environ **5 à 10 minutes** selon le texte fourni.
- Le résultat doit être un fichier audio standard téléchargeable, idéalement en MP3.
- Pour les textes longs, découper le texte en segments compatibles avec les limites du fournisseur, puis les assembler proprement dans le bon ordre.
- L'assemblage doit produire un fichier audio valide, sans coupures brutales évitables ni segments manquants.
- Prévoir une estimation de durée raisonnable avant génération.

### Simplicité d'utilisation
- Aucun compte utilisateur.
- Aucune base de données pour le MVP.
- Aucun historique obligatoire.
- Ne pas conserver durablement les textes soumis ou les fichiers générés.
- L'application doit être utilisable directement depuis un navigateur.

## 4. Stack technique proposée

Privilégier une stack connue, simple et rapide à déployer.

### Frontend
- React
- TypeScript
- Vite
- CSS personnalisé, sans Tailwind CSS
- Interface accessible et responsive

### Backend
- Python
- FastAPI
- Validation des entrées
- Appel au fournisseur TTS depuis le serveur uniquement
- Génération audio en mémoire ou via des fichiers temporaires nettoyés après usage

### Fournisseur de voix
Étudier en premier un fournisseur TTS de qualité avec une voix française naturelle, par exemple l'API OpenAI Audio Speech, **après vérification de sa documentation, de ses modèles disponibles, de ses limites et de ses tarifs actuels**.

Ne pas coder en supposant que l'API est gratuite. Isoler le fournisseur derrière un petit module afin de pouvoir le remplacer sans réécrire toute l'application.

### Assemblage audio
- Vérifier si le fournisseur peut renvoyer directement du MP3.
- Si le texte doit être segmenté, assembler les segments sans les convertir inutilement.
- Si un outil externe comme FFmpeg est nécessaire, vérifier qu'il est disponible sur l'hébergeur gratuit choisi. Éviter toute dépendance qui rendrait le déploiement gratuit trop compliqué.
- Si nécessaire, choisir une méthode d'assemblage compatible avec l'environnement de déploiement.

## 5. API envisagée

### `GET /health`
Renvoie un statut simple pour vérifier que le backend fonctionne.

### `POST /api/audio/generate`
Reçoit le texte et les options nécessaires, génère l'audio, puis renvoie un fichier audio ou une réponse exploitable par le frontend.

À définir proprement :
- Schéma de requête et de réponse.
- Validation de la taille du texte.
- Gestion des erreurs du fournisseur.
- Gestion des limites de temps d'exécution de l'hébergeur.
- Type MIME correct et nom de fichier de téléchargement.
- Suppression des fichiers temporaires après utilisation.
- Messages d'erreur utiles pour l'utilisateur.

## 6. Sécurité et maîtrise des coûts

Même sans comptes utilisateurs :
- Garder toutes les clés secrètes côté backend, dans les variables d'environnement.
- Ajouter une limite de taille au texte.
- Ajouter une limite raisonnable de requêtes ou une protection anti-abus adaptée à un MVP public.
- Ne pas enregistrer le texte fourni dans les logs.
- Ne pas stocker durablement les textes ni les fichiers audio.
- Ne jamais exposer la clé TTS au navigateur.
- Configurer CORS pour le domaine frontend en production.
- Expliquer clairement à l'utilisateur si une limite de génération est atteinte.
- Prévoir un message clair si la clé API est absente ou si le fournisseur est indisponible.

## 7. Déploiement recommandé

Proposer d'abord **la voie la plus rapide et la plus simple vers une URL publique**, avec un hébergement gratuit pour le frontend et, si nécessaire, pour le backend.

Comparer brièvement les options pertinentes et leurs limites actuelles avant de trancher. Exemples à évaluer, sans supposer qu'ils sont toujours gratuits ni adaptés :
- Frontend : Vercel, Netlify ou Cloudflare Pages.
- Backend Python : une plateforme disposant d'une offre gratuite compatible avec FastAPI, ou une solution alternative simple.
- Déploiement combiné : une plateforme unique si elle permet réellement de faire fonctionner l'application avec moins de configuration.

Choisir une option principale, pas une longue liste d'alternatives. Le choix doit être guidé par :
1. Le coût initial nul ou le plus proche possible de zéro.
2. La rapidité de mise en ligne.
3. La compatibilité avec FastAPI et la génération de fichiers audio.
4. Les limites de durée des requêtes et la gestion des audios de 5 à 10 minutes.
5. La facilité de maintenance.

Fournir une procédure exacte :
1. Préparer le dépôt Git.
2. Ajouter les variables d'environnement nécessaires dans l'interface de l'hébergeur.
3. Déployer le backend.
4. Déployer le frontend et configurer l'URL du backend.
5. Tester la génération et le téléchargement d'un MP3.
6. Expliquer comment redéployer après une modification.

Ne pas prétendre qu'un déploiement est réussi sans l'avoir réellement vérifié. Documenter les éventuelles étapes nécessitant une carte bancaire ou une clé API payante.

## 8. Qualité et tests

Prévoir au minimum :
- Tests du backend avec le fournisseur TTS simulé (mock), afin de ne pas consommer de crédits lors des tests.
- Test d'un texte court.
- Test d'un texte long nécessitant plusieurs segments.
- Test de gestion d'une clé API manquante.
- Test d'une erreur ou d'un délai dépassé chez le fournisseur.
- Vérification du téléchargement du fichier audio.
- Vérification de la configuration CORS.
- Vérification du fonctionnement sur ordinateur et mobile.

## 9. Livrables attendus

Produire un projet complet et directement exploitable comprenant :
- Le code frontend.
- Le code backend.
- Un fichier `.env.example` sans secret réel.
- Un fichier `README.md` clair et complet.
- Les instructions d'installation locale.
- Les instructions de déploiement gratuit, étape par étape.
- Les variables d'environnement requises.
- Les tests essentiels.
- Une section expliquant les coûts éventuels du TTS et les limites des offres gratuites.
- Une section dépannage pour les erreurs courantes.

## 10. Méthode de travail demandée à Codex / Claude

1. Commencer par vérifier les documentations et limites actuelles des API et hébergeurs envisagés.
2. Proposer la solution la plus simple et la plus rapide à déployer gratuitement.
3. Signaler immédiatement les coûts potentiels et les obstacles techniques.
4. Construire un MVP fonctionnel avant d'ajouter des fonctionnalités secondaires.
5. Éviter la sur-ingénierie, les architectures complexes, les comptes utilisateurs et la base de données.
6. Utiliser des noms clairs, du code lisible et une structure de projet simple.
7. Exécuter les tests et corriger les erreurs.
8. Fournir les commandes exactes à exécuter, sans supposer que des outils ou des services sont déjà configurés.
9. Si une étape nécessite une action manuelle de ma part, expliquer précisément où cliquer et quoi renseigner.
10. À la fin, donner une checklist courte pour obtenir une première version publique le plus vite possible.

## 11. Déroulement du projet (étapes de réalisation)

| Étape | Contenu | Résultat attendu |
|---|---|---|
| **0. Vérifications** | Lire la doc et les tarifs actuels du fournisseur TTS (limite de caractères par requête, voix françaises, prix) et les limites de l'hébergeur gratuit (veille, durée max des requêtes). | Choix du fournisseur et de l'hébergeur, coûts connus à l'avance. |
| **1. Backend** | API FastAPI avec `GET /health` et `POST /api/audio/generate`, découpage du texte en segments, assemblage MP3, fournisseur TTS isolé dans un module + version simulée (mock). | Génération d'un MP3 en local. |
| **2. Frontend** | Interface React/Vite en français : zone de texte, compteurs, estimation de durée, voix, vitesse, bouton, progression, lecteur, téléchargement. | Application utilisable en local de bout en bout. |
| **3. Tests** | Tests avec le TTS simulé : texte court, texte long, clé absente, erreur/délai du fournisseur, téléchargement, CORS. | Tests au vert sans consommer de crédits. |
| **4. Déploiement** | Mise en ligne backend puis frontend, variables d'environnement, CORS de production, README pas à pas. | URL publique fonctionnelle, vérifiée avec un vrai MP3. |
| **5. Test réel** | Ma femme utilise l'application sur de vrais textes de cours et fait ses retours. | Liste des corrections et des priorités pour la V2. |

## 12. Idées pour une V2 (hors MVP, à ne pas développer tout de suite)

- **Mode « dictée lente »** : vitesse réduite et pauses plus longues entre les phrases pour les débutants.
- **Ponctuation dictée à l'oral** : option qui lit « virgule », « point », « à la ligne », « ouvrez la parenthèse »… comme dans une vraie dictée de médecin.
- **Correction automatique** : coller sa retranscription, la comparer au texte d'origine et afficher les différences (mots oubliés, fautes, ponctuation) avec un taux d'erreurs.
- **Bibliothèque de textes d'exemple** : comptes rendus, courriers et ordonnances types pour s'entraîner sans chercher de texte.
- **Prononciation des termes médicaux** : vérifier et, si besoin, corriger la lecture des abréviations et termes techniques (ex. « HTA », « ECG », dosages, unités).

## 13. Prompt à copier dans Codex ou Claude

Tu es un développeur full-stack expérimenté, pragmatique et spécialisé dans les MVP rapidement déployables.

Construis **AudioTraining**, une application web en français qui transforme un texte saisi par l'utilisateur en un fichier audio MP3 avec une voix française naturelle, pour permettre à des étudiants en secrétariat médical ou à d'autres utilisateurs de s'entraîner à la retranscription.

### Ma priorité numéro un
Je veux une application **mise en ligne rapidement et gratuitement autant que possible**. Choisis une solution d'hébergement gratuite adaptée au MVP et minimise les étapes de configuration. Vérifie les offres, quotas et limites actuels au lieu de les supposer. Distingue clairement le coût de l'hébergement du coût éventuel de l'API TTS : je ne veux pas de surprise de facturation. Si une génération gratuite illimitée n'est pas possible, dis-le clairement et propose la solution la moins chère et la plus simple, sans inventer de gratuité.

### Fonctionnalités
- Saisie/coller d'un texte.
- Compteur de mots et de caractères.
- Estimation de durée.
- Sélection de voix française si disponible et réglage de vitesse si pris en charge.
- Génération d'un audio d'environ 5 à 10 minutes selon le texte.
- Barre ou indicateur de progression.
- Lecteur audio intégré.
- Téléchargement du résultat en MP3.
- Interface responsive, propre, moderne et entièrement en français.
- Aucun compte et aucune base de données pour le MVP.
- Aucun stockage durable des textes ou fichiers.

### Contraintes techniques
- Frontend : React, TypeScript, Vite et CSS personnalisé, sans Tailwind.
- Backend : Python et FastAPI, sauf si une alternative nettement plus simple permet un déploiement gratuit et fiable ; explique toute modification de stack avant de l'adopter.
- La clé API TTS doit rester exclusivement côté serveur.
- Vérifie les limites du fournisseur TTS et découpe les textes longs en segments si nécessaire.
- Assemble les segments dans le bon ordre en un fichier audio valide.
- Vérifie la compatibilité de la solution avec les limites de temps d'exécution et les dépendances de l'hébergeur gratuit.
- Ajoute `GET /health` et `POST /api/audio/generate`.
- Valide les entrées, limite la taille des textes et gère proprement les erreurs.
- N'enregistre pas les textes dans les logs et nettoie les fichiers temporaires.
- Configure CORS pour la production.
- Ajoute `.env.example`, tests essentiels et README complet.

### Déploiement
Avant de coder, identifie l'option la plus simple pour déployer gratuitement le frontend et le backend. Compare seulement les solutions réellement pertinentes, vérifie les limites actuelles et choisis une option principale. Donne les étapes exactes pour :
1. Lancer le projet en local.
2. Créer/configurer les services nécessaires.
3. Renseigner les variables d'environnement.
4. Déployer le backend puis le frontend.
5. Tester l'application depuis son URL publique.
6. Redéployer une nouvelle version.

Ne suppose pas que je possède déjà un compte chez un hébergeur ou une clé API. Explique les éventuelles étapes manuelles de façon accessible à un développeur junior. N'exige pas de carte bancaire sans me prévenir. Ne déclare jamais que le déploiement est terminé sans vérification réelle.

### Tests et résultat attendu
- Écris des tests qui simulent l'API TTS afin de ne pas consommer de crédits.
- Teste les textes courts et longs, les erreurs de configuration et les erreurs du fournisseur.
- Fournis le code complet, les commandes à exécuter, les fichiers de configuration et une checklist de déploiement.
- Commence par le MVP le plus simple qui fonctionne. Pas de base de données, d'authentification, d'historique ou de fonctionnalités secondaires.
- Si un choix technique empêche une mise en ligne gratuite ou rapide, explique-le et propose une alternative avant de continuer.

Commence par me donner le plan d'implémentation et le choix de déploiement recommandé, avec les coûts et limites identifiés. Ensuite, implémente le projet de façon complète et vérifiable.
