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

### 1. 创建 conda 环境（如果还没有）

```bash
conda create -n demucs python=3.10
```

### 2. 激活环境并安装 demucs

```bash
conda activate demucs
pip install demucs
```

### 3. 验证安装

```bash
bun run check
```

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
