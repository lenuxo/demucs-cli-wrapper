/**
 * 音频合并工具函数
 * 用于将多个音频文件合并为一个
 */

import { existsSync } from "node:fs";
import { join, dirname, basename, parse } from "node:path";
import { runInEnv } from "./conda.js";

/**
 * Demucs stem 文件类型
 */
export interface StemFiles {
  drums: string;
  bass: string;
  other: string;
  vocals: string;
}

/**
 * 查找 demucs 输出的 stem 文件
 * @param outputDir demucs 输出基础目录（如 "output"）
 * @param modelName 模型名称（如 "htdemucs"）
 * @param filename 原文件名（不含扩展名）
 * @param format 音频格式（如 "wav"）
 * @returns stem 文件路径对象，如果找不到则返回 null
 */
export function findStemFiles(
  outputDir: string,
  modelName: string,
  filename: string,
  format: string = "wav"
): StemFiles | null {
  const stemDir = join(outputDir, modelName, filename);
  const ext = format.startsWith(".") ? format : `.${format}`;

  const stems: StemFiles = {
    drums: join(stemDir, `drums${ext}`),
    bass: join(stemDir, `bass${ext}`),
    other: join(stemDir, `other${ext}`),
    vocals: join(stemDir, `vocals${ext}`),
  };

  // 检查所有必需的文件是否存在（drums, bass, other）
  const requiredFiles = [stems.drums, stems.bass, stems.other];
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      return null;
    }
  }

  return stems;
}

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
): Promise<{ success: boolean; error?: string }> {
  // 验证输入文件存在
  for (const inputPath of inputPaths) {
    if (!existsSync(inputPath)) {
      return {
        success: false,
        error: `输入文件不存在: ${inputPath}`,
      };
    }
  }

  // 构建 ffmpeg 命令
  // 使用 amix 滤镜混合多个音频
  const args = ["-y"]; // 覆盖已存在文件

  // 添加输入文件
  for (const inputPath of inputPaths) {
    args.push("-i", inputPath);
  }

  // 构建滤镜链
  // 例如 3 个输入: [0:a][1:a][2:a]amix=inputs=3:duration=longest:dropout_transition=2[aout]
  const inputLabels = inputPaths
    .map((_, index) => `[${index}:a]`)
    .join("");
  const filterComplex = `${inputLabels}amix=inputs=${inputPaths.length}:duration=longest:dropout_transition=2[aout]`;

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[aout]",
    outputPath
  );

  try {
    const result = await runInEnv(envName, "ffmpeg", args);

    if (result.exitCode === 0) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.stderr || "ffmpeg 合并失败",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 从完整文件路径中提取文件名（不含扩展名和路径）
 * @param filePath 完整文件路径
 * @returns 文件名（不含扩展名）
 */
export function getFileNameWithoutExt(filePath: string): string {
  const parsed = parse(filePath);
  return parsed.name;
}

/**
 * 获取音频文件格式
 * @param filePath 文件路径
 * @returns 格式字符串（不含点，如 "wav"）
 */
export function getAudioFormat(filePath: string): string {
  const parsed = parse(filePath);
  return parsed.ext.toLowerCase();
}
