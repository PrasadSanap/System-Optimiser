# Getting Started with System Optimizer

## Prerequisites

Before you can run the System Optimizer application, you need to install the following:

### 1. Node.js and npm
- Download and install from [nodejs.org](https://nodejs.org/)
- Verify installation: `node --version` and `npm --version`

### 2. Rust
The application requires Rust to build the Tauri backend.

**Install Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, restart your terminal and verify:
```bash
rustc --version
cargo --version
```

### 3. Platform-Specific Dependencies

#### macOS
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

#### Windows
Install the following:
- Microsoft Visual Studio C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd /Users/kanwaljeetkaur/Desktop/system-optimizer
   ```

2. **Install npm dependencies:**
   ```bash
   npm install
   ```

3. **Install Rust dependencies (automatic on first build):**
   The Rust dependencies will be downloaded and compiled automatically when you first run the app.

## Running the Application

### Development Mode

Run the application in development mode with hot-reload:

```bash
npm run tauri dev
```

This will:
1. Start the Vite development server for the React frontend
2. Build and launch the Tauri application
3. Enable hot-reload for both frontend and backend changes

**Note:** The first build may take several minutes as Rust compiles all dependencies.

### Production Build

Build the application for production:

```bash
npm run tauri build
```

This creates optimized binaries in `src-tauri/target/release/`.

## Project Structure

```
system-optimizer/
├── src/                          # React frontend
│   ├── components/              # React components (to be added)
│   ├── services/                # API services
│   │   └── tauri.ts            # Tauri API wrapper
│   ├── store/                   # Zustand state management
│   │   └── index.ts            # App store
│   ├── types/                   # TypeScript types
│   │   └── index.ts            # Type definitions
│   ├── utils/                   # Utility functions
│   │   └── format.ts           # Formatting helpers
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # React entry point
│   └── index.css                # Global styles
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── system/             # System monitoring
│   │   │   ├── mod.rs
│   │   │   └── metrics.rs      # Metrics collection
│   │   ├── lib.rs              # Tauri commands
│   │   └── main.rs             # Entry point
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── public/                      # Static assets
├── docs/                        # Documentation
│   ├── system-optimizer-plan.md
│   ├── api-specification.md
│   ├── database-schema.md
│   └── ui-ux-design.md
└── package.json                 # npm dependencies
```

## Current Features

### ✅ Implemented
- Real-time system metrics monitoring (CPU, Memory, Disk, Network)
- Cross-platform support (macOS and Windows)
- Dark mode support
- Modern, responsive UI with Tailwind CSS
- Type-safe API communication between frontend and backend

### 🚧 In Progress
- Boot time analysis
- Startup program management
- System optimization suggestions
- AI-powered recommendations

### 📋 Planned
- Local ML model integration
- Cloud AI integration (optional)
- Performance history tracking
- Optimization actions (clean temp files, etc.)
- Settings panel
- Notification system

## Development Workflow

### Making Changes

1. **Frontend changes** (React/TypeScript):
   - Edit files in `src/`
   - Changes will hot-reload automatically in dev mode

2. **Backend changes** (Rust):
   - Edit files in `src-tauri/src/`
   - The app will rebuild and restart automatically

3. **Adding new Tauri commands**:
   - Define the command in `src-tauri/src/lib.rs`
   - Add it to the `invoke_handler!` macro
   - Create corresponding TypeScript types and API methods

### Testing

```bash
# Run frontend tests (when added)
npm test

# Run Rust tests
cd src-tauri && cargo test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Troubleshooting

### Rust not found
If you get "Rust not found" errors:
1. Install Rust using the command above
2. Restart your terminal
3. Verify with `rustc --version`

### Build errors
If you encounter build errors:
1. Clear the build cache: `cd src-tauri && cargo clean`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Try building again

### Port already in use
If the dev server port is in use:
1. Kill the process using the port
2. Or change the port in `vite.config.ts`

### Permission errors (macOS)
The app may request permissions for:
- System monitoring
- Disk access
- Network access

Grant these permissions in System Preferences > Security & Privacy.

## Next Steps

1. **Install Rust** if you haven't already
2. **Run the app** with `npm run tauri dev`
3. **Explore the code** and start contributing
4. **Check the documentation** in the `docs/` folder for detailed specifications

## Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [sysinfo crate](https://docs.rs/sysinfo/)

## Support

For issues or questions:
- Check the [API Specification](api-specification.md)
- Review the [Technical Plan](system-optimizer-plan.md)
- Open an issue on GitHub (when repository is created)

---

**Happy coding! 🚀**