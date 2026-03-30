using System.Collections.Concurrent;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace OverlayApi;

public static partial class OpenPowerliftingService
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

        // Try without suffix, then with "1" for homonyms
        foreach (var suffix in new[] { "", "1" })
        {
            var url = $"https://www.openpowerlifting.org/u/{slug}{suffix}";
            try
            {
                var html = await http.GetStringAsync(url);
                var profile = ParseProfile(html, $"{firstName} {lastName}", url);
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

    private static OpenPowerliftingProfile? ParseProfile(string html, string name, string url)
    {
        try
        {
            var bests = ParsePersonalBests(html);
            var competitions = ParseCompetitions(html);
            return new OpenPowerliftingProfile(name, url, bests, competitions.Count, competitions);
        }
        catch
        {
            return null;
        }
    }

    private static PersonalBests? ParsePersonalBests(string html)
    {
        try
        {
            double? bestSquat = null, bestBench = null, bestDead = null, bestTotal = null, bestDots = null;

            // Look for personal bests table with class "personal-bests"
            var pbMatch = PersonalBestsTableRegex().Match(html);
            if (!pbMatch.Success) return null;

            var pbHtml = pbMatch.Value;

            // Extract best values from table cells
            bestSquat = ExtractBestValue(pbHtml, "Squat");
            bestBench = ExtractBestValue(pbHtml, "Bench");
            bestDead = ExtractBestValue(pbHtml, "Deadlift");
            bestTotal = ExtractBestValue(pbHtml, "Total");
            bestDots = ExtractBestValue(pbHtml, "Dots") ?? ExtractBestValue(pbHtml, "DOTS");

            if (bestSquat == null && bestBench == null && bestDead == null && bestTotal == null)
                return null;

            return new PersonalBests(bestSquat, bestBench, bestDead, bestTotal, bestDots);
        }
        catch { return null; }
    }

    private static double? ExtractBestValue(string html, string liftName)
    {
        // Pattern: look for the lift name followed by a number in a td
        var pattern = $@"{liftName}.*?<td[^>]*>(\d+\.?\d*)</td>";
        var match = Regex.Match(html, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        if (match.Success && double.TryParse(match.Groups[1].Value, CultureInfo.InvariantCulture, out var val))
            return val;
        return null;
    }

    private static List<CompetitionEntry> ParseCompetitions(string html)
    {
        var entries = new List<CompetitionEntry>();

        // Find the main results table
        var tableMatch = ResultsTableRegex().Match(html);
        if (!tableMatch.Success) return entries;

        var tableHtml = tableMatch.Value;

        // Extract rows
        var rows = TableRowRegex().Matches(tableHtml);
        foreach (Match row in rows)
        {
            var cells = TableCellRegex().Matches(row.Value);
            if (cells.Count < 10) continue;

            var cellValues = new List<string>();
            foreach (Match cell in cells)
            {
                // Strip HTML tags from cell content
                var content = HtmlTagRegex().Replace(cell.Groups[1].Value, "").Trim();
                cellValues.Add(content);
            }

            // OpenPowerlifting table columns vary, but common order is:
            // Place, Federation, Date, MeetName, Division, Sex, Equipment, WeightClass, Bodyweight, Squat, Bench, Deadlift, Total, Dots
            // We try to extract what we can
            try
            {
                entries.Add(new CompetitionEntry(
                    Date: FindCellByPattern(cellValues, DatePatternRegex()),
                    Federation: cellValues.Count > 1 ? cellValues[1] : null,
                    MeetName: cellValues.Count > 3 ? cellValues[3] : null,
                    Place: cellValues.Count > 0 ? cellValues[0] : null,
                    Equipment: cellValues.Count > 6 ? cellValues[6] : null,
                    Bodyweight: ParseDouble(FindCellByPattern(cellValues, NumberPatternRegex(), 8)),
                    Squat: ParseDouble(FindCellByPattern(cellValues, NumberPatternRegex(), 9)),
                    Bench: ParseDouble(FindCellByPattern(cellValues, NumberPatternRegex(), 10)),
                    Deadlift: ParseDouble(FindCellByPattern(cellValues, NumberPatternRegex(), 11)),
                    Total: ParseDouble(FindCellByPattern(cellValues, NumberPatternRegex(), 12)),
                    Dots: ParseDouble(FindCellByPattern(cellValues, NumberPatternRegex(), 13))
                ));
            }
            catch { /* skip malformed rows */ }
        }

        return entries;
    }

    private static string? FindCellByPattern(List<string> cells, Regex pattern, int startIndex = 0)
    {
        for (var i = startIndex; i < cells.Count; i++)
        {
            if (pattern.IsMatch(cells[i]))
                return cells[i];
        }
        return null;
    }

    private static double? ParseDouble(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        // Remove negative sign prefix used for failed attempts
        var clean = value.TrimStart('-');
        return double.TryParse(clean, CultureInfo.InvariantCulture, out var result) ? result : null;
    }

    [GeneratedRegex(@"<table[^>]*class=""[^""]*personal-bests[^""]*""[^>]*>.*?</table>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex PersonalBestsTableRegex();

    [GeneratedRegex(@"<table[^>]*id=""[^""]*meetresults[^""]*""[^>]*>.*?</table>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ResultsTableRegex();

    [GeneratedRegex(@"<tr[^>]*>(.*?)</tr>", RegexOptions.Singleline)]
    private static partial Regex TableRowRegex();

    [GeneratedRegex(@"<td[^>]*>(.*?)</td>", RegexOptions.Singleline)]
    private static partial Regex TableCellRegex();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex HtmlTagRegex();

    [GeneratedRegex(@"\d{4}-\d{2}-\d{2}")]
    private static partial Regex DatePatternRegex();

    [GeneratedRegex(@"^-?\d+\.?\d*$")]
    private static partial Regex NumberPatternRegex();
}
