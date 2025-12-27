/**
 * 核心处理模块
 * 执行音频分离任务
 */

import chalk from "chalk";
import ora from "ora";
import { runInEnv } from "./utils/conda.js";

/**
 * 处理选项
 */
export interface ProcessOptions {
  env: string;
  device: string;
  model?: string;
  output?: string;
  format?: string;
  jobs?: number;
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * 单文件处理结果
 */
export type ProcessResult = { success: boolean; output?: string; error?: string };

/**
 * 带文件名的处理结果
 */
export type FileProcessResult = { file: string } & ProcessResult;

/**
 * 批量处理结果
 */
export type BatchProcessResult = { success: boolean; results: FileProcessResult[] };

/**
 * 处理单个音频文件
 */
export async function processAudioFile(
  filePath: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  const { env, device, model, output, format, jobs, verbose, dryRun } = options;

  // 构建 demucs 命令
  const args = ["-d", device];

  if (model) {
    args.push("-n", model);
  }

  if (output) {
    args.push("-o", output);
  }

  if (format) {
    args.push("--format", format);
  }

  if (jobs && jobs > 1) {
    args.push("-j", jobs.toString());
  }

  args.push(filePath);

  // 模拟运行
  if (dryRun) {
    const command = `conda run -n ${env} demucs ${args.join(" ")}`;
    return { success: true, output: chalk.gray(`[DRY RUN] ${command}`) };
  }

  // 实际运行
  try {
    const result = await runInEnv(env, "demucs", args);

    if (result.exitCode === 0) {
      return { success: true, output: result.stdout };
    } else {
      return { success: false, error: result.stderr || result.stdout };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 处理多个音频文件（批量处理）
 */
export async function processAudioFiles(
  filePaths: string[],
  options: ProcessOptions
): Promise<BatchProcessResult> {
  const results: FileProcessResult[] = [];
  let successCount = 0;

  for (const filePath of filePaths) {
    const spinner = ora(`处理: ${filePath}`).start();

    const result = await processAudioFile(filePath, options);

    if (result.success) {
      successCount++;
      spinner.succeed(chalk.green(`完成: ${filePath}`));
    } else {
      spinner.fail(chalk.red(`失败: ${filePath}`));
      if (result.error && options.verbose) {
        console.log(chalk.gray(`  错误: ${result.error}`));
      }
    }

    results.push({ file: filePath, ...result });
  }

  const totalSuccess = results.filter((r) => r.success).length;
  console.log(
    totalSuccess === results.length
      ? chalk.green.bold(`\n全部完成! (${results.length}/${results.length})`)
      : chalk.yellow(`\n处理完成: ${totalSuccess}/${results.length} 成功`)
  );

  return {
    success: successCount === filePaths.length,
    results,
  };
}

/**
 * 带进度显示的批量处理
 */
export async function processAudioFilesWithProgress(
  filePaths: string[],
  options: ProcessOptions
): Promise<BatchProcessResult> {
  const { jobs = 1 } = options;

  // 如果并发数为 1，使用串行处理（带进度显示）
  if (jobs === 1) {
    const results: FileProcessResult[] = [];
    let successCount = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      if (!filePath) continue;

      const spinner = ora(`[${i + 1}/${filePaths.length}] 处理: ${filePath}`).start();

      const result = await processAudioFile(filePath, options);

      if (result.success) {
        successCount++;
        spinner.succeed(chalk.green(`[${i + 1}/${filePaths.length}] 完成: ${filePath}`));
      } else {
        spinner.fail(chalk.red(`[${i + 1}/${filePaths.length}] 失败: ${filePath}`));
        if (result.error && options.verbose) {
          console.log(chalk.gray(`  错误: ${result.error}`));
        }
      }

      results.push({ file: filePath, ...result });
    }

    const totalSuccess = results.filter((r) => r.success).length;
    console.log(
      totalSuccess === results.length
        ? chalk.green.bold(`\n全部完成! (${results.length}/${results.length})`)
        : chalk.yellow(`\n处理完成: ${totalSuccess}/${results.length} 成功`)
    );

    return {
      success: successCount === filePaths.length,
      results,
    };
  }

  // 并发处理
  const chunks: string[][] = [];
  for (let i = 0; i < filePaths.length; i += jobs) {
    chunks.push(filePaths.slice(i, i + jobs));
  }

  const results: FileProcessResult[] = [];
  let successCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const chunkResults = await Promise.all(
      chunk.map(async (filePath) => {
        const result = await processAudioFile(filePath, options);
        return { file: filePath, ...result } as FileProcessResult;
      })
    );

    results.push(...chunkResults);
    successCount += chunkResults.filter((r) => r.success).length;

    console.log(
      chalk.gray(`[批次 ${i + 1}/${chunks.length}] 完成 ${chunkResults.filter((r) => r.success).length}/${chunkResults.length}`)
    );
  }

  const totalSuccess = results.filter((r) => r.success).length;
  console.log(
    totalSuccess === results.length
      ? chalk.green.bold(`\n全部完成! (${results.length}/${results.length})`)
      : chalk.yellow(`\n处理完成: ${totalSuccess}/${results.length} 成功`)
  );

  return {
    success: successCount === filePaths.length,
    results,
  };
}
