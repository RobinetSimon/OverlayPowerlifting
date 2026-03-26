const { extractExcelData } = require('../scripts/extract_datas');
const path = require('path');

exports.launchScript = async (req, res) => {
  const { excelPath, jsonPath } = req.query;

  if (!excelPath || !jsonPath) {
    return res.status(400).json({ error: "Paramètres excelPath et jsonPath requis" });
  }

  try {
    // Résolution des chemins si nécessaire
    const absoluteExcelPath = path.resolve(excelPath);
    const absoluteJsonPath = path.resolve(jsonPath);

    // Appel direct de la fonction JS (plus besoin de child_process / python)
    const athletesData = await extractExcelData(absoluteExcelPath, absoluteJsonPath);

    // Réponse directe avec les données extraites
    console.log(`Extraction réussie pour : ${excelPath}`);
    res.status(200).json(athletesData);

  } catch (error) {
    console.error(`Erreur lors de l'extraction : ${error.message}`);
    res.status(500).json({ 
      error: "Erreur lors du traitement du fichier Excel", 
      details: error.message 
    });
  }
};
