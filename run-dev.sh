#!/bin/bash

# System Optimizer - Development Runner
# This script ensures Cargo is in PATH before running the dev server

echo "🚀 Starting System Optimizer in development mode..."
echo ""

# Source Cargo environment
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
    echo "✓ Cargo environment loaded"
else
    echo "❌ Cargo not found. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if Cargo is available
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo command not found in PATH"
    exit 1
fi

echo "✓ Cargo version: $(cargo --version)"
echo ""
echo "Starting Tauri development server..."
echo "This may take a few minutes on first run..."
echo ""

# Run the development server
npm run tauri dev

# Made with Bob
