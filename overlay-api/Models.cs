using System.Text.Json.Serialization;

namespace OverlayApi;

public record Attempt(
    [property: JsonPropertyName("weight")] double? Weight,
    [property: JsonPropertyName("status")] string Status);

public record AthleteAttempts(
    [property: JsonPropertyName("squat")] List<Attempt> Squat,
    [property: JsonPropertyName("bench_press")] List<Attempt> BenchPress,
    [property: JsonPropertyName("deadlift")] List<Attempt> Deadlift);

public record Athlete(
    [property: JsonPropertyName("club")] string? Club,
    [property: JsonPropertyName("sex")] string? Sex,
    [property: JsonPropertyName("category_age")] string? CategoryAge,
    [property: JsonPropertyName("last_name")] string? LastName,
    [property: JsonPropertyName("first_name")] string? FirstName,
    [property: JsonPropertyName("bodyweight")] double? Bodyweight,
    [property: JsonPropertyName("weight_category")] string? WeightCategory,
    [property: JsonPropertyName("attempts")] AthleteAttempts Attempts,
    [property: JsonPropertyName("total")] double? Total,
    [property: JsonPropertyName("ipf_coefficient")] double? IpfCoefficient,
    [property: JsonPropertyName("ranking")] int? Ranking,
    [property: JsonPropertyName("gl_points")] double? GlPoints);

public record ErrorResponse(
    [property: JsonPropertyName("error")] string Error);

// --- File browser ---
public record BrowseEntry(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("is_directory")] bool IsDirectory,
    [property: JsonPropertyName("extension")] string? Extension);

public record BrowseResponse(
    [property: JsonPropertyName("current_path")] string CurrentPath,
    [property: JsonPropertyName("parent_path")] string? ParentPath,
    [property: JsonPropertyName("entries")] List<BrowseEntry> Entries);

// --- Logo upload ---
public record LogoUpload(
    [property: JsonPropertyName("data")] string Data);

public record UploadResponse(
    [property: JsonPropertyName("url")] string Url);

public record UploadExcelResponse(
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("athletes")] List<Athlete> Athletes);

// --- OpenPowerlifting ---
public record PersonalBests(
    [property: JsonPropertyName("best_squat")] double? BestSquat,
    [property: JsonPropertyName("best_bench")] double? BestBench,
    [property: JsonPropertyName("best_deadlift")] double? BestDeadlift,
    [property: JsonPropertyName("best_total")] double? BestTotal,
    [property: JsonPropertyName("best_gl_points")] double? BestGlPoints);

public record CompetitionEntry(
    [property: JsonPropertyName("date")] string? Date,
    [property: JsonPropertyName("federation")] string? Federation,
    [property: JsonPropertyName("meet_name")] string? MeetName,
    [property: JsonPropertyName("place")] string? Place,
    [property: JsonPropertyName("equipment")] string? Equipment,
    [property: JsonPropertyName("bodyweight")] double? Bodyweight,
    [property: JsonPropertyName("squat")] double? Squat,
    [property: JsonPropertyName("bench")] double? Bench,
    [property: JsonPropertyName("deadlift")] double? Deadlift,
    [property: JsonPropertyName("total")] double? Total,
    [property: JsonPropertyName("gl_points")] double? GlPoints);

public record OpenPowerliftingProfile(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("personal_bests")] PersonalBests? PersonalBests,
    [property: JsonPropertyName("competition_count")] int CompetitionCount,
    [property: JsonPropertyName("competitions")] List<CompetitionEntry> Competitions);

[JsonSerializable(typeof(List<Athlete>))]
[JsonSerializable(typeof(ErrorResponse))]
[JsonSerializable(typeof(BrowseResponse))]
[JsonSerializable(typeof(LogoUpload))]
[JsonSerializable(typeof(UploadResponse))]
[JsonSerializable(typeof(UploadExcelResponse))]
[JsonSerializable(typeof(OpenPowerliftingProfile))]
internal partial class AppJsonContext : JsonSerializerContext;
