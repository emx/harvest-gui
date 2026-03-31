# Bundle preparation script for Harvest GUI (Windows)
# Downloads standalone Python, creates venv with harvest, downloads aria2c
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ResourcesDir = Join-Path $ProjectDir "src-tauri\resources"

$PythonVersion = "3.11.11"
$PythonBuildTag = "20250409"
$Aria2Version = "1.37.0"

$PythonTriple = "x86_64-pc-windows-msvc"
$PythonUrl = "https://github.com/indygreg/python-build-standalone/releases/download/$PythonBuildTag/cpython-$PythonVersion+$PythonBuildTag-$PythonTriple-install_only.tar.gz"
$Aria2Url = "https://github.com/aria2/aria2/releases/download/release-$Aria2Version/aria2-$Aria2Version-win-64bit-build1.zip"

Write-Host "=== Harvest GUI Bundle Preparation (Windows) ==="
Write-Host "Resources: $ResourcesDir"
Write-Host ""

# Safety guard: verify path before destructive removal
if (-not $ResourcesDir.EndsWith("src-tauri\resources")) {
    Write-Error "ABORT: ResourcesDir does not end with src-tauri\resources: $ResourcesDir"
    exit 1
}

# Clean previous
if (Test-Path $ResourcesDir) { Remove-Item -Recurse -Force $ResourcesDir }
New-Item -ItemType Directory -Path "$ResourcesDir\bin" -Force | Out-Null

# --- Step 1: Download standalone Python ---
Write-Host ">>> Downloading Python $PythonVersion..."
$PythonTar = "$ResourcesDir\python.tar.gz"
Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonTar
Write-Host ">>> Extracting Python..."
tar xzf $PythonTar -C $ResourcesDir
Remove-Item $PythonTar

$PythonBin = "$ResourcesDir\python\python.exe"
if (-not (Test-Path $PythonBin)) {
    Write-Error "Python binary not found at $PythonBin"
    exit 1
}
& $PythonBin --version

# --- Step 2: Create venv and install harvest ---
Write-Host ">>> Creating venv..."
& $PythonBin -m venv "$ResourcesDir\harvest-venv"

$VenvPip = "$ResourcesDir\harvest-venv\Scripts\pip.exe"
$VenvPython = "$ResourcesDir\harvest-venv\Scripts\python.exe"

Write-Host ">>> Installing harvest..."
$HarvestLocal = "$env:USERPROFILE\projects\harvest"
if (Test-Path $HarvestLocal) {
    Write-Host "    (from local: $HarvestLocal)"
    & $VenvPip install --quiet $HarvestLocal
} else {
    Write-Host "    (from PyPI)"
    & $VenvPip install --quiet harvest
}

Write-Host ">>> Verifying harvest installation..."
& $VenvPython -m harvest --help | Out-Null
Write-Host "    harvest CLI OK"

# --- Step 3: Download aria2c ---
Write-Host ">>> Downloading aria2c $Aria2Version..."
$Aria2Zip = "$ResourcesDir\aria2.zip"
try {
    Invoke-WebRequest -Uri $Aria2Url -OutFile $Aria2Zip
    Expand-Archive -Path $Aria2Zip -DestinationPath "$ResourcesDir\aria2-tmp"
    Copy-Item "$ResourcesDir\aria2-tmp\aria2-$Aria2Version-win-64bit-build1\aria2c.exe" "$ResourcesDir\bin\aria2c.exe"
    Remove-Item -Recurse "$ResourcesDir\aria2-tmp"
    Remove-Item $Aria2Zip
    Write-Host "    aria2c downloaded"
} catch {
    Write-Host "    WARNING: Failed to download aria2c. Skipping."
}

# --- Summary ---
Write-Host ""
Write-Host "=== Bundle Complete ==="
Write-Host "  Python:  $(& $PythonBin --version)"
Write-Host "  Venv:    $ResourcesDir\harvest-venv\"
if (Test-Path "$ResourcesDir\bin\aria2c.exe") {
    Write-Host "  aria2c:  bundled"
} else {
    Write-Host "  aria2c:  not bundled"
}
Write-Host ""
Write-Host "Ready for: cargo tauri build"
