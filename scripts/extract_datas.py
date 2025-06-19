import json
from openpyxl import load_workbook

# Charger le fichier Excel
wb = load_workbook("competition_fa.xlsx")
ws = wb["Comp"]

# Index des colonnes utiles
fields_index = {
    "club": 1,
    "sex": 2,
    "category_age": 4,
    "last_name": 5,
    "first_name": 6,
    "weight_cat": 8,
    "squat": [11, 12, 13],
    "bench": [14, 15, 16],
    "deadlift": [17, 18, 19],
    "total": 20
}

def get_attempt_status(cell):
    """Retourne le statut de l'essai selon la couleur de fond et si le texte est barré."""
    fill_color = cell.fill.start_color.rgb
    is_strike = cell.font.strike

    if fill_color == "FF00FF00":
        return "valid"
    elif fill_color == "FFCCCCFF" and is_strike:
        return "invalid"
    elif fill_color is None or fill_color == "00000000":
        return "pending"
    else:
        return "pending"

athletes = []

# Parcourir les lignes des athlètes (à partir de la 3e)
for row in ws.iter_rows(min_row=3):
    athlete = {
        "club": row[fields_index["club"]].value,
        "sex": row[fields_index["sex"]].value,
        "category_age": row[fields_index["category_age"]].value,
        "last_name": row[fields_index["last_name"]].value,
        "first_name": row[fields_index["first_name"]].value,
        "weight_category": row[fields_index["weight_cat"]].value,
        "attempts": {
            "squat": [],
            "bench_press": [],
            "deadlift": []
        },
        "total": row[fields_index["total"]].value
    }

    # SQUAT
    for col in fields_index["squat"]:
        cell = row[col]
        athlete["attempts"]["squat"].append({
            "weight": cell.value,
            "status": get_attempt_status(cell)
        })

    # BENCH PRESS
    for col in fields_index["bench"]:
        cell = row[col]
        athlete["attempts"]["bench_press"].append({
            "weight": cell.value,
            "status": get_attempt_status(cell)
        })

    # DEADLIFT
    for col in fields_index["deadlift"]:
        cell = row[col]
        athlete["attempts"]["deadlift"].append({
            "weight": cell.value,
            "status": get_attempt_status(cell)
        })

    athletes.append(athlete)

# Exporter vers un fichier JSON
with open("competition_results.json", "w", encoding="utf-8") as f:
    json.dump(athletes, f, indent=2, ensure_ascii=False)

print("Export terminé dans 'competition_results.json'")
