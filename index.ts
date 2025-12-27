#!/usr/bin/env bun
/**
 * Demucs CLI - 主入口
 */

import { runCli } from "./src/cli.js";

// 运行 CLI
runCli().catch((error) => {
  console.error("发生错误:", error);
  process.exit(1);
});
