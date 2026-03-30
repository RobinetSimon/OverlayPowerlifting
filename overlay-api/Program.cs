using System.Net.WebSockets;
using System.Reflection;
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
Assembly assembly = Assembly.GetExecutingAssembly();
app.MapGet("/{**path}", async (HttpContext context) =>
{
    string path = context.Request.Path.Value?.TrimStart('/') ?? string.Empty;
    if (string.IsNullOrEmpty(path))
        path = "index.html";

    // Try to directly query the file, or try to find the underlying index.html
    Stream? stream = null;
    string resourcePath = $"OverlayApi.ressources.{path.Replace("/", ".")}";
    stream = assembly.GetManifestResourceStream(resourcePath);
    if (stream == null)
    {
        string folderPath = path.TrimEnd('/');
        resourcePath = $"OverlayApi.ressources.{folderPath.Replace("/", ".")}.index.html";
        stream = assembly.GetManifestResourceStream(resourcePath);
    }

    // If no file has been found
    if (stream == null)
    {
        context.Response.StatusCode = 404;
        return;
    }

    context.Response.ContentType = 
        resourcePath.EndsWith(".html") ? "text/html" :
        resourcePath.EndsWith(".js") ? "application/javascript" :
        resourcePath.EndsWith(".css") ? "text/css" :
        "application/octet-stream";

    await stream.CopyToAsync(context.Response.Body);
});

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
