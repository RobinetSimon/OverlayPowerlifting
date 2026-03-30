# Powerlifting Overlay System

Overlay en direct pour compétitions de powerlifting, intégrable dans OBS pour le streaming. Récupération automatique des données depuis un fichier Excel de compétition, affichage animé des informations athlètes en temps réel.

## Fonctionnalités

- Parsing automatique des fichiers Excel FFForce (squat, bench, deadlift, statuts des tentatives via couleur des cellules)
- Panneau de contrôle web : sélection athlète, mouvement, rafraîchissement auto configurable
- Overlay animé (GSAP) : catégorie, nom, tentatives avec statut (vert/rouge/gris), total
- Communication temps réel via WebSocket avec auto-reconnexion
- Indicateur de connexion WebSocket dans le panneau de contrôle
- Serveur unique qui sert l'API, le WebSocket et le frontend statique

## Tech Stack

| Couche | Technologies |
|--------|-------------|
| **Backend** | C# .NET 10, Minimal API, Native AOT, ClosedXML |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS 4, GSAP |
| **CI/CD** | GitHub Actions (build + publish + artifact) |

## Structure

```
overlay-api/                  # Backend C# .NET 10
├── Program.cs                # Minimal API (WebSocket + static files + /getData)
├── Models.cs                 # Records avec JSON source generators
├── ExcelService.cs           # Parsing Excel (ClosedXML)
└── OverlayApi.csproj

overlay-powerlifting/         # Frontend Next.js
├── src/app/controls/         # Panneau de contrôle
├── src/app/overlay/          # Page overlay (capture OBS)
├── src/components/           # Composants (overlay, sélecteurs)
└── src/types/                # Types TypeScript

dataset/                      # Fichiers Excel de compétition
.github/workflows/build.yml   # CI/CD GitHub Actions
```

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

Le panneau de contrôle est sur `/controls`, l'overlay sur `/overlay`.

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
| `NEXT_PUBLIC_DEFAULT_JSON_PATH` | _(vide)_ | Chemin par défaut du JSON |
| `NEXT_PUBLIC_DEFAULT_EXCEL_PATH` | _(vide)_ | Chemin par défaut du fichier Excel |

## Build & Déploiement

```bash
# 1. Build du frontend
cd overlay-powerlifting
npm run build

# 2. Publish du backend (.exe autonome)
cd overlay-api
dotnet publish -c Release -r win-x64 -o ../release \
  -p:PublishSingleFile=true -p:SelfContained=true -p:PublishTrimmed=true

# 3. Copier le frontend dans le dossier release
cp -r ../overlay-powerlifting/out ../release/public
```

Résultat :

```
release/
├── overlay.exe    # Serveur autonome (~27 MB)
└── public/        # Frontend statique
```

Double-cliquer `overlay.exe` lance le serveur sur `http://localhost:3000`.

## CI/CD

Le workflow GitHub Actions (`.github/workflows/build.yml`) se déclenche sur chaque push/PR vers `main` ou `dev` :

1. Build et lint du frontend
2. Build et publish du backend .NET
3. Upload de l'artifact `OverlayPowerlifting` prêt à l'emploi
