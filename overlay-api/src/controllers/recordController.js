const path = require('path');
const xlsx = require('xlsx');

let recordsData = {};

const findSheetName = (targetKeyword, sheetNamesList) => {
  for (const name of sheetNamesList) {
    if (name.toLowerCase().includes(targetKeyword)) {
      return name;
    }
  }
  return null;
};

exports.uploadRecords = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier n'a été fourni." });
  }

  try {
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const allSheetNames = workbook.SheetNames;

    const damesSheetName = findSheetName('dames', allSheetNames);
    const messieursSheetName = findSheetName('messieurs', allSheetNames);

    if (!damesSheetName || !messieursSheetName) {
      throw new Error(`Feuilles requises introuvables. Feuilles détectées : ${allSheetNames.join(', ')}`);
    }

    const damesRows = xlsx.utils.sheet_to_json(workbook.Sheets[damesSheetName], { header: 1 });
    const messieursRows = xlsx.utils.sheet_to_json(workbook.Sheets[messieursSheetName], { header: 1 });
    
    const AGE_CATEGORY_MAPPING = {
        'Sub Junior': 'SJR', 'Junior': 'JR', 'Open': 'SNR', 'Senior': 'SNR',
        'Master1': 'M1', 'Master2': 'M2', 'Master3': 'M3', 'Master4': 'M4'
    };
    
    const structured_records = { "F": {}, "M": {} };

    // --- NOUVELLE LOGIQUE SIMPLIFIÉE ---
    const processSheet = (rows, sexKey) => {
        for (const row of rows) {
            // On s'assure que la ligne est une ligne de données valide
            // Doit avoir au moins 13 colonnes et une catégorie d'âge en texte
            if (!row || row.length < 13 || typeof row[1] !== 'string') {
                continue;
            }

            const weight_cat_raw = String(row[0]).trim();
            const age_cat_raw = String(row[1]).trim();
            
            // Si la catégorie d'âge n'est pas dans notre mapping, on ignore la ligne
            if (!AGE_CATEGORY_MAPPING[age_cat_raw]) {
                continue;
            }

            const age_cat = AGE_CATEGORY_MAPPING[age_cat_raw];
            const weight_cat = weight_cat_raw;

            if (!structured_records[sexKey][age_cat]) {
              structured_records[sexKey][age_cat] = {};
            }
            if (!structured_records[sexKey][age_cat][weight_cat]) {
              structured_records[sexKey][age_cat][weight_cat] = {};
            }

            try {
                // Les indices de colonnes ont été corrigés en se basant sur le log
                // Squat: col D (index 3), Bench: col G (index 6), etc.
                const squat = parseFloat(row[3]);
                const bench = parseFloat(row[6]);
                const deadlift = parseFloat(row[9]);
                const total = parseFloat(row[12]);
                
                structured_records[sexKey][age_cat][weight_cat] = {
                    'squat': !isNaN(squat) ? squat : null,
                    'bench_press': !isNaN(bench) ? bench : null,
                    'deadlift': !isNaN(deadlift) ? deadlift : null,
                    'total': !isNaN(total) ? total : null,
                };
            } catch (e) {
                continue;
            }
        }
    };

    processSheet(damesRows, "F");
    processSheet(messieursRows, "M");

    recordsData = structured_records;
    console.log("✅ Records parsés avec la logique corrigée !");

    res.status(200).json({
        message: "Fichier des records traité avec succès !",
        data: recordsData 
    });

  } catch (error) {
    console.error("Erreur lors du traitement du fichier Excel:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getRecords = () => {
  return recordsData;
};