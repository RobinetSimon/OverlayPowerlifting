const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { uploadRecords } = require('../controllers/recordController');

// Configuration de Multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Les fichiers seront sauvegardés dans un dossier 'uploads' à la racine
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // On renomme le fichier pour éviter les conflits et garder une référence simple
    cb(null, 'regional_records' + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Définition de la route POST
// 'recordsFile' est le nom du champ attendu dans la requête FormData du front
router.post('/', upload.single('recordsFile'), uploadRecords);

module.exports = router;