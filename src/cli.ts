/**
 * CLI 入口模块
 * 解析命令行参数并执行相应操作
 */

import { Command } from "commander";
import chalk from "chalk";
import { checkEnvironment, printCheckResult, checkAudioFiles } from "./checker.js";
import { processAudioFilesWithProgress, processAudioFile } from "./processor.js";
import { getAudioFiles, filterValidAudioFiles } from "./utils/audio.js";
import { readdirSync, statSync } from "node:fs";

export interface CliOptions {
  output?: string;
  device?: string;
  jobs?: number;
  model?: string;
  env?: string;
  format?: string;
  verbose?: boolean;
  check?: boolean;
  dryRun?: boolean;
}

/**
 * 创建 CLI 命令
 */
export function createCli(): Command {
  const program = new Command();

  program
    .name("demucs-cli")
    .description("Demucs 音频分离工具的友好 CLI 包装")
    .version("1.0.0")
    .argument("[input...]", "音频文件或目录路径")
    .option("-o, --output <dir>", "输出目录", "./output")
    .option("-d, --device <device>", "设备类型 (cpu/cuda/mps)", "cpu")
    .option("-j, --jobs <number>", "并发处理任务数", "1")
    .option("-m, --model <model>", "Demucs 模型名称", "htdemucs")
    .option("--env <name>", "Conda 环境名称", "demucs")
    .option("--format <format>", "输出格式 (wav/mp3/flac)")
    .option("-v, --verbose", "详细输出模式", false)
    .option("--check", "仅检查环境，不执行处理")
    .option("--dry-run", "模拟运行，显示将要执行的命令")
    .action(async (inputs: string[], options: CliOptions) => {
      await handleCommand(inputs, options);
    });

  return program;
}

/**
 * 处理命令
 */
async function handleCommand(inputs: string[], options: CliOptions): Promise<void> {
  const envName = options.env || "demucs";

  // 仅检查环境
  if (options.check) {
    const result = await checkEnvironment(envName);
    printCheckResult(result);
    process.exit(result.success ? 0 : 1);
    return;
  }

  // 检查环境
  if (!options.dryRun) {
    console.log(chalk.bold("检查环境..."));
    const checkResult = await checkEnvironment(envName);

    if (!checkResult.success) {
      printCheckResult(checkResult);
      process.exit(1);
      return;
    }

    console.log(chalk.green("✓ 环境检查通过\n"));
  }

  // 没有输入文件，显示帮助
  if (inputs.length === 0) {
    console.log(chalk.yellow("请提供音频文件或目录路径\n"));
    createCli().help();
    process.exit(1);
    return;
  }

  // 收集所有音频文件
  console.log(chalk.bold("收集音频文件..."));
  const audioFiles: string[] = [];

  for (const input of inputs) {
    try {
      const stats = statSync(input);

      if (stats.isFile()) {
        // 单个文件
        audioFiles.push(input);
      } else if (stats.isDirectory()) {
        // 目录，递归查找音频文件
        const files = getAudioFiles(input);
        audioFiles.push(...files);
      }
    } catch (error) {
      console.log(chalk.yellow(`警告: 跳过无效路径: ${input}`));
    }
  }

  // 过滤有效文件
  const validFiles = filterValidAudioFiles(audioFiles);

  if (validFiles.length === 0) {
    console.log(chalk.red("\n未找到有效的音频文件"));
    console.log(chalk.gray("支持的格式: mp3, wav, flac, m4a, aac, ogg, wma, aiff\n"));
    process.exit(1);
    return;
  }

  console.log(chalk.green(`找到 ${validFiles.length} 个音频文件\n`));

  // 处理选项
  const processOptions = {
    env: envName,
    device: options.device || "cpu",
    model: options.model,
    output: options.output,
    format: options.format,
    jobs: options.jobs ? parseInt(options.jobs.toString()) : 1,
    verbose: options.verbose,
    dryRun: options.dryRun,
  };

  // 处理音频文件
  if (options.dryRun) {
    console.log(chalk.bold("模拟运行:\n"));
    for (const file of validFiles) {
      const result = await processAudioFile(file, processOptions);
      if (result.output) {
        console.log(result.output);
      }
    }
  } else {
    console.log(chalk.bold("开始处理...\n"));
    await processAudioFilesWithProgress(validFiles, processOptions);
  }
}

/**
 * 解析命令行参数并执行
 */
export async function runCli(args: string[] = process.argv): Promise<void> {
  const program = createCli();
  await program.parseAsync(args);
}
