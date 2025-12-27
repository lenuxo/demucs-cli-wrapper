# Demucs CLI - 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 目标
为 Demucs 音频分离工具提供一个更友好的命令行界面（CLI）包装层，简化用户操作流程。

### 1.2 背景
- Demucs 是一个强大的音频源分离工具，但直接使用需要用户手动管理 conda 环境
- 用户已在本地创建名为 `demucs` 的 conda 环境并安装了 demucs
- 基础命令：`demucs -d cpu PATH_TO_AUDIO_FILE`

---

## 2. 核心功能需求

### 2.1 环境检查模块
**功能描述**：在执行任何操作前检查系统环境

| 检查项 | 说明 | 失败处理 |
|--------|------|----------|
| conda 可用性 | 检测系统是否安装 conda | 提示安装 conda |
| 环境存在性 | 检查 `demucs` conda 环境是否存在 | 提示创建环境 |
| demucs 可用性 | 在环境中验证 demucs 命令可用 | 提示安装 demucs |
| 音频文件 | 验证输入文件是有效的音频格式 | 提示支持的格式 |

### 2.2 核心处理模块
**功能描述**：执行音频分离任务

| 功能 | 实现方式 |
|------|----------|
| 单文件处理 | `demucs -d cpu <file>` |
| 批量处理 | 遍历目录/多个文件，支持并发控制 |
| 环境隔离 | 使用子进程激活 conda 环境，不影响用户 shell |

### 2.3 CLI 参数模块
**功能描述**：提供灵活的命令行接口

### 2.4 输出管理模块
**功能描述**：处理分离结果的输出

| 功能 | 说明 |
|------|------|
| 输出目录 | 支持自定义输出路径 |
| 文件命名 | 保持原文件名或添加后缀 |
| 进度显示 | 显示处理进度和状态 |

---

## 3. CLI 接口设计

### 3.1 基础语法
```bash
demucs-cli [options] <input...>
```

### 3.2 参数定义

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `<input>` | string | - | 音频文件或目录路径（支持多个） |
| `-o, --output` | string | `./output` | 输出目录 |
| `-d, --device` | string | `cpu` | 设备类型 (cpu/cuda/mps) |
| `-j, --jobs` | number | `1` | 并发处理任务数 |
| `-m, --model` | string | `htdemucs` | Demucs 模型名称 |
| `--env` | string | `demucs` | Conda 环境名称 |
| `--format` | string | - | 输出格式 (wav/mp3/flac) |
| `-v, --verbose` | boolean | `false` | 详细输出模式 |
| `-h, --help` | boolean | - | 显示帮助信息 |
| `--check` | boolean | - | 仅检查环境，不执行处理 |
| `--dry-run` | boolean | - | 模拟运行，显示将要执行的命令 |

### 3.3 使用示例

```bash
# 单文件处理
demucs-cli song.mp3

# 批量处理目录
demucs-cli ./songs

# 多文件处理
demucs-cli song1.mp3 song2.wav

# 自定义输出目录和设备
demucs-cli -o ./separated -d cuda song.mp3

# 并发处理（4个任务）
demucs-cli -j 4 ./album

# 仅检查环境
demucs-cli --check

# 模拟运行
demucs-cli --dry-run song.mp3
```

---

## 4. 技术实现要点

### 4.1 Conda 环境隔离方案
**关键**：不能影响用户当前 shell 环境

```typescript
// 使用子进程激活 conda 环境
// 方案：直接调用 conda run 命令
const command = `conda run -n demucs demucs -d cpu ${file}`
```

### 4.2 项目结构建议

```
demucs-cli/
├── src/
│   ├── cli.ts           # CLI 参数解析与入口
│   ├── checker.ts       # 环境检查模块
│   ├── processor.ts     # 核心处理模块
│   ├── output.ts        # 输出管理模块
│   └── utils/
│       ├── conda.ts     # conda 相关工具函数
│       └── audio.ts     # 音频文件处理工具
├── index.ts             # 主入口
├── package.json
└── tsconfig.json
```

### 4.3 依赖建议

```json
{
  "dependencies": {
    "commander": "^12.0.0",  // CLI 框架
    "ora": "^8.0.0",         // 终端加载动画
    "chalk": "^5.3.0"        // 终端颜色输出
  }
}
```

---

## 5. 错误处理

| 场景 | 处理方式 |
|------|----------|
| conda 未安装 | 友好错误提示 + 安装指引 |
| 环境不存在 | 友好错误提示 + 创建命令 |
| demucs 未安装 | 友好错误提示 + 安装命令 |
| 文件不存在 | 列出有效文件，跳过无效文件 |
| 处理失败 | 记录日志，继续处理其他文件 |

---

## 6. 开发优先级

| 阶段 | 内容 |
|------|------|
| **P0** | 环境检查、单文件处理基础功能 |
| **P1** | 批量处理、输出目录管理 |
| **P2** | 并发控制、进度显示 |
| **P3** | 完善错误处理、日志系统 |

---

## 7. 验收标准

1. 能正确检测 conda 和 demucs 环境
2. 能处理单个音频文件
3. 能批量处理目录下的音频文件
4. 不影响用户当前 shell 环境
5. CLI 参数清晰易用
6. 错误提示友好明确
