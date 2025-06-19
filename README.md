# Powerlifting Overlay System

Ce projet permet de gérer l'affichage d'un **overlay en direct pour des compétitions de powerlifting**. Il comprend une interface utilisateur, un système de récupération automatique des données depuis un fichier Excel de compétition, et une API pour centraliser les données.

## Objectif

Fournir un **overlay professionnel et dynamique** à intégrer dans un stream vidéo (via OBS, par exemple), mettant à jour en temps réel les informations des athlètes :  
- Nom, prénom  
- Catégorie de poids  
- Catégorie d'âge 
- Essais en cours (Squat, Bench, Deadlift)  
- Statut des tentatives (réussies, ratées, en attente)  
- Total cumulé  

## Structure du projet

### Backend (Node.js + Express)

- API REST pour exposer les données des athlètes au format JSON
- Script de traitement d’un fichier Excel de compétition (Excel → JSON)
- Endpoint statique pour exposer les données JSON à l’interface front

### Frontend (React + TypeScript + Tailwind)

- Page de contrôle :
  - Sélection du mouvement à afficher (Squat, Bench, Deadlift)
  - Bouton pour passer à l'athlète suivant
  - Gestion du rafraîchissement automatique depuis l’API

- Page d’overlay (à capturer dans OBS) :
  - Affichage des informations athlètes, avec gestion des animations d'apparition / disparition

