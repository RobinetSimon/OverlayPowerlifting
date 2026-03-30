dotnet publish -c Release -r win-x64 ^
 -o out ^
 -p:PublishSingleFile=true ^
 -p:SelfContained=true ^
 -p:PublishTrimmed=true ^
 -p:EnableCompressionInSingleFile=true ^
 -p:UseAppHost=true ^
 -p:InvariantGlobalization=true ^
 -p:PublishReadyToRun=true