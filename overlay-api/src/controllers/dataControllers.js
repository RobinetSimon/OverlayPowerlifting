const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getRecords } = require('./recordController');

const getRecordValue = (records, sex, ageCat, weightCat, movement) => {
  try {
    return records[sex][ageCat][weightCat][movement];
  } catch (e) {
    return null;
  }
};

exports.launchScript = (req, res) => {
  const excelPath = req.query.excelPath;
  const jsonPath = req.query.jsonPath;

  if (!excelPath || !jsonPath) {
    return res.status(400).json({ error: "Paramètres excelPath et jsonPath requis" });
  }

  const scriptPath = path.resolve(__dirname, '../scripts/extract_datas.py');

  execFile('python', [scriptPath, excelPath, jsonPath], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }

    fs.readFile(jsonPath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).json({ error: "Impossible de lire le fichier JSON généré" });
      }

      try {
        let athletes = JSON.parse(data);
        const records = getRecords();

        if (records && Object.keys(records).length > 0) {
          athletes = athletes.map(athlete => {
            const { sex, category_age } = athlete;
            let { weight_category } = athlete;

            if (!sex || !category_age || !weight_category) return athlete;

            // --- CORRECTION DÉFINITIVE ---
            // On transforme "66 Kg" en "66kg" (tout en minuscules, sans espaces)
            weight_category = weight_category.toLowerCase().replace(/\s/g, '');

            for (const movement of ['squat', 'bench_press', 'deadlift']) {
              const recordValue = getRecordValue(records, sex, category_age, weight_category, movement);
              
              if (athlete.attempts[movement]) {
                athlete.attempts[movement] = athlete.attempts[movement].map(attempt => {
                  if (recordValue !== null && attempt.weight > recordValue) {
                    return { ...attempt, isRecordAttempt: true };
                  }
                  return attempt;
                });
              }
            }
            return athlete;
          });
        }
        
        res.status(200).json(athletes);

      } catch (parseErr) {
        res.status(500).json({ error: "Le fichier JSON est mal formé" });
      }
    });
  });
};