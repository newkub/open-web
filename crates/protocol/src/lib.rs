use serde::{Deserialize, Serialize};

/// Identifies a loaded repository.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RepoInfo {
    pub url: String,
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub commit_sha: Option<String>,
    pub file_count: usize,
    pub total_bytes: u64,
}

/// Events emitted by the runtime layer to the terminal/UI.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RuntimeEvent {
    Boot { tier: String, message: String },
    Output { stream: Stream, data: String },
    Exit { code: i32 },
    Error { message: String },
    PortOpen { port: u16, url: String },
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Stream {
    Stdout,
    Stderr,
}

/// A command submitted to the active runtime.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShellCommand {
    pub line: String,
}

/// Runtime tiers, ordered by capability vs cost.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeTier {
    /// Browser JS engine + Bun.wasm toolchain + node:* shims. Instant, JS-only.
    EdgeJs,
    /// WASIX / nodert — real Node semantics, still client-side.
    Wasix,
    /// Full Linux VM (CheerpX/WebVM). Native binaries, python, gcc.
    FullVm,
}
