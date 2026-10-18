# AudioTraining

Application web qui transforme un texte collé en **dictée audio MP3** avec une voix française naturelle, pour s'entraîner à la retranscription (secrétariat médical).

- Lecture de la ponctuation comme un médecin (« virgule », « point à la ligne », « ouvrez la parenthèse »…), désactivable.
- Vitesse réglable et pause entre les phrases (le temps de taper).
- Écoute d'un extrait (les 2 premières phrases ou le passage sélectionné) pour ajuster les réglages avant de générer. L'extrait se met à jour tout seul à chaque changement de réglage, et un bouton « Réinitialiser » revient aux réglages de base.
- Lecteur intégré et téléchargement du MP3.
- Aucun compte, aucune base de données, aucun texte ni fichier conservé.

## Coûts et limites

| Poste | Choix | Coût |
|---|---|---|
| Voix (TTS) | Voix neuronales Microsoft Edge via la bibliothèque [`edge-tts`](https://github.com/rany2/edge-tts) | **0 €**, sans clé API |
| Hébergement | [Render](https://render.com), service web **Free** (API + site sur une seule URL) | **0 €**, sans carte bancaire |

À savoir avant de compter dessus :

- **Voix Edge : gratuite mais non officielle.** `edge-tts` utilise le service de lecture à voix haute du navigateur Edge. Il n'y a ni garantie de service ni quota publié : Microsoft peut le limiter ou le couper à tout moment. Si cela arrive, l'application affiche « Le service de voix est momentanément indisponible ». Le fournisseur est isolé dans `backend/app/tts/`, ce qui permet de le remplacer par une API payante (OpenAI, Azure, Google…) sans toucher au reste.
- **Render Free se met en veille** après 15 minutes sans visite. La première visite suivante prend environ une minute (le site affiche « Réveil du serveur en cours… »).
- **750 heures d'instance gratuites par mois et par compte**, ce qui suffit pour un service allumé en permanence. Sans moyen de paiement enregistré, un dépassement (heures, bande passante) **suspend** le service jusqu'au mois suivant : il n'y a **pas de facturation surprise**. Un MP3 de 10 minutes pèse environ 3,6 Mo.
- Le disque est éphémère : c'est sans importance, rien n'y est écrit (tout se fait en mémoire).
- Limites anti-abus réglables : 15 000 caractères par texte (environ 15 à 20 minutes de dictée) et 20 générations par heure et par IP.

## Sécurité et cadre légal

**Protections en place :**
- Aucune clé secrète : rien à protéger dans le dépôt. `.env` est exclu de Git.
- Les textes ne sont ni stockés ni journalisés : tout se passe en mémoire.
- Limites par adresse IP : 20 générations et 120 extraits par heure.
- Plafonds globaux : 300 générations et 1 500 extraits par heure, tous visiteurs confondus.
- Au plus 3 générations complètes simultanées.
- Requêtes de plus de 90 Ko environ refusées (413), avant lecture complète, pour protéger la mémoire du serveur gratuit.
- En-têtes de sécurité sur toutes les réponses : politique de contenu stricte (CSP), anti-iframe, `nosniff`, HSTS, `Referrer-Policy`.
- Documentation de l'API désactivée par défaut, entrées validées (voix en liste blanche, bornes sur la vitesse et la pause), conteneur exécuté sans droits administrateur.
- `npm audit` et `pip-audit` : aucune vulnérabilité connue au 18 octobre 2026.

**Côté légal :**
- Pages [mentions légales](frontend/public/mentions-legales.html) et [confidentialité](frontend/public/confidentialite.html), liées dans le pied de page. L'éditeur est un particulier anonyme (LCEN, art. 6-III-2).
- Avertissement visible sous le champ de texte : utiliser uniquement des textes fictifs ou anonymisés, jamais de données réelles de patients, car le texte part chez Microsoft.
- Aucun cookie ni traceur, donc aucun bandeau de consentement à prévoir.
- Code sous « tous droits réservés » (voir [LICENSE](LICENSE)). `edge-tts` est sous LGPL v3 : il est utilisé tel quel, sans modification ni redistribution.

**Limite connue :** `edge-tts` utilise un service de Microsoft qui n'est pas une API officielle. Son usage personnel semble toléré, mais aucune autorisation explicite n'existe, et Microsoft peut le bloquer à tout moment.

## Lancer le projet en local

Prérequis : Python 3.12 et Node.js 22 ou plus récent.

### En une commande

```bash
./dev.sh
```

Le script installe ce qui manque au premier lancement, démarre le serveur et le site, puis ouvre http://localhost:5173 dans le navigateur. **Ctrl+C** arrête tout.

### Ou séparément

#### Backend (terminal 1)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --env-file .env
```

L'API répond sur http://localhost:8000/health. Pour la documentation interactive (http://localhost:8000/api/docs), mettez `ENABLE_API_DOCS=true` dans `.env`. Elle est désactivée par défaut, donc en production.

Pour travailler sans réseau, mettez `TTS_PROVIDER=fake` dans `.env` : l'audio produit est alors du silence.

#### Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Ouvrez http://localhost:5173. Les appels `/api` sont relayés vers le backend.

### Tests

```bash
cd backend && source .venv/bin/activate && pytest     # fournisseur de voix simulé : aucun appel réseau
cd frontend && npm run lint && npm run build
```

### Tester l'image de production (facultatif, nécessite Docker)

```bash
docker build -t audiotraining .
docker run --rm -p 8000:8000 audiotraining
```

Puis ouvrez http://localhost:8000.

## API

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/health` | `{"status": "ok"}` |
| `GET` | `/api/voices` | Voix disponibles, voix par défaut, taille maximale du texte |
| `POST` | `/api/audio/generate` | Renvoie le MP3 (`audio/mpeg`, `Content-Disposition: attachment; filename="dictee-AAAAMMJJ-HHMM.mp3"`) |
| `POST` | `/api/audio/preview` | Même corps de requête : renvoie l'extrait des 2 premières phrases (300 caractères maximum chacune), à écouter dans la page |

Corps de `POST /api/audio/generate` :

```json
{
  "text": "Madame Dupont, 54 ans, consulte pour…",
  "voice": "fr-FR-DeniseNeural",
  "rate": -10,
  "read_punctuation": true,
  "pause_seconds": 2
}
```

- `rate` : écart de vitesse en %, de `-50` à `20`.
- `pause_seconds` : silence entre les phrases, de `0` à `10`.

En cas d'erreur, la réponse est `{"detail": "message en français"}` avec le code 400 (texte invalide), 429 (limite atteinte), 502 (service de voix indisponible) ou 504 (délai dépassé).

### Fonctionnement

1. Le texte est découpé en phrases. Le découpage tient compte des abréviations (Dr., M., etc.) et des retours à la ligne.
2. Si la ponctuation est lue, elle est remplacée par des mots, sauf dans les nombres : « 2,5 mg » et « 14:30 » restent intacts.
3. Chaque phrase (ou bloc de 3 000 caractères au plus, s'il n'y a pas de pause) est envoyée au service de voix, quatre à la fois.
4. Les segments MP3 sont collés dans l'ordre avec des trames de silence entre eux. Ils ont tous le même format, donc l'assemblage se fait sans ffmpeg.

## Déploiement sur Render (gratuit)

L'API et le site sont servis par un seul service construit avec le `Dockerfile`. Il n'y a ni variable secrète ni CORS à configurer.

### 1. Mettre le code sur GitHub

1. Créez un compte sur https://github.com, puis un dépôt **vide** nommé `audiotraining`, sans README.
2. Dans le dossier du projet :

```bash
git init            # déjà fait si le dossier .git existe
git add .
git commit -m "AudioTraining MVP"
git branch -M main
git remote add origin https://github.com/<votre-identifiant>/audiotraining.git
git push -u origin main
```

Vérifiez que `git status` ne montre ni `.env`, ni `node_modules`, ni `.venv`. Le fichier `.gitignore` les exclut.

### 2. Créer le service sur Render

1. Créez un compte sur https://render.com avec **« Sign in with GitHub »**. Aucune carte bancaire n'est demandée pour l'offre Free.
2. Cliquez sur **New → Blueprint**, autorisez l'accès au dépôt `audiotraining` et sélectionnez-le.
3. Render lit `render.yaml` et propose le service `audiotraining` (plan **Free**, région Francfort). Cliquez sur **Apply**.
4. Patientez pendant la construction (3 à 5 minutes la première fois). Dans l'onglet **Logs**, attendez la ligne `Uvicorn running on http://0.0.0.0:…`.

Les variables d'environnement sont déjà remplies par `render.yaml`. Pour en changer une, allez dans **Environment** sur la page du service. Le service redémarre tout seul.

### 3. Tester en ligne

1. Ouvrez `https://audiotraining-xxxx.onrender.com/health` (l'URL est affichée en haut de la page du service). Vous devez voir `{"status":"ok"}`.
2. Ouvrez l'URL du site, cliquez sur **Insérer un exemple** puis sur **Générer l'audio**.
3. Écoutez le résultat, cliquez sur **Télécharger le MP3** et ouvrez le fichier dans votre lecteur habituel.
4. Refaites l'essai depuis un téléphone.

### 4. Redéployer une nouvelle version

```bash
git add .
git commit -m "Description de la modification"
git push
```

Render reconstruit et remet en ligne automatiquement (`autoDeploy: true`). L'avancement est visible dans l'onglet **Events**. En cas de besoin, **Manual Deploy → Deploy latest commit** relance un déploiement à la main.

## Checklist de déploiement

- [ ] `pytest` passe et `npm run build` réussit en local.
- [ ] Le code est sur GitHub, sans `.env` ni `node_modules`.
- [ ] Le service Render est en plan **Free** et l'état **Live** est affiché.
- [ ] `/health` renvoie `{"status":"ok"}`.
- [ ] Une génération depuis le site donne un MP3 lisible et téléchargeable.
- [ ] Le site s'affiche correctement sur mobile.
- [ ] Après 15 minutes d'inactivité, le site se réveille bien (bannière puis fonctionnement normal).
- [ ] Les pages « Mentions légales » et « Confidentialité » s'ouvrent depuis le pied de page.
- [ ] `curl -sI https://<votre-url>/` montre bien les en-têtes `content-security-policy` et `strict-transport-security`.

## Variables d'environnement

Voir `backend/.env.example`. Aucune n'est secrète.

| Variable | Défaut | Rôle |
|---|---|---|
| `TTS_PROVIDER` | `edge` | `edge` (voix réelles) ou `fake` (silence, pour les tests) |
| `MAX_TEXT_CHARS` | `15000` | Taille maximale du texte |
| `RATE_LIMIT_PER_HOUR` | `20` | Générations par heure et par IP (`0` = illimité) |
| `PREVIEW_LIMIT_PER_HOUR` | `120` | Écoutes d'extraits par heure et par IP, quota séparé |
| `GLOBAL_LIMIT_PER_HOUR` | `300` | Générations par heure, tous visiteurs confondus |
| `GLOBAL_PREVIEW_LIMIT_PER_HOUR` | `1500` | Extraits par heure, tous visiteurs confondus |
| `MAX_CONCURRENT_GENERATIONS` | `3` | Générations complètes simultanées (au-delà : « serveur occupé ») |
| `ENABLE_API_DOCS` | `false` | Active la documentation de l'API sur `/api/docs` |
| `TTS_CONCURRENCY` | `4` | Segments générés en parallèle |
| `GENERATION_TIMEOUT_SECONDS` | `240` | Durée maximale d'une génération |
| `CORS_ORIGINS` | *(vide)* | À renseigner seulement si le frontend est hébergé sur un autre domaine |
| `FRONTEND_DIST` | `../frontend/dist` | Dossier du frontend compilé |
