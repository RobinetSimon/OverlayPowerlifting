using System.Text.Json;
using ClosedXML.Excel;

namespace OverlayApi;

public static class ExcelService
{
    private static readonly int[] SquatCols = [12, 13, 14];
    private static readonly int[] BenchCols = [15, 16, 17];
    private static readonly int[] DeadliftCols = [18, 19, 20];

    public static List<Athlete> Extract(string excelPath)
    {
        using var workbook = new XLWorkbook(excelPath);
        var ws = workbook.Worksheet(1);
        var athletes = new List<Athlete>();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;

        for (var row = 8; row <= lastRow; row++)
        {
            var wsRow = ws.Row(row);
            var lastName = GetText(wsRow.Cell(6));
            var firstName = GetText(wsRow.Cell(7));

            if (string.IsNullOrWhiteSpace(lastName) || string.IsNullOrWhiteSpace(firstName))
                continue;
            if (lastName == "Nom" || firstName == "Prénom")
                continue;

            athletes.Add(new Athlete(
                Club: GetText(wsRow.Cell(2)),
                Sex: GetText(wsRow.Cell(3)),
                CategoryAge: GetText(wsRow.Cell(5)),
                LastName: lastName,
                FirstName: firstName,
                Bodyweight: GetNumber(wsRow.Cell(8)),
                WeightCategory: GetText(wsRow.Cell(9)),
                Attempts: new AthleteAttempts(
                    Squat: SquatCols.Select(c => MakeAttempt(wsRow.Cell(c))).ToList(),
                    BenchPress: BenchCols.Select(c => MakeAttempt(wsRow.Cell(c))).ToList(),
                    Deadlift: DeadliftCols.Select(c => MakeAttempt(wsRow.Cell(c))).ToList()),
                Total: GetNumber(wsRow.Cell(21)),
                IpfCoefficient: GetNumber(wsRow.Cell(10)),
                Ranking: GetInt(wsRow.Cell(22)),
                GlPoints: GetNumber(wsRow.Cell(23))
            ));
        }

        // Save JSON next to the executable
        var jsonPath = Path.Combine(AppContext.BaseDirectory, "public", "json", "datas.json");
        var dir = Path.GetDirectoryName(jsonPath);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
        File.WriteAllText(jsonPath, JsonSerializer.Serialize(athletes, AppJsonContext.Default.ListAthlete));

        return athletes;
    }

    private static Attempt MakeAttempt(IXLCell cell) => new(GetNumber(cell), GetStatus(cell));

    private static string GetStatus(IXLCell cell)
    {
        try
        {
            var bg = cell.Style.Fill.BackgroundColor;
            var strikethrough = cell.Style.Font.Strikethrough;

            if (bg.ColorType == XLColorType.Indexed)
            {
                if (bg.Indexed == 11) return "valid";
                if (bg.Indexed == 31 && strikethrough) return "invalid";
            }
            else if (bg.ColorType == XLColorType.Color)
            {
                var c = bg.Color;
                if (c.R == 0 && c.G == 255 && c.B == 0) return "valid";
                if (c.R == 128 && c.G == 0 && c.B == 128 && strikethrough) return "invalid";
            }
        }
        catch { /* style not readable, treat as pending */ }

        return "pending";
    }

    private static string? GetText(IXLCell cell)
    {
        try
        {
            if (cell.IsEmpty()) return null;
            return cell.GetString();
        }
        catch
        {
            try { return cell.Value.ToString(); }
            catch { return null; }
        }
    }

    private static double? GetNumber(IXLCell cell)
    {
        try
        {
            if (cell.IsEmpty()) return null;
            return cell.GetDouble();
        }
        catch { return null; }
    }

    private static int? GetInt(IXLCell cell)
    {
        try
        {
            if (cell.IsEmpty()) return null;
            return (int)cell.GetDouble();
        }
        catch { return null; }
    }
}
