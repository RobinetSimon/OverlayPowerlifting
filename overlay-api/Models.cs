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
    [property: JsonPropertyName("weight_category")] string? WeightCategory,
    [property: JsonPropertyName("attempts")] AthleteAttempts Attempts,
    [property: JsonPropertyName("total")] double? Total);

public record ErrorResponse(
    [property: JsonPropertyName("error")] string Error);

[JsonSerializable(typeof(List<Athlete>))]
[JsonSerializable(typeof(ErrorResponse))]
internal partial class AppJsonContext : JsonSerializerContext;
