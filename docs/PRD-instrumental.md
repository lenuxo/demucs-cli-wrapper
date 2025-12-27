# Instrumental 伴奏生成功能 - 产品需求文档

## 1. 功能概述

### 1.1 背景
当前 demucs 分离音频后输出 4 个 stem 文件：
- `drums.{ext}` - 鼓点
- `bass.{ext}` - 贝斯
- `other.{ext}` - 其他乐器
- `vocals.{ext}` - 人声

用户希望在保留这 4 个文件的基础上，**自动生成**第 5 个音频文件：
- `instrumental.{ext}` - 完整伴奏（drums + bass + other 的混合）

### 1.2 目标
- ✅ **默认行为**：所有音频分离操作都自动生成 instrumental，无需额外参数
- ✅ **保留原文件**：demucs 输出的 4 个 stem 文件保持不变
- ✅ **格式一致**：instrumental 文件格式与 demucs 输出格式相同
- ✅ **质量无损**：使用 ffmpeg 混音，保证音质

---

## 2. 技术方案

### 2.1 Demucs 输出结构分析

demucs 默认输出路径：
```
stems/
└── htdemucs/              # 模型名称（默认为 htdemucs）
    └── {filename}/        # 原文件名（不含扩展名）
        ├── drums.wav
        ├── bass.wav
        ├── other.wav
        └── vocals.wav
```

如果用户指定了 `-o custom_output` 和 `-n mdx`：
```
custom_output/
└── mdx/
    └── {filename}/
        ├── drums.wav
        ├── bass.wav
        ├── other.wav
        └── vocals.wav
```

### 2.2 实现流程

```
用户执行 demucs-cli
    ↓
调用 demucs 分离音频
    ↓
等待 demucs 完成
    ↓
检测输出目录中的 4 个 stem 文件
    ↓
调用 ffmpeg 合成 instrumental
    ├─ 成功 → 创建 instrumental.{ext}
    └─ 失败 → 记录警告，不影响主流程
    ↓
完成处理（总共 5 个文件）
```

### 2.3 FFmpeg 命令

使用 `amix` 滤镜混合 3 个音频文件：

```bash
ffmpeg -y \
  -i drums.wav \
  -i bass.wav \
  -i other.wav \
  -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=longest:dropout_transition=2[aout]" \
  -map "[aout]" \
  instrumental.wav
```

**参数说明：**
- `-y`: 覆盖已存在文件
- `-filter_complex`: 使用复杂滤镜
- `amix=inputs=3`: 混合 3 个音频输入
- `duration=longest`: 以最长的音频为时长标准
- `dropout_transition=2`: 音频结束时的淡出时间（秒）

---

## 3. 代码设计

### 3.1 新增模块：`src/utils/merge.ts`

**职责：** 音频文件合并逻辑

```typescript
/**
 * 合并多个音频文件为一个
 * @param inputPaths 输入音频文件路径数组
 * @param outputPath 输出文件路径
 * @param envName conda 环境名称
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function mergeAudioFiles(
  inputPaths: string[],
  outputPath: string,
  envName: string
): Promise<{ success: boolean; error?: string }>

/**
 * 查找 demucs 输出的 stem 文件
 * @param outputDir demucs 输出目录（包含 {model}/{filename}/ 的父目录）
 * @param modelName 模型名称（如 htdemucs）
 * @param filename 原文件名（不含扩展名）
 * @returns Promise<{ drums: string; bass: string; other: string; vocals: string } | null>
 */
export async function findStemFiles(
  outputDir: string,
  modelName: string,
  filename: string
): Promise<{ drums: string; bass: string; other: string; vocals: string } | null>
```

### 3.2 修改模块：`src/processor.ts`

**改动点：** 在 `processAudioFile` 函数末尾添加 instrumental 生成逻辑

```typescript
export async function processAudioFile(
  filePath: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  // ... 现有 demucs 调用逻辑 ...

  if (result.exitCode === 0) {
    // ✅ demucs 成功，生成 instrumental
    const instrumentalResult = await createInstrumental(
      filePath,
      options
    );

    if (instrumentalResult.success) {
      console.log(chalk.gray("  ✓ 已生成 instrumental 伴奏"));
    } else if (options.verbose) {
      console.log(chalk.yellow(`  ⚠ instrumental 生成失败: ${instrumentalResult.error}`));
    }

    return { success: true, output: result.stdout };
  } else {
    return { success: false, error: result.stderr || result.stdout };
  }
}
```

**新增函数：**

```typescript
/**
 * 创建 instrumental 伴奏
 * @param filePath 原音频文件路径
 * @param options 处理选项
 */
async function createInstrumental(
  filePath: string,
  options: ProcessOptions
): Promise<{ success: boolean; error?: string }> {
  // 1. 解析输出路径、模型名称、文件名
  // 2. 查找 drums/bass/other 文件
  // 3. 调用 ffmpeg 合并
  // 4. 返回结果
}
```

### 3.3 修改接口：`ProcessOptions`

**新增字段：**

```typescript
export interface ProcessOptions {
  env: string;
  device: string;
  model?: string;          // 默认: "htdemucs"
  output?: string;         // 默认: "output"
  format?: string;         // 默认: "wav"
  jobs?: number;
  verbose?: boolean;
  dryRun?: boolean;
}
```

> **说明：** 现有的 `model`、`output`、`format` 字段已经满足需求，无需新增

---

## 4. 边界情况处理

### 4.1 Stem 文件缺失

