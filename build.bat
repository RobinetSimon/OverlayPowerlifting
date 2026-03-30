@echo off
REM ------------------------------
REM Step 1: Build overlay-powerlifting
REM ------------------------------
cd overlay-powerlifting
echo Building overlay-powerlifting...
call npm run build
IF ERRORLEVEL 1 (
    echo Failed to build overlay-powerlifting.
    pause
    exit /b 1
)

REM ------------------------------
REM Step 2: Clean overlay-api\ressources
REM ------------------------------
cd ..\overlay-api
echo Cleaning overlay-api\ressources...
IF EXIST ressources (
    rmdir /s /q ressources
)
mkdir ressources

REM ------------------------------
REM Step 3: Copy overlay-powerlifting/out to overlay-api\ressources
REM ------------------------------
echo Copying built files to overlay-api\ressources...
xcopy /s /e /y ..\overlay-powerlifting\out ressources

REM ------------------------------
REM Step 4: Run dotnet publish inside overlay-api (multiline)
REM ------------------------------
echo Running dotnet publish...
dotnet publish -c Release -r win-x64 ^
 -o out ^
 -p:PublishSingleFile=true ^
 -p:SelfContained=true ^
 -p:PublishTrimmed=true ^
 -p:EnableCompressionInSingleFile=true ^
 -p:UseAppHost=true ^
 -p:InvariantGlobalization=true ^
 -p:PublishReadyToRun=true

IF ERRORLEVEL 1 (
    echo Dotnet publish failed.
    pause
    exit /b 1
)

echo Done.
pause