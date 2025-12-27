/**
 * 音频文件处理工具函数
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 支持的音频格式
 */
export const SUPPORTED_AUDIO_FORMATS = [
  ".mp3",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".wma",
  ".aiff",
  ".aif",
];

/**
 * 检查文件是否为支持的音频格式
 */
export function isAudioFile(filePath: string): boolean {
  const ext = filePath.toLowerCase();
  return SUPPORTED_AUDIO_FORMATS.some((format) => ext.endsWith(format));
}

/**
 * 递归获取目录下的所有音频文件
 */
export function getAudioFiles(dirPath: string): string[] {
  const audioFiles: string[] = [];

  function traverse(currentPath: string) {
    const stats = statSync(currentPath);

    if (stats.isFile()) {
      if (isAudioFile(currentPath)) {
        audioFiles.push(currentPath);
      }
    } else if (stats.isDirectory()) {
      const entries = readdirSync(currentPath);
      for (const entry of entries) {
        traverse(join(currentPath, entry));
      }
    }
  }

  try {
    traverse(dirPath);
  } catch (error) {
    // 忽略无法访问的文件/目录
  }

  return audioFiles;
}

/**
 * 过滤出有效的音频文件路径
 */
export function filterValidAudioFiles(filePaths: string[]): string[] {
  const validFiles: string[] = [];

  for (const filePath of filePaths) {
    try {
      const stats = statSync(filePath);
      if (stats.isFile() && isAudioFile(filePath)) {
        validFiles.push(filePath);
      }
    } catch {
      // 文件不存在或无法访问，跳过
    }
  }

  return validFiles;
}

/**
 * 获取输出路径
 * 根据原始文件路径生成输出路径
 */
export function getOutputPath(
  inputFile: string,
  outputDir: string
): string {
  // demucs 默认输出格式: output/demucs/{filename}
  // 这里我们返回用户指定的输出目录
  return outputDir;
}
