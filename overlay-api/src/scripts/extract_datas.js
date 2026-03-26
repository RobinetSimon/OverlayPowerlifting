const ExcelJS = require('exceljs');
const fs = require('fs');

/**
 * Détermine le statut d'un essai (valid, invalid, pending)
 */
function getAttemptStatus(cell) {
    const fill = cell.fill;
    const font = cell.font;
    let color = null;

    if (fill && fill.type === 'pattern' && fill.fgColor) {
        // ExcelJS peut retourner l'ARGB ou l'index
        color = fill.fgColor.argb || fill.fgColor.indexed;
    }

    const isStrikethrough = font && font.strike;

    // Vert (Valide) : Index 11 ou ARGB vert standard
    if (color === 'FF00FF00' || color === '0000000B' || color === 11) {
        return "valid";
    } 
    // Violet + Barré (Échec) : Index 31 ou ARGB violet
    else if (isStrikethrough && (color === 'FF800080' || color === '0000001F' || color === 31)) {
        return "invalid";
    } 
    
    return "pending";
}

/**
 * Logique principale de transformation
 */
exports.extractExcelData = async (excelPath, jsonPath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const ws = workbook.getWorksheet(1);

    // On ajuste les indices : si votre script python utilisait row[1], 
    // en ExcelJS getCell(1) correspond à la colonne A. 
    // Si row[1] en python était la colonne B, alors utilisez l'index python + 1.
    const fields = {
        club: 2, sex: 3, catAge: 5, lastName: 6, firstName: 7, 
        weightCat: 9, squat: [12, 13, 14], bench: [15, 16, 17], 
        deadlift: [18, 19, 20], total: 21
    };

    const athletes = [];

    ws.eachRow((row, rowNumber) => {
        if (rowNumber < 8) return;

        const lastName = row.getCell(fields.lastName).value;
        const firstName = row.getCell(fields.firstName).value;
        if (!lastName || !firstName) return;

        const getVal = (cellIndex) => {
            const cell = row.getCell(cellIndex);
            // Gère les cellules avec formules
            return cell.value && typeof cell.value === 'object' ? cell.value.result : cell.value;
        };

        const athlete = {
            club: getVal(fields.club),
            sex: getVal(fields.sex),
            category_age: getVal(fields.catAge),
            last_name: lastName,
            first_name: firstName,
            weight_category: getVal(fields.weightCat),
            attempts: {
                squat: fields.squat.map(col => ({ weight: getVal(col), status: getAttemptStatus(row.getCell(col)) })),
                bench_press: fields.bench.map(col => ({ weight: getVal(col), status: getAttemptStatus(row.getCell(col)) })),
                deadlift: fields.deadlift.map(col => ({ weight: getVal(col), status: getAttemptStatus(row.getCell(col)) }))
            },
            total: getVal(fields.total)
        };
        athletes.push(athlete);
    });

    // Sauvegarde physique du JSON
    fs.writeFileSync(jsonPath, JSON.stringify(athletes, null, 2), 'utf8');
    
    return athletes;
};