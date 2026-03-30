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
builder.Services.AddHttpClient();

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
        var buffer = new byte[64 * 1024];
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

// --- API: Extract Excel data ---
app.MapGet("/getData", (string? excelPath) =>
{
    if (string.IsNullOrWhiteSpace(excelPath))
        return Results.Json(new ErrorResponse("Paramètre excelPath requis"),
            AppJsonContext.Default.ErrorResponse, statusCode: 400);

    try
    {
        var athletes = ExcelService.Extract(Path.GetFullPath(excelPath));
        return Results.Json(athletes, AppJsonContext.Default.ListAthlete);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Excel extraction error: {ex.Message}");
        return Results.Json(new ErrorResponse(ex.Message),
            AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

// --- API: File browser ---
app.MapGet("/browse/drives", () =>
{
    try
    {
        var drives = DriveInfo.GetDrives()
            .Where(d => d.IsReady)
            .Select(d => new BrowseEntry(d.Name, d.RootDirectory.FullName, true, null))
            .ToList();
        return Results.Json(new BrowseResponse("", null, drives), AppJsonContext.Default.BrowseResponse);
    }
    catch (Exception ex)
    {
        return Results.Json(new ErrorResponse(ex.Message), AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

app.MapGet("/browse", (string? path) =>
{
    if (string.IsNullOrWhiteSpace(path))
        return Results.Json(new ErrorResponse("Paramètre path requis"),
            AppJsonContext.Default.ErrorResponse, statusCode: 400);

    try
    {
        var dir = new DirectoryInfo(Path.GetFullPath(path));
        if (!dir.Exists)
            return Results.Json(new ErrorResponse("Répertoire introuvable"),
                AppJsonContext.Default.ErrorResponse, statusCode: 404);

        var entries = new List<BrowseEntry>();

        foreach (var d in dir.EnumerateDirectories().OrderBy(d => d.Name))
        {
            try { entries.Add(new BrowseEntry(d.Name, d.FullName, true, null)); }
            catch { /* skip inaccessible */ }
        }

        var excelExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".xlsx", ".xlsm", ".xls" };
        foreach (var f in dir.EnumerateFiles().Where(f => excelExtensions.Contains(f.Extension)).OrderBy(f => f.Name))
        {
            try { entries.Add(new BrowseEntry(f.Name, f.FullName, false, f.Extension)); }
            catch { /* skip inaccessible */ }
        }

        return Results.Json(new BrowseResponse(dir.FullName, dir.Parent?.FullName, entries),
            AppJsonContext.Default.BrowseResponse);
    }
    catch (Exception ex)
    {
        return Results.Json(new ErrorResponse(ex.Message), AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

// --- API: Upload Excel file ---
app.MapPost("/upload-excel", async (HttpContext context) =>
{
    try
    {
        if (!context.Request.HasFormContentType)
            return Results.Json(new ErrorResponse("Content-Type doit être multipart/form-data"),
                AppJsonContext.Default.ErrorResponse, statusCode: 400);

        var form = await context.Request.ReadFormAsync();
        var file = form.Files.GetFile("file");
        if (file == null || file.Length == 0)
            return Results.Json(new ErrorResponse("Fichier manquant"),
                AppJsonContext.Default.ErrorResponse, statusCode: 400);

        var uploadDir = Path.Combine(AppContext.BaseDirectory, "uploads");
        Directory.CreateDirectory(uploadDir);
        var savePath = Path.Combine(uploadDir, file.FileName);

        await using (var stream = new FileStream(savePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var athletes = ExcelService.Extract(savePath);
        return Results.Json(new UploadExcelResponse(savePath, athletes),
            AppJsonContext.Default.UploadExcelResponse);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Upload Excel error: {ex.Message}");
        return Results.Json(new ErrorResponse(ex.Message),
            AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

// --- API: Logo upload ---
app.MapPost("/upload-logo", async (HttpContext context) =>
{
    try
    {
        var upload = await context.Request.ReadFromJsonAsync(AppJsonContext.Default.LogoUpload);
        if (upload == null || string.IsNullOrWhiteSpace(upload.Data))
            return Results.Json(new ErrorResponse("Données logo manquantes"),
                AppJsonContext.Default.ErrorResponse, statusCode: 400);

        var base64Data = upload.Data;
        if (base64Data.Contains(','))
            base64Data = base64Data[(base64Data.IndexOf(',') + 1)..];

        var bytes = Convert.FromBase64String(base64Data);
        var logoDir = Path.Combine(AppContext.BaseDirectory, "public", "images");
        Directory.CreateDirectory(logoDir);
        var logoPath = Path.Combine(logoDir, "custom-logo.png");
        await File.WriteAllBytesAsync(logoPath, bytes);

        return Results.Json(new UploadResponse("/images/custom-logo.png"), AppJsonContext.Default.UploadResponse);
    }
    catch (Exception ex)
    {
        return Results.Json(new ErrorResponse(ex.Message), AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

// --- API: OpenPowerlifting ---
app.MapGet("/openpowerlifting", async (string? firstName, string? lastName, IHttpClientFactory httpFactory) =>
{
    if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
        return Results.Json(new ErrorResponse("Paramètres firstName et lastName requis"),
            AppJsonContext.Default.ErrorResponse, statusCode: 400);

    try
    {
        var http = httpFactory.CreateClient();
        http.DefaultRequestHeaders.UserAgent.ParseAdd("OverlayPowerlifting/1.0");
        var profile = await OpenPowerliftingService.FetchProfile(http, firstName, lastName);

        if (profile == null)
            return Results.Json(new ErrorResponse($"Profil non trouvé pour {firstName} {lastName}"),
                AppJsonContext.Default.ErrorResponse, statusCode: 404);

        return Results.Json(profile, AppJsonContext.Default.OpenPowerliftingProfile);
    }
    catch (Exception ex)
    {
        return Results.Json(new ErrorResponse(ex.Message), AppJsonContext.Default.ErrorResponse, statusCode: 500);
    }
});

Console.WriteLine($"Overlay server running on http://localhost:{port}");
app.Run();
