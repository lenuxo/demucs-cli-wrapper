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
  checkPythonDependencies,
  isFfmpegAvailable,
  getFfmpegVersion,
  type DependencyCheckResult,
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
  dependencies: {
    allInstalled: boolean;
    missingCritical: string[];
    results: DependencyCheckResult[];
  };
  ffmpeg: {
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
    dependencies: {
      allInstalled: true,
      missingCritical: [],
      results: [],
    },
    ffmpeg: { available: false },
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
    return result;
  }

  // 检查 Python 依赖
  const depResults = await checkPythonDependencies(envName);
  result.dependencies.results = depResults;

  const missingCritical: string[] = [];
  let allInstalled = true;

  for (const dep of depResults) {
    if (!dep.installed) {
      allInstalled = false;
      if (dep.critical) {
        missingCritical.push(dep.name);
      }
    }
  }

  result.dependencies.allInstalled = allInstalled;
  result.dependencies.missingCritical = missingCritical;

  if (missingCritical.length > 0) {
    result.success = false;
  }

  // 检查 ffmpeg
  const ffmpegAvailable = await isFfmpegAvailable(envName);
  result.ffmpeg.available = ffmpegAvailable;

  if (ffmpegAvailable) {
    const version = await getFfmpegVersion(envName);
    result.ffmpeg.version = version || undefined;
  }
  // 注意：ffmpeg 不可用不影响整体 success，因为 instrumental 生成是可选的

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
    console.log(chalk.gray(`  请运行: conda env update -f environment-cpu.yml`));
    console.log(chalk.gray("  或手动安装:"));
    console.log(chalk.gray(`    conda activate ${result.env.name}`));
    console.log(chalk.gray("    conda install pytorch cpuonly -c pytorch"));
    console.log(chalk.gray("    conda install ffmpeg tqdm -c conda-forge"));
    console.log(chalk.gray("    pip install demucs"));
  }

  // 依赖检查
  if (result.demucs.available && result.dependencies.results.length > 0) {
    console.log(chalk.bold("\nPython 依赖检查:"));

    const installed = result.dependencies.results.filter((d) => d.installed);
    const missing = result.dependencies.results.filter((d) => !d.installed);
    const missingCritical = result.dependencies.results.filter((d) => !d.installed && d.critical);

    // 显示已安装的依赖
    if (installed.length > 0) {
      console.log(chalk.gray("\n已安装的依赖:"));
      for (const dep of installed) {
        const versionStr = dep.version ? chalk.gray(` (${dep.version})`) : "";
        const criticalStr = dep.critical ? chalk.gray(" [关键]") : "";
        console.log(chalk.green(`  ✓ ${dep.name}${versionStr}${criticalStr}`));
      }
    }

    // 显示缺失的依赖
    if (missing.length > 0) {
      console.log(chalk.red("\n缺失的依赖:"));
      for (const dep of missing) {
        const criticalStr = dep.critical ? chalk.red.bold(" [关键]") : chalk.gray(" [可选]");
        console.log(chalk.red(`  ✗ ${dep.name}${criticalStr}`));
      }
    }

    // 如果有关键依赖缺失，显示安装提示
    if (missingCritical.length > 0) {
      console.log(chalk.red.bold("\n⚠️  检测到缺失的关键依赖！"));
      console.log(chalk.yellow("请运行以下命令安装所有依赖:\n"));
      console.log(chalk.gray(`  conda env update -f environment-cpu.yml\n`));
      console.log(chalk.yellow("或手动安装:\n"));
      console.log(chalk.gray("  conda activate demucs"));
      console.log(chalk.gray("  conda install pytorch cpuonly torchaudio -c pytorch"));
      console.log(chalk.gray("  conda install ffmpeg -c conda-forge"));
      console.log(chalk.gray("  pip install diffq hydra-core soundfile julius openunmix einops\n"));
    }
  }

  // FFmpeg 检查
  if (result.ffmpeg.available) {
    console.log(chalk.green("✓ FFmpeg 已安装"));
    if (result.ffmpeg.version) {
      console.log(chalk.gray(`  版本: ${result.ffmpeg.version}`));
    }
  } else {
    console.log(chalk.yellow("⚠ FFmpeg 未安装"));
    console.log(chalk.gray("  注意: FFmpeg 用于生成 instrumental 伴奏文件"));
    console.log(chalk.gray("  安装命令: conda install ffmpeg -c conda-forge -n demucs"));
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
