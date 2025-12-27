/**
 * Conda 相关工具函数
 * 用于检查 conda 环境、执行命令等
 */

import { $ } from "bun";

/**
 * 检查 conda 是否可用
 */
export async function isCondaAvailable(): Promise<boolean> {
  try {
    const result = await $`conda --version`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * 获取 conda 版本
 */
export async function getCondaVersion(): Promise<string | null> {
  try {
    const result = await $`conda --version`.quiet();
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 检查指定的 conda 环境是否存在
 */
export async function isEnvExists(envName: string): Promise<boolean> {
  try {
    const result = await $`conda env list`.quiet();
    if (result.exitCode === 0) {
      const output = result.stdout.toString();
      return output.includes(envName);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 在指定的 conda 环境中运行命令
 */
export async function runInEnv(
  envName: string,
  command: string,
  args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const cmd = ["conda", "run", "-n", envName, "--no-capture-output", command, ...args];
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}

/**
 * 检查环境中 demucs 是否可用
 */
export async function isDemucsAvailable(envName: string): Promise<boolean> {
  try {
    const result = await runInEnv(envName, "demucs", ["--help"]);
    // demucs --help 返回 0 表示命令可用
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * 获取 demucs 版本
 */
export async function getDemucsVersion(envName: string): Promise<string | null> {
  try {
    const result = await runInEnv(envName, "demucs", ["--version"]);
    if (result.exitCode === 0) {
      const match = result.stdout.match(/demucs\s+(\d+\.\d+\.\d+)/i);
      return match ? match[1] : result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}
