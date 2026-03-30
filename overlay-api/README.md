dans overlay-powerlifting:
- bun run build

dans overlay-api:
- bun build .\src\index.js --compile --outfile overlay.exe

ensuite dans un dossier séparé:
- déplacer le overlay-powerlifting/out et le renommer en 'public'
- déplacer le overlay-api/overlay.exe

Les deux doivent être dans le même dossier:
- export/public/...
- export/overlay.exe