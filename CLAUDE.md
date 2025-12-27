---
description: Demucs CLI - AI Development Guide for Demucs Audio Separation Tool Wrapper
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# Demucs CLI - AI 开发指南

## 项目概述

Demucs CLI 是一个用于包装 Demucs 音频分离工具的命令行界面。它的核心价值在于简化 Demucs 的使用流程，自动管理 conda 环境切换，提供友好的 CLI 交互。

### 核心功能
1. **环境管理** - 自动检测和验证 conda 环境、demucs 安装
2. **音频处理** - 调用 demucs 命令进行音频源分离（stems 分离）
3. **批量处理** - 支持目录扫描、多文件并发处理
4. **用户友好** - 彩色输出、进度显示、错误提示

### 运行环境
- **Runtime**: Bun (而非 Node.js)
- **依赖**: Conda 环境（用户本地已有名为 "demucs" 的环境）
- **目标命令**: `conda run -n demucs demucs -d cpu <file>`

---

## 核心架构

### 模块划分

```
src/
├── cli.ts           # CLI 入口 - 参数解析、命令路由
├── checker.ts       # 环境检查 - conda/env/demucs 验证
├── processor.ts     # 核心处理 - 调用 demucs 命令、批量处理逻辑
└── utils/
    ├── conda.ts     # Conda 工具 - 环境检测、命令执行
    └── audio.ts     # 音频工具 - 文件格式识别、目录扫描
```

### 执行流程

```
用户输入命令
    ↓
CLI 参数解析 (cli.ts)
    ↓
环境检查 (checker.ts)
    ↓
音频文件收集 (audio.ts)
    ↓
并发/串行处理 (processor.ts)
    ↓
通过 conda run 执行 demucs (conda.ts)
```

---

## 关键技术决策

### 1. Conda 环境隔离
**核心约束**：不能影响用户当前 shell 环境

**解决方案**：使用 `conda run -n <env> <command>` 而非 `conda activate`
- `conda run` 在子进程中执行，自动处理环境变量
- 避免了 shell 注入风险
- 不需要修改用户 shell 状态

**错误** ❌: `conda activate demucs && demucs ...`
**正确** ✅: `conda run -n demucs demucs ...`

### 2. 进程管理
使用 `Bun.spawn()` 而非 `child_process`
- Bun 原生支持，性能更好
- API 更简洁：`Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })`

### 3. 并发控制
- **串行模式**（jobs=1）：逐个处理，带进度显示
- **并发模式**（jobs>1）：分批处理，每批 jobs 个任务

---

## 开发约束与注意事项

### 必须遵守的原则

1. **环境隔离优先**
   - 永远不要在用户 shell 中执行 `conda activate`
   - 所有命令通过 `conda run` 执行
   - 使用子进程，不要污染主进程环境

2. **错误处理友好**
   - conda 未安装 → 提供安装链接
   - 环境不存在 → 提供创建命令
   - demucs 未安装 → 提供安装步骤
   - 文件无效 → 跳过并提示，不要中断整体流程

3. **Bun 优先**
   - 使用 `Bun.spawn()` 而非 `child_process.spawn()`
   - 使用 `Bun.file()` 而非 `fs.readFile()`
   - 使用 `bun test` 而非 jest/vitest

### 支持的音频格式
```
.mp3, .wav, .flac, .m4a, .aac, .ogg, .wma, .aiff, .aif
```

---

## 通用 Bun 开发规范

以下内容适用于所有基于 Bun 的项目开发：

### 运行时选择
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### Bun API 优先
- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use `Bun.$` for shell commands (similar to execa)

### 测试
Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

---

## 当前项目状态

### 已实现功能 (P0-P1)
- ✅ 环境检查模块
- ✅ 单文件处理
- ✅ 批量目录处理
- ✅ 并发控制
- ✅ 进度显示
- ✅ CLI 参数完整支持

### 待扩展方向 (P2-P3)
- 日志系统
- 配置文件支持
- 更丰富的错误恢复机制
- 输出文件后处理

---

## 常见问题

### Q: 为什么使用 `conda run` 而非直接调用 demucs？
A: 用户可能没有将 conda 环境的 demucs 加入 PATH，使用 `conda run` 确保命令能找到。

### Q: 如何测试 conda 相关功能？
A: 需要本地有 conda 环境。可以使用 `--dry-run` 参数模拟运行，不实际调用 demucs。

### Q: 支持哪些 demucs 参数？
A: 当前支持 `-d` (device), `-n` (model), `-o` (output), `-j` (jobs), `--format`。扩展时参考 demucs 官方文档。
