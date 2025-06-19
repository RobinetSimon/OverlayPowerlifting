const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.launchScript = (req, res) => {
  const excelPath = req.query.excelPath;
  const jsonPath = req.query.jsonPath;

  if (!excelPath || !jsonPath) {
    return res.status(400).json({ error: "Paramètres excelPath et jsonPath requis" });
  }

  const scriptPath = path.resolve(__dirname, '../scripts/extract_datas.py');

  execFile('python', [scriptPath, excelPath, jsonPath], (error, stdout, stderr) => {
    if (error) {
      console.error(`Erreur lors de l'exécution : ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);

    // Une fois le script exécuté, on lit le fichier JSON et on le renvoie
    fs.readFile(jsonPath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Erreur lecture fichier JSON : ${err.message}`);
        return res.status(500).json({ error: "Impossible de lire le fichier JSON généré" });
      }

      try {
        const jsonData = JSON.parse(data);
        res.status(200).json(jsonData);
      } catch (parseErr) {
        console.error(`Erreur parsing JSON : ${parseErr.message}`);
        res.status(500).json({ error: "Le fichier JSON est mal formé" });
      }
    });
  });
};
