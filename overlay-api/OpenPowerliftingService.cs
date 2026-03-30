using System.Collections.Concurrent;
using System.Globalization;
using System.Text;

namespace OverlayApi;

public static class OpenPowerliftingService
{
    private static readonly ConcurrentDictionary<string, (OpenPowerliftingProfile Profile, DateTime FetchedAt)> Cache = new();
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    public static async Task<OpenPowerliftingProfile?> FetchProfile(HttpClient http, string firstName, string lastName)
    {
        var slug = ToSlug(firstName, lastName);
        if (string.IsNullOrEmpty(slug)) return null;

        // Check cache
        if (Cache.TryGetValue(slug, out var cached) && DateTime.UtcNow - cached.FetchedAt < CacheTtl)
            return cached.Profile;

        // Try without suffix, then with "1", "2" for homonyms
        foreach (var suffix in new[] { "", "1", "2" })
        {
            var url = $"https://www.openpowerlifting.org/api/liftercsv/{slug}{suffix}";
            try
            {
                var csv = await http.GetStringAsync(url);
                var profile = ParseCsv(csv, $"{firstName} {lastName}", $"https://www.openpowerlifting.org/u/{slug}{suffix}");
                if (profile != null)
                {
                    Cache[slug] = (profile, DateTime.UtcNow);
                    return profile;
                }
            }
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                continue;
            }
            catch
            {
                continue;
            }
        }

        return null;
    }

    internal static string ToSlug(string firstName, string lastName)
    {
        var combined = $"{firstName}{lastName}".ToLowerInvariant();
        var normalized = combined.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark
                && c != ' ' && c != '-' && c != '\'' && c != '.')
                sb.Append(c);
        }
        return sb.ToString();
    }

    private static OpenPowerliftingProfile? ParseCsv(string csv, string name, string url)
    {
        try
        {
            var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2) return null;

            var headers = ParseCsvLine(lines[0]);
            var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Length; i++)
                headerMap[headers[i].Trim()] = i;

            var competitions = new List<CompetitionEntry>();
            double? bestSquat = null, bestBench = null, bestDead = null, bestTotal = null, bestDots = null;

            for (var i = 1; i < lines.Length; i++)
            {
                var fields = ParseCsvLine(lines[i]);
                if (fields.Length < headers.Length) continue;

                var squat = GetField(fields, headerMap, "Best3SquatKg");
                var bench = GetField(fields, headerMap, "Best3BenchKg");
                var deadlift = GetField(fields, headerMap, "Best3DeadliftKg");
                var total = GetField(fields, headerMap, "TotalKg");
                var dots = GetField(fields, headerMap, "Dots");

                var squatVal = ParseDouble(squat);
                var benchVal = ParseDouble(bench);
                var deadVal = ParseDouble(deadlift);
                var totalVal = ParseDouble(total);
                var dotsVal = ParseDouble(dots);

                // Track personal bests
                if (squatVal.HasValue && (!bestSquat.HasValue || squatVal > bestSquat)) bestSquat = squatVal;
                if (benchVal.HasValue && (!bestBench.HasValue || benchVal > bestBench)) bestBench = benchVal;
                if (deadVal.HasValue && (!bestDead.HasValue || deadVal > bestDead)) bestDead = deadVal;
                if (totalVal.HasValue && (!bestTotal.HasValue || totalVal > bestTotal)) bestTotal = totalVal;
                if (dotsVal.HasValue && (!bestDots.HasValue || dotsVal > bestDots)) bestDots = dotsVal;

                competitions.Add(new CompetitionEntry(
                    Date: GetField(fields, headerMap, "Date"),
                    Federation: GetField(fields, headerMap, "Federation"),
                    MeetName: GetField(fields, headerMap, "MeetName"),
                    Place: GetField(fields, headerMap, "Place"),
                    Equipment: GetField(fields, headerMap, "Equipment"),
                    Bodyweight: ParseDouble(GetField(fields, headerMap, "BodyweightKg")),
                    Squat: squatVal,
                    Bench: benchVal,
                    Deadlift: deadVal,
                    Total: totalVal,
                    Dots: dotsVal
                ));
            }

            PersonalBests? pbs = null;
            if (bestSquat.HasValue || bestBench.HasValue || bestDead.HasValue || bestTotal.HasValue)
                pbs = new PersonalBests(bestSquat, bestBench, bestDead, bestTotal, bestDots);

            return new OpenPowerliftingProfile(name, url, pbs, competitions.Count, competitions);
        }
        catch
        {
            return null;
        }
    }

    private static string? GetField(string[] fields, Dictionary<string, int> headerMap, string columnName)
    {
        if (!headerMap.TryGetValue(columnName, out var idx) || idx >= fields.Length)
            return null;
        var val = fields[idx].Trim();
        return string.IsNullOrEmpty(val) ? null : val;
    }

    private static string[] ParseCsvLine(string line)
    {
        return line.Split(',');
    }

    private static double? ParseDouble(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var clean = value.TrimStart('-');
        return double.TryParse(clean, CultureInfo.InvariantCulture, out var result) ? result : null;
    }
}
