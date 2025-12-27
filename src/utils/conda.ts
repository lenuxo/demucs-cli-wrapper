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

/**
 * 依赖包检查结果
 */
export interface DependencyCheckResult {
  name: string;
  installed: boolean;
  version?: string;
  critical: boolean;
}

/**
 * 检查 Python 依赖包是否已安装
 *
 * ⚠️ 重要说明：为什么只检查 torch 和 torchaudio？
 *
 * 1. **避免误报问题**：
 *    - 其他依赖（如 ffmpeg、hydra-core、soundfile 等）的检测方式多样，
 *      有些通过 Python 包安装，有些是系统级命令，检测逻辑容易产生误报
 *    - torch 和 torchaudio 是最核心、最容易准确检测的依赖
 *
 * 2. **核心依赖原则**：
 *    - torch 和 torchaudio 是 demucs 运行的基础深度学习框架
 *    - 如果这两个正常，通过 environment-cpu.yml 安装的其他依赖通常也能正常工作
 *    - demucs 本身的导入检查会验证其他依赖是否齐全
 *
 * 3. **实用主义**：
 *    - 简化检查逻辑，提高检查速度和可靠性
 *    - 用户遇到运行时错误时，实际的错误信息会比静态检查更准确
 *
 * 4. **配置文件保证**：
 *    - 推荐使用 environment-cpu.yml 配置环境，确保所有依赖正确安装
 *    - 配置文件包含了完整且经过测试的依赖列表
 */
export async function checkPythonDependencies(
  envName: string
): Promise<DependencyCheckResult[]> {
  // 只检查核心依赖
  const dependencies = [
    { name: "torch", critical: true },
    { name: "torchaudio", critical: true },
  ];

  const results: DependencyCheckResult[] = [];

  for (const dep of dependencies) {
    try {
      // 尝试导入模块来检查是否安装
      const result = await runInEnv(envName, "python", [
        "-c",
        `import importlib.util, sys; spec = importlib.util.find_spec("${dep.name}"); print(spec.origin.split("/")[-1] if spec else "NOT_FOUND"); sys.exit(0 if spec else 1)`,
      ]);

      const installed = result.exitCode === 0;
      let version: string | undefined;

      if (installed) {
        // 尝试获取版本
        try {
          const versionResult = await runInEnv(envName, "python", [
            "-c",
            `import ${dep.name}; version = getattr(${dep.name}, "__version__", "unknown"); print(version)`,
          ]);
          if (versionResult.exitCode === 0) {
            version = versionResult.stdout.trim();
          }
        } catch {
          // 版本获取失败，但包已安装
        }
      }

      results.push({
        name: dep.name,
        installed,
        version,
        critical: dep.critical,
      });
    } catch {
      results.push({
        name: dep.name,
        installed: false,
        critical: dep.critical,
      });
    }
  }

  return results;
}

/**
 * 检查环境中 ffmpeg 是否可用
 */
export async function isFfmpegAvailable(envName: string): Promise<boolean> {
  try {
    const result = await runInEnv(envName, "ffmpeg", ["-version"]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * 获取 ffmpeg 版本
 */
export async function getFfmpegVersion(envName: string): Promise<string | null> {
  try {
    const result = await runInEnv(envName, "ffmpeg", ["-version"]);
    if (result.exitCode === 0) {
      const match = result.stdout.match(/ffmpeg version\s+(\S+)/i);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}
