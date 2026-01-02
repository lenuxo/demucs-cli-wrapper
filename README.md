# Demucs CLI

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md) [![中文](https://img.shields.io/badge/lang-中文-blue.svg)](README.zh-CN.md)

> A user-friendly CLI wrapper for Demucs audio separation tool with automatic instrumental accompaniment generation.

## ✨ Features

- 🎵 **Audio Source Separation** - Separate audio into 4 stems: drums, bass, other, vocals
- 🎼 **Automatic Instrumental Generation** - Automatically merge instrumental stems (drums + bass + other) into a single accompaniment track
- 🎧 **Multiple Format Support** - Output in WAV (default) or MP3 format with customizable bitrate
- 🚀 **Batch Processing** - Process multiple files or entire directories at once
- ⚡ **Concurrent Processing** - Optional parallel processing for faster completion
- 🔍 **Environment Validation** - Built-in checks for conda, demucs, and dependencies
- 🛠️ **Conda Environment Isolation** - Clean execution without polluting your shell

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Conda](https://docs.conda.io/en/latest/miniconda.html) (Miniconda or Anaconda)
- A conda environment named `demucs` with demucs installed

## Installation

### Local Installation (Development)

```bash
# Install dependencies
bun install
```

### Global Installation

```bash
# From project root
cd /path/to/demucs-cli && bun install -g .

# Or from any location
bun install -g /path/to/demucs-cli
```

After installation, use `demucs-cli` command from anywhere.

## Environment Setup

⚠️ **Important**: Demucs requires a complete dependency environment to function properly. Installing only the `demucs` package may cause audio processing failures.

### Method 1: Using Environment Configuration File (Recommended)

This is the most reliable approach to ensure all dependencies are correctly installed:

```bash
# 1. Create and configure environment (using provided environment-cpu.yml)
conda env update -f environment-cpu.yml

# 2. Activate the environment
conda activate demucs

# 3. Verify installation
bun run check
```

### Method 2: Manual Installation

If you cannot use the environment configuration file, install manually:

```bash
# 1. Create conda environment
conda create -n demucs python=3.10

# 2. Activate environment
conda activate demucs

# 3. Install PyTorch (CPU version)
conda install pytorch cpuonly -c pytorch

# 4. Install other required dependencies
conda install ffmpeg tqdm -c conda-forge

# 5. Install demucs
pip install demucs

# 6. Install additional Python dependencies
pip install diffq dora-search einops hydra-colorlog hydra-core julius lameenc openunmix musdb museval soundfile submitit treetable

# 7. Verify installation
bun run check
```

### Dependency Overview

Demucs relies on the following key components:
- **PyTorch**: Deep learning framework
- **FFmpeg**: Audio processing tool
- **Other Python packages**: diffq, einops, hydra-core, soundfile, etc.

Missing these dependencies may cause audio processing to fail or produce errors.

## Usage

### Basic Syntax

**After global installation:**
```bash
demucs-cli [options] <input...>
```

**For local installation (development):**
```bash
bun run start [options] <input...>
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `<input>` | Audio file(s) or directory path (supports multiple) | - |
| `-o, --output <dir>` | Output directory | `./stems` |
| `-d, --device <device>` | Device type (cpu/cuda/mps) | `cpu` |
| `-j, --jobs <number>` | Number of concurrent processing tasks | `1` |
| `-m, --model <model>` | Demucs model name | `htdemucs` |
| `--env <name>` | Conda environment name | `demucs` |
| `-f, --format <format>` | Output format (wav/mp3) | `wav` |
| `--mp3-bitrate <rate>` | MP3 bitrate (e.g., 320k, 192k) | `320k` |
| `-v, --verbose` | Verbose output mode | `false` |
| `--check` | Check environment only, don't process | - |
| `--dry-run` | Simulate run, show commands to be executed | - |

### Examples

```bash
# Check environment
bun run check

# Process single file
bun run start song.mp3

# Batch process directory
bun run start ./songs

# Process multiple files
bun run start song1.mp3 song2.wav

# Custom output directory and device
bun run start -o ./separated -d cuda song.mp3

# Concurrent processing (4 tasks)
bun run start -j 4 ./album

# Output as MP3 (default 320k bitrate)
bun run start -f mp3 song.mp3

# Output as MP3 (custom bitrate)
bun run start -f mp3 --mp3-bitrate 192k song.mp3

# Dry run
bun run start --dry-run song.mp3

# Verbose mode
bun run start -v song.mp3
```

### Output Structure

After processing, you'll find **5 audio files** in the output directory:

```
stems/
└── htdemucs/
    └── {filename}/
        ├── drums.{ext}        # Demucs output
        ├── bass.{ext}         # Demucs output
        ├── other.{ext}        # Demucs output
        ├── vocals.{ext}       # Demucs output
        └── instrumental.{ext} # 🆕 Auto-generated accompaniment
```

## Project Structure

```
demucs-cli/
├── src/
│   ├── cli.ts           # CLI argument parsing and entry point
│   ├── checker.ts       # Environment validation module
│   ├── processor.ts     # Core processing logic
│   └── utils/
│       ├── conda.ts     # Conda utility functions
│       ├── audio.ts     # Audio file handling utilities
│       └── merge.ts     # Audio merging for instrumental generation
├── docs/
│   ├── PRD.md           # Product Requirements Document
│   └── PRD-instrumental.md  # Instrumental feature PRD
├── index.ts             # Main entry point
├── environment-cpu.yml  # Conda environment configuration
└── package.json
```

## Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- FLAC (.flac)
- M4A (.m4a)
- AAC (.aac)
- OGG (.ogg)
- WMA (.wma)
- AIFF (.aiff, .aif)

## Development

```bash
# Run
bun run start

# Check environment
bun run check
```

## Key Technical Decisions

- **Conda Environment Isolation**: Uses `conda run -n <env>` instead of `conda activate` to avoid shell pollution
- **Bun Native APIs**: Leverages Bun.spawn() and Bun.$() for better performance
- **Default Output**: Changed from `output` to `stems` for clearer semantics
- **Automatic Instrumental**: Uses ffmpeg amix filter to merge drum, bass, and other stems

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
