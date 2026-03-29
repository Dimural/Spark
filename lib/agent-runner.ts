import { spawn } from "node:child_process";

export type SparkAgentInput = {
  raw_text: string;
  user_id: string;
  user_timezone: string;
};

type SparkAgentOutput = {
  result?: {
    status: string;
    type: "calendar_event" | "reminder" | "note";
    title: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function getPythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
}

function getPythonExecutable() {
  return `${process.cwd()}/agent/.venv/bin/python`;
}

async function invokeAgent(binary: string, input: SparkAgentInput) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, [`${process.cwd()}/agent/run_agent.py`], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr || `Spark agent exited with code ${code}.`));
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

export async function runSparkAgent(input: SparkAgentInput): Promise<SparkAgentOutput> {
  const pythonExecutable = getPythonExecutable();
  const pythonCommand = getPythonCommand();

  try {
    const stdout = await invokeAgent(pythonExecutable, input);
    return JSON.parse(stdout) as SparkAgentOutput;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!message.includes("ENOENT")) {
      throw error;
    }

    const stdout = await invokeAgent(pythonCommand, input);
    return JSON.parse(stdout) as SparkAgentOutput;
  }
}