**场景：** demucs 输出目录中缺少 drums/bass/other 某个文件

**处理：**
- 检查所有 3 个必需文件是否存在
- 如果缺失任何一个，跳过 instrumental 生成
- 输出警告信息（verbose 模式下显示详细信息）

### 4.2 FFmpeg 不可用

**场景：** conda 环境中没有安装 ffmpeg

**处理：**
- 捕获 ffmpeg 执行错误
- 记录警告："ffmpeg 不可用，跳过 instrumental 生成"
- 主流程不受影响（4 个 stem 文件已正常生成）

### 4.3 并发处理冲突

**场景：** 用户使用 `-j 4` 同时处理 4 个文件

**处理：**
- instrumental 生成在单个文件处理完成后立即执行
- 不同文件的 instrumental 生成互不干扰（不同输出目录）

### 4.4 自定义输出格式

**场景：** 用户指定 `--format mp3`

**处理：**
- 检测 stem 文件扩展名（如 `drums.mp3`）
- instrumental 使用相同格式（`instrumental.mp3`）

---

## 5. 用户体验

### 5.1 输出示例

**成功场景：**
```
✓ [1/1] 处理: test-files/audio.mp3
  ✓ 已生成 instrumental 伴奏

全部完成! (1/1)
```

**详细输出（verbose 模式）：**
```
✓ [1/1] 处理: test-files/audio.mp3
  → 合并: stems/htdemucs/audio/{drums,bass,other}.wav
  → 生成: stems/htdemucs/audio/instrumental.wav
  ✓ 已生成 instrumental 伴奏

全部完成! (1/1)
```

**警告场景：**
```
✓ [1/1] 处理: test-files/audio.mp3
  ⚠ instrumental 生成失败: 找不到 bass.wav 文件

处理完成: 1/1 成功
```

### 5.2 文件结构（处理完成后）

```
stems/
└── htdemucs/
    └── audio/
        ├── drums.wav        # demucs 输出
        ├── bass.wav         # demucs 输出
        ├── other.wav        # demucs 输出
        ├── vocals.wav       # demucs 输出
        └── instrumental.wav # 🆕 自动生成
```

---

## 6. 依赖检查

### 6.1 环境检查增强

在 `src/checker.ts` 中新增 ffmpeg 可用性检查：

```typescript
export interface CheckResult {
  // ... 现有字段 ...
  ffmpeg: {
    available: boolean;
    version?: string;
  };
}
```

### 6.2 启动时检查

CLI 启动时自动检查 ffmpeg：
- ✅ ffmpeg 可用 → 正常处理，生成 instrumental
- ⚠️ ffmpeg 不可用 → 显示警告，继续处理（不生成 instrumental）

```typescript
⚠️  警告: ffmpeg 不可用，将无法生成 instrumental 伴奏
   建议: conda install -c conda-forge ffmpeg
```

---

## 7. 性能影响

### 7.1 时间开销

- demucs 处理：约 10-60 秒（取决于音频长度和设备）
- ffmpeg 合并：约 0.5-2 秒

**影响：** 增加约 2-5% 的总处理时间（可接受）

### 7.2 磁盘占用

以 3 分钟的 WAV 文件为例：
- 4 个 stems：约 150MB（每个 30-40MB）
- 1 个 instrumental：约 30-40MB

**增加：** 约 20-25% 的磁盘占用

---

## 8. 实现优先级

### P0 - 核心功能
- [ ] 实现 `mergeAudioFiles` 函数
- [ ] 实现 `findStemFiles` 函数
- [ ] 在 `processAudioFile` 中集成 instrumental 生成
- [ ] 错误处理和日志输出

### P1 - 增强功能
- [ ] ffmpeg 可用性检查
- [ ] verbose 模式下的详细信息输出
- [ ] 自定义格式支持（mp3/flac 等）

### P2 - 优化改进
- [ ] 进度显示优化（显示 "正在生成伴奏..."）
- [ ] 批量处理时的汇总统计
- [ ] 并发性能优化

---

## 9. 测试用例

### 9.1 基础功能测试
```bash
# 测试默认行为
demucs-cli audio.mp3
# 预期：生成 5 个文件（4 stems + 1 instrumental）

# 测试自定义输出目录
demucs-cli audio.mp3 -o custom_output
# 预期：custom_output/htdemucs/audio/ 下有 5 个文件

# 测试自定义模型
demucs-cli audio.mp3 -n mdx
# 预期：stems/mdx/audio/ 下有 5 个文件
```

### 9.2 边界情况测试
```bash
# 测试批量处理
demucs-cli test-files/ -j 2
# 预期：每个文件都生成对应的 instrumental

# 测试 ffmpeg 不可用
# 临时重命名 ffmpeg
conda rename -n demucs ffmpeg ffmpeg.bak
demucs-cli audio.mp3
# 预期：显示警告，4 个 stem 文件正常生成
```

---

## 10. 上线计划

1. **阶段一**：实现核心功能（P0）
2. **阶段二**：本地测试各种边界情况
3. **阶段三**：更新文档（README.md）
4. **阶段四**：发布到生产环境

---

## 附录：参考资源

- [FFmpeg 官方文档 - Audio Filters](https://ffmpeg.org/ffmpeg-filters.html#Audio-Filters)
- [Demucs 输出格式说明](https://github.com/facebookresearch/demucs)
- [Conda 环境中安装 FFmpeg](https://anaconda.org/conda-forge/ffmpeg)
