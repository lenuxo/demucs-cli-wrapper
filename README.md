# Demucs CLI

Demucs 音频分离工具的友好 CLI 包装层。

## 前置要求

- [Bun](https://bun.sh/) runtime
- [Conda](https://docs.conda.io/en/latest/miniconda.html) (Miniconda 或 Anaconda)
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

# 或者从任意位置安装
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
- **其他 Python 包**: diffq, einops, hydra-core, soundfile 等

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
| `-o, --output <dir>` | 输出目录 | `./output` |
| `-d, --device <device>` | 设备类型 (cpu/cuda/mps) | `cpu` |
| `-j, --jobs <number>` | 并发处理任务数 | `1` |
| `-m, --model <model>` | Demucs 模型名称 | `htdemucs` |
| `--env <name>` | Conda 环境名称 | `demucs` |
| `--format <format>` | 输出格式 (wav/mp3/flac) | - |
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

# 模拟运行
bun run start --dry-run song.mp3

# 详细输出模式
bun run start -v song.mp3
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
│       └── audio.ts     # 音频文件处理工具
├── docs/
│   └── PRD.md           # 产品需求文档
├── index.ts             # 主入口
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

## License

MIT
