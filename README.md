# Powerlifting Overlay System

Overlay en direct pour compétitions de powerlifting, intégrable dans OBS pour le streaming. Récupération automatique des données depuis un fichier Excel FFForce, affichage animé des informations athlètes en temps réel.

## Fonctionnalités

- **Overlay animé** (GSAP) : catégorie, nom, tentatives avec statut (vert/rouge/gris), total, GL Points
- **Page classement** : top 5 athlètes par GL Points, capturable dans OBS
- **Personnalisation overlay** : couleurs, position, taille, visibilité des champs, logo personnalisé
- **Explorateur de fichiers** : navigation dans le système de fichiers pour sélectionner le fichier Excel
- **Vue détaillée athlètes** : cards dépliables avec les 9 tentatives color-coded et best par mouvement
- **OpenPowerlifting** : recherche automatique du profil athlète (PRs, historique des compétitions)
- **Parsing Excel FFForce** : squat, bench, deadlift, poids de corps, GL Points, classement, statuts via couleur des cellules
- **Communication temps réel** via WebSocket avec auto-reconnexion
- **Serveur unique** : API, WebSocket et frontend statique servis par un seul exécutable

## Tech Stack

| Couche | Technologies |
|--------|-------------|
| **Backend** | C# .NET 10, Minimal API, Native AOT, ClosedXML |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS 4, GSAP |
| **CI/CD** | GitHub Actions (build + publish + GitHub Release) |

## Structure

```
overlay-api/                        # Backend C# .NET 10
├── Program.cs                      # Minimal API (WebSocket + static files + endpoints)
├── Models.cs                       # Records avec JSON source generators
├── ExcelService.cs                 # Parsing Excel (ClosedXML)
└── OpenPowerliftingService.cs      # Scraper profils OpenPowerlifting

overlay-powerlifting/               # Frontend Next.js
├── src/app/controls/               # Panneau de contrôle (4 onglets)
├── src/app/overlay/                # Page overlay (capture OBS)
├── src/app/ranking/                # Page classement GL Points (capture OBS)
├── src/components/
│   ├── mainOverlay.tsx             # Overlay avec couleurs/position dynamiques
│   ├── rankingOverlay.tsx          # Classement top 5
│   ├── athleteDetailCard.tsx       # Card détaillée athlète
│   ├── fileBrowser.tsx             # Explorateur de fichiers
│   ├── overlaySettingsPanel.tsx    # Panneau de personnalisation
│   ├── openpowerliftingPanel.tsx   # Intégration OpenPowerlifting
│   ├── liftSelector.tsx            # Sélecteur de mouvement
│   └── nextAthleteButton.tsx       # Bouton athlète suivant
└── src/types/athlete.ts            # Types TypeScript

dataset/                            # Fichiers Excel de compétition
.github/workflows/build.yml         # CI/CD GitHub Actions
```

## Pages

| Route | Description | Usage |
|-------|-------------|-------|
| `/controls` | Panneau de contrôle (4 onglets) | Interface de gestion |
| `/overlay` | Overlay athlète animé | Capturer dans OBS |
| `/ranking` | Classement top 5 GL Points | Capturer dans OBS |

## Prérequis

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org/)

## Développement

```bash
# Frontend
cd overlay-powerlifting
npm install
npm run dev          # http://localhost:3001

# Backend
cd overlay-api
dotnet run           # http://localhost:3000
```

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/getData?excelPath=...` | Parse le fichier Excel et retourne les athlètes en JSON |
| `GET` | `/browse/drives` | Liste les lecteurs disponibles |
| `GET` | `/browse?path=...` | Liste le contenu d'un répertoire (dossiers + fichiers Excel) |
| `POST` | `/upload-logo` | Upload un logo personnalisé (base64 JSON) |
| `GET` | `/openpowerlifting?firstName=...&lastName=...` | Recherche un profil OpenPowerlifting |

## Variables d'environnement

### Backend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `API_PORT` | `3000` | Port du serveur |

### Frontend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_PORT` | `3000` | Port de l'API |
| `NEXT_PUBLIC_DEFAULT_COMPETITION_NAME` | `COMPETITION` | Nom affiché sur l'overlay |
| `NEXT_PUBLIC_DEFAULT_UPDATE_INTERVAL_SECONDS` | `30` | Intervalle de rafraîchissement auto |
| `NEXT_PUBLIC_OVERLAY_DURATION_SECONDS` | `10` | Durée d'affichage de l'overlay |
| `NEXT_PUBLIC_DEFAULT_EXCEL_PATH` | _(vide)_ | Chemin par défaut du fichier Excel |

## Build & Déploiement

### Script de build automatisé

```bash
./build.bat
```

Ce script effectue les étapes suivantes :

#### 1 : Build du frontend Next.js
```bash
cd overlay-powerlifting
npm run build
```
Génère les fichiers statiques compilés et optimisés.

#### 2 : Nettoyage des ressources
```bash
rmdir /s /q overlay-api\ressources
mkdir overlay-api\ressources
```

#### 3 : Copie du frontend compilé
```bash
xcopy /s /e /y overlay-powerlifting\out overlay-api\ressources
```
Les fichiers Next.js compilés sont copiés dans le dossier `ressources` du backend.

#### 4 : Publish du backend avec Native AOT
```bash
dotnet publish -c Release -r win-x64 ^
 -o out ^
 -p:PublishSingleFile=true ^
 -p:SelfContained=true ^
 -p:PublishTrimmed=true ^
 -p:EnableCompressionInSingleFile=true ^
 -p:UseAppHost=true ^
 -p:InvariantGlobalization=true ^
 -p:PublishReadyToRun=true
```

**Paramètres d'optimisation :**
- `PublishSingleFile=true` : Un seul fichier .exe
- `SelfContained=true` : .NET 10 embarqué (autonome)
- `PublishTrimmed=true` : Supprime le code inutilisé
- `EnableCompressionInSingleFile=true` : Compression pour réduire la taille
- `PublishReadyToRun=true` : Pré-compilation JIT

### Résultat

```
overlay-api/out/
└── OverlayApi.exe        # Serveur autonome + frontend intégré (~30-40 MB)
```

### Lancement

Double-cliquer sur `OverlayApi.exe` → le serveur démarre automatiquement sur `http://localhost:3000`.

Les fichiers frontend intégrés sont servis en tant que ressources statiques depuis le serveur ASP.NET Core.

## CI/CD

Le workflow GitHub Actions se déclenche sur chaque push/PR vers `main` ou `dev`.

Sur un tag `v*` (ex: `git tag v1.1.0 && git push origin v1.1.0`), il crée automatiquement une **GitHub Release** avec le zip `OverlayPowerlifting.zip` prêt à l'emploi.
