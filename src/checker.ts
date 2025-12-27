/**
 * 环境检查模块
 * 检查 conda、环境、demucs 等是否正确配置
 */

import chalk from "chalk";
import {
  isCondaAvailable,
  getCondaVersion,
  isEnvExists,
  isDemucsAvailable,
  getDemucsVersion,
} from "./utils/conda.js";

/**
 * 环境检查结果
 */
export interface CheckResult {
  success: boolean;
  conda: {
    available: boolean;
    version?: string;
  };
  env: {
    exists: boolean;
    name: string;
  };
  demucs: {
    available: boolean;
    version?: string;
  };
}

/**
 * 执行环境检查
 */
export async function checkEnvironment(envName: string = "demucs"): Promise<CheckResult> {
  const result: CheckResult = {
    success: true,
    conda: { available: false },
    env: { exists: false, name: envName },
    demucs: { available: false },
  };

  // 检查 conda
  const condaAvailable = await isCondaAvailable();
  result.conda.available = condaAvailable;

  if (condaAvailable) {
    const version = await getCondaVersion();
    result.conda.version = version || undefined;
  } else {
    result.success = false;
    return result;
  }

  // 检查环境
  const envExists = await isEnvExists(envName);
  result.env.exists = envExists;

  if (!envExists) {
    result.success = false;
    return result;
  }

  // 检查 demucs
  const demucsAvailable = await isDemucsAvailable(envName);
  result.demucs.available = demucsAvailable;

  if (demucsAvailable) {
    const version = await getDemucsVersion(envName);
    result.demucs.version = version || undefined;
  } else {
    result.success = false;
  }

  return result;
}

/**
 * 打印检查结果
 */
export function printCheckResult(result: CheckResult): void {
  console.log(chalk.bold("\n环境检查结果:\n"));

  // Conda 检查
  if (result.conda.available) {
    console.log(chalk.green("✓ Conda 已安装"));
    if (result.conda.version) {
      console.log(chalk.gray(`  版本: ${result.conda.version}`));
    }
  } else {
    console.log(chalk.red("✗ Conda 未安装"));
    console.log(chalk.gray("  请访问 https://docs.conda.io/en/latest/miniconda.html 安装 Miniconda 或 Anaconda"));
  }

  // 环境检查
  if (result.env.exists) {
    console.log(chalk.green(`✓ Conda 环境 '${result.env.name}' 存在`));
  } else {
    console.log(chalk.red(`✗ Conda 环境 '${result.env.name}' 不存在`));
    console.log(chalk.gray(`  请运行: conda create -n ${result.env.name} python=3.10`));
  }

  // Demucs 检查
  if (result.demucs.available) {
    console.log(chalk.green("✓ Demucs 已安装"));
    if (result.demucs.version) {
      console.log(chalk.gray(`  版本: ${result.demucs.version}`));
    }
  } else {
    console.log(chalk.red("✗ Demucs 未安装或不可用"));
    console.log(chalk.gray(`  请运行: conda install -c conda-forge demucs`));
    console.log(chalk.gray("  或激活环境后手动安装:"));
    console.log(chalk.gray(`    conda activate ${result.env.name}`));
    console.log(chalk.gray("    pip install demucs"));
  }

  console.log();

  if (result.success) {
    console.log(chalk.green.bold("环境检查通过！可以开始处理音频文件。\n"));
  } else {
    console.log(chalk.red.bold("环境检查失败！请解决上述问题后重试。\n"));
  }
}

/**
 * 检查音频文件
 */
export function checkAudioFiles(files: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const file of files) {
    try {
      const stats = Bun.file(file);
      if (stats.size > 0) {
        const ext = file.toLowerCase();
        const supportedExts = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".wma", ".aiff", ".aif"];
        if (supportedExts.some(e => ext.endsWith(e))) {
          valid.push(file);
        } else {
          invalid.push(file);
        }
      } else {
        invalid.push(file);
      }
    } catch {
      invalid.push(file);
    }
  }

  return { valid, invalid };
}
