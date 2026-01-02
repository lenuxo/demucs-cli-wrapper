# Demucs CLI

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md) [![中文](https://img.shields.io/badge/lang-中文-blue.svg)](README.zh-CN.md)

> Demucs 音频分离工具的友好 CLI 包装层，支持自动生成伴奏。

## ✨ 功能特性

- 🎵 **音频源分离** - 将音频分离为 4 个音轨：drums（鼓点）、bass（贝斯）、other（其他乐器）、vocals（人声）
- 🎼 **自动生成伴奏** - 自动合并器乐音轨（drums + bass + other）生成完整的伴奏文件
- 🎧 **多格式支持** - 支持 WAV（默认）或 MP3 格式输出，MP3 比特率可自定义
- 🚀 **批量处理** - 一次处理多个文件或整个目录
- ⚡ **并发处理** - 可选的并行处理，加速完成
- 🔍 **环境验证** - 内置 conda、demucs 和依赖检查
- 🛠️ **Conda 环境隔离** - 干净执行，不污染你的 shell 环境

## 前置要求

- [Bun](https://bun.sh/) 运行时
- [Conda](https://docs.conda.io/en/latest/miniconda.html)（Miniconda 或 Anaconda）
- 名为 `demucs` 的 conda 环境，并已安装 demucs

## 安装

### 局部安装（开发）

```bash
# 安装依赖
bun install
```

### 全局安装

```bash
# 在项目根目录执行
cd /path/to/demucs-cli && bun install -g .

# 或从任意位置安装
bun install -g /path/to/demucs-cli
```

安装后可以在任意位置使用 `demucs-cli` 命令。

## 环境准备

⚠️ **重要**: Demucs 需要完整的依赖环境才能正常运行。仅安装 `demucs` 包可能导致音频处理失败。

### 方法一：使用环境配置文件（推荐）

这是最可靠的方式，确保所有依赖都正确安装：

```bash
# 1. 创建并配置环境（使用项目提供的 environment-cpu.yml）
conda env update -f environment-cpu.yml

# 2. 激活环境
conda activate demucs

# 3. 验证安装
bun run check
```

### 方法二：手动安装

如果无法使用环境配置文件，可以手动安装：

```bash
# 1. 创建 conda 环境
conda create -n demucs python=3.10

# 2. 激活环境
conda activate demucs

# 3. 安装 PyTorch（CPU 版本）
conda install pytorch cpuonly -c pytorch

# 4. 安装其他必要依赖
conda install ffmpeg tqdm -c conda-forge

# 5. 安装 demucs
pip install demucs

# 6. 安装额外的 Python 依赖
pip install diffq dora-search einops hydra-colorlog hydra-core julius lameenc openunmix musdb museval soundfile submitit treetable

# 7. 验证安装
bun run check
```

### 依赖说明

Demucs 依赖以下关键组件：
- **PyTorch**: 深度学习框架
- **FFmpeg**: 音频处理工具
- **其他 Python 包**: diffq、einops、hydra-core、soundfile 等

如果缺少这些依赖，音频处理可能会失败或报错。

## 使用方法

### 基础语法

**全局安装后：**
```bash
demucs-cli [options] <input...>
```

**局部安装（开发）：**
```bash
bun run start [options] <input...>
```

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<input>` | 音频文件或目录路径（支持多个） | - |
| `-o, --output <dir>` | 输出目录 | `./stems` |
| `-d, --device <device>` | 设备类型 (cpu/cuda/mps) | `cpu` |
| `-j, --jobs <number>` | 并发处理任务数 | `1` |
| `-m, --model <model>` | Demucs 模型名称 | `htdemucs` |
| `--env <name>` | Conda 环境名称 | `demucs` |
| `-f, --format <format>` | 输出格式 (wav/mp3) | `wav` |
| `--mp3-bitrate <rate>` | MP3 比特率（如：320k、192k） | `320k` |
| `-v, --verbose` | 详细输出模式 | `false` |
| `--check` | 仅检查环境，不执行处理 | - |
| `--dry-run` | 模拟运行，显示将要执行的命令 | - |

### 使用示例

```bash
# 检查环境
bun run check

# 单文件处理
bun run start song.mp3

# 批量处理目录
bun run start ./songs

# 多文件处理
bun run start song1.mp3 song2.wav

# 自定义输出目录和设备
bun run start -o ./separated -d cuda song.mp3

# 并发处理（4个任务）
bun run start -j 4 ./album

# 输出为 MP3 格式（默认 320k 比特率）
bun run start -f mp3 song.mp3

# 输出为 MP3 格式（自定义比特率）
bun run start -f mp3 --mp3-bitrate 192k song.mp3

# 模拟运行
bun run start --dry-run song.mp3

# 详细输出模式
bun run start -v song.mp3
```

### 输出结构

处理完成后，输出目录中将有 **5 个音频文件**：

```
stems/
└── htdemucs/
    └── {filename}/
        ├── drums.{ext}        # Demucs 输出
        ├── bass.{ext}         # Demucs 输出
        ├── other.{ext}        # Demucs 输出
        ├── vocals.{ext}       # Demucs 输出
        └── instrumental.{ext} # 🆕 自动生成的伴奏
```

## 项目结构

```
demucs-cli/
├── src/
│   ├── cli.ts           # CLI 参数解析与入口
│   ├── checker.ts       # 环境检查模块
│   ├── processor.ts     # 核心处理模块
│   └── utils/
│       ├── conda.ts     # conda 相关工具函数
│       ├── audio.ts     # 音频文件处理工具
│       └── merge.ts     # 音频合并（用于生成伴奏）
├── docs/
│   ├── PRD.md           # 产品需求文档
│   └── PRD-instrumental.md  # 伴奏生成功能 PRD
├── index.ts             # 主入口
├── environment-cpu.yml  # Conda 环境配置文件
└── package.json
```

## 支持的音频格式

- MP3 (.mp3)
- WAV (.wav)
- FLAC (.flac)
- M4A (.m4a)
- AAC (.aac)
- OGG (.ogg)
- WMA (.wma)
- AIFF (.aiff, .aif)

## 开发

```bash
# 运行
bun run start

# 检查环境
bun run check
```

## 关键技术决策

- **Conda 环境隔离**：使用 `conda run -n <env>` 而非 `conda activate`，避免污染 shell
- **Bun 原生 API**：使用 Bun.spawn() 和 Bun.$() 以获得更好的性能
- **默认输出目录**：从 `output` 改为 `stems`，语义更清晰
- **自动生成伴奏**：使用 ffmpeg amix 滤镜合并 drum、bass 和 other 音轨

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT
