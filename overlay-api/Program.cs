using System.Net.WebSockets;
using Microsoft.Extensions.FileProviders;
using OverlayApi;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});

builder.Services.AddCors();

var port = Environment.GetEnvironmentVariable("API_PORT") ?? "3000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
app.UseWebSockets();

// --- WebSocket ---
var clients = new List<WebSocket>();
var clientsLock = new Lock();

app.Use(async (context, next) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        await next(context);
        return;
    }

    using var ws = await context.WebSockets.AcceptWebSocketAsync();
    lock (clientsLock) clients.Add(ws);
    Console.WriteLine("WebSocket client connected.");

    try
    {
        var buffer = new byte[4096];
        while (ws.State == WebSocketState.Open)
        {
            var result = await ws.ReceiveAsync(buffer, context.RequestAborted);
            if (result.MessageType == WebSocketMessageType.Close) break;

            var segment = new ArraySegment<byte>(buffer, 0, result.Count);
            List<WebSocket> snapshot;
            lock (clientsLock) snapshot = [.. clients.Where(c => c.State == WebSocketState.Open)];

            await Task.WhenAll(snapshot.Select(c =>
                c.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None)));
        }
    }
    catch (WebSocketException) { }
    finally
    {
        lock (clientsLock) clients.Remove(ws);
        Console.WriteLine("WebSocket client disconnected.");
        if (ws.State is WebSocketState.Open or WebSocketState.CloseReceived)
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None);
    }
});

// --- Static files ---
var publicPath = Path.Combine(AppContext.BaseDirectory, "public");
if (Directory.Exists(publicPath))
{
    var provider = new PhysicalFileProvider(publicPath);
    app.UseFileServer(new FileServerOptions
    {
        FileProvider = provider,
        EnableDefaultFiles = true,
        EnableDirectoryBrowsing = false
    });
}

// --- API ---
app.MapGet("/getData", (string? excelPath, string? jsonPath) =>
{
    if (string.IsNullOrWhiteSpace(excelPath) || string.IsNullOrWhiteSpace(jsonPath))
        return Results.Json(new ErrorResponse("Paramètres excelPath et jsonPath requis"),
            AppJsonContext.Default.ErrorResponse, statusCode: 400);

    try
    {
        var athletes = ExcelService.Extract(Path.GetFullPath(excelPath), Path.GetFullPath(jsonPath));
        return Results.Json(athletes, AppJsonContext.Default.ListAthlete);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Excel extraction error: {ex.Message}");
        return Results.Json(new ErrorResponse(ex.Message),
            AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

Console.WriteLine($"Overlay server running on http://localhost:{port}");
app.Run();
