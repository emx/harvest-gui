#!/usr/bin/env bash
# Bundle preparation script for Harvest GUI
# Downloads standalone Python, creates venv with harvest, downloads aria2c
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="$PROJECT_DIR/src-tauri/resources"

PYTHON_VERSION="3.11.15"
PYTHON_BUILD_TAG="20260325"
ARIA2_VERSION="1.37.0"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        case "$ARCH" in
            arm64) PYTHON_TRIPLE="aarch64-apple-darwin" ;;
            x86_64) PYTHON_TRIPLE="x86_64-apple-darwin" ;;
            *) echo "Unsupported arch: $ARCH"; exit 1 ;;
        esac
        ;;
    Linux)
        case "$ARCH" in
            x86_64) PYTHON_TRIPLE="x86_64-unknown-linux-gnu" ;;
            aarch64) PYTHON_TRIPLE="aarch64-unknown-linux-gnu" ;;
            *) echo "Unsupported arch: $ARCH"; exit 1 ;;
        esac
        ;;
    *)
        echo "Unsupported OS: $OS (use bundle.ps1 for Windows)"
        exit 1
        ;;
esac

PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/${PYTHON_BUILD_TAG}/cpython-${PYTHON_VERSION}+${PYTHON_BUILD_TAG}-${PYTHON_TRIPLE}-install_only.tar.gz"

echo "=== Harvest GUI Bundle Preparation ==="
echo "Platform: $OS $ARCH"
echo "Resources: $RESOURCES_DIR"
echo ""

# Safety guard: verify path before destructive rm -rf
case "$RESOURCES_DIR" in
    */src-tauri/resources) ;;
    *) echo "ABORT: RESOURCES_DIR does not end with src-tauri/resources: $RESOURCES_DIR"; exit 1 ;;
esac

# Clean previous
rm -rf "$RESOURCES_DIR"
mkdir -p "$RESOURCES_DIR/bin"

# --- Step 1: Download standalone Python ---
echo ">>> Downloading Python $PYTHON_VERSION for $PYTHON_TRIPLE..."
PYTHON_TAR="$RESOURCES_DIR/python.tar.gz"
curl -fSL "$PYTHON_URL" -o "$PYTHON_TAR"
echo ">>> Extracting Python..."
tar xzf "$PYTHON_TAR" -C "$RESOURCES_DIR"
rm "$PYTHON_TAR"

PYTHON_BIN="$RESOURCES_DIR/python/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
    echo "ERROR: Python binary not found at $PYTHON_BIN"
    exit 1
fi
echo ">>> Python: $($PYTHON_BIN --version)"

# --- Step 2: Create venv and install harvest ---
echo ">>> Creating venv..."
"$PYTHON_BIN" -m venv "$RESOURCES_DIR/harvest-venv"

# Copy libpython dylib into venv so the venv Python can find it
# (venv Python's rpath is @executable_path/../lib)
echo ">>> Copying libpython shared library into venv..."
DYLIB_SRC="$RESOURCES_DIR/python/lib/libpython3.11.dylib"
DYLIB_DST="$RESOURCES_DIR/harvest-venv/lib/"
if [ -f "$DYLIB_SRC" ]; then
    mkdir -p "$DYLIB_DST"
    cp "$DYLIB_SRC" "$DYLIB_DST"
    echo "    Copied libpython3.11.dylib to harvest-venv/lib/"
elif [ "$OS" = "Darwin" ]; then
    echo "WARNING: libpython3.11.dylib not found at $DYLIB_SRC"
    echo "    The bundled Python may fail with dylib load errors"
fi

VENV_PIP="$RESOURCES_DIR/harvest-venv/bin/pip"
VENV_PYTHON="$RESOURCES_DIR/harvest-venv/bin/python"

echo ">>> Installing harvest..."
# Try local install first (development), fall back to PyPI
HARVEST_LOCAL="$HOME/projects/harvest"
if [ -d "$HARVEST_LOCAL" ]; then
    echo "    (from local: $HARVEST_LOCAL)"
    "$VENV_PIP" install --quiet "$HARVEST_LOCAL"
else
    echo "    (from PyPI)"
    "$VENV_PIP" install --quiet harvest
fi

echo ">>> Verifying harvest installation..."
"$VENV_PYTHON" -m harvest --help > /dev/null 2>&1 || {
    echo "ERROR: harvest module not runnable"
    exit 1
}
echo "    harvest CLI OK"

# --- Step 3: Download aria2c ---
echo ">>> Downloading aria2c $ARIA2_VERSION..."
case "$OS" in
    Darwin)
        # Use Homebrew bottle or build from source — for now, copy system aria2c if available
        if command -v aria2c &> /dev/null; then
            ARIA2C_PATH="$(command -v aria2c)"
            cp "$ARIA2C_PATH" "$RESOURCES_DIR/bin/aria2c"
            echo "    Copied system aria2c from $ARIA2C_PATH"
        else
            echo "    WARNING: aria2c not found on system. Install with: brew install aria2"
            echo "    Skipping aria2c bundling — harvest will work without it (no --use-aria2)"
        fi
        ;;
    Linux)
        ARIA2_URL="https://github.com/aria2/aria2/releases/download/release-${ARIA2_VERSION}/aria2-${ARIA2_VERSION}-x86_64-linux-gnu.tar.bz2"
        ARIA2_TAR="$RESOURCES_DIR/aria2.tar.bz2"
        if curl -fSL "$ARIA2_URL" -o "$ARIA2_TAR" 2>/dev/null; then
            tar xjf "$ARIA2_TAR" -C "$RESOURCES_DIR/bin/" --strip-components=1 "*/aria2c"
            rm "$ARIA2_TAR"
            echo "    aria2c downloaded"
        else
            echo "    WARNING: Failed to download aria2c. Skipping."
        fi
        ;;
esac

# Make binaries executable
chmod -R +x "$RESOURCES_DIR/bin/" 2>/dev/null || true

# --- Summary ---
echo ""
echo "=== Bundle Complete ==="
echo "  Python:  $($PYTHON_BIN --version)"
echo "  Venv:    $RESOURCES_DIR/harvest-venv/"
if [ -f "$RESOURCES_DIR/bin/aria2c" ]; then
    echo "  aria2c:  $($RESOURCES_DIR/bin/aria2c --version 2>/dev/null | head -1)"
else
    echo "  aria2c:  not bundled"
fi
echo ""
echo "Ready for: cargo tauri build"
