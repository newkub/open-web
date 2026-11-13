use serde::Serialize;
use std::collections::BTreeMap;

/// A file or directory entry as seen by clients.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

/// In-memory virtual filesystem. Directories are derived from file paths —
/// there is no separate directory table, so the tree can never disagree
/// with the file set.
#[derive(Default)]
pub struct Vfs {
    files: BTreeMap<String, Vec<u8>>,
}

impl Vfs {
    pub fn new() -> Self {
        Self::default()
    }

    /// Normalize a client-supplied path to canonical absolute form:
    /// leading `/`, no duplicate slashes, `.`/`..` resolved, no trailing slash.
    pub fn normalize(path: &str) -> String {
        let mut parts: Vec<&str> = Vec::new();
        let unified = path.replace('\\', "/");
        for seg in unified.split('/') {
            match seg {
                "" | "." => {}
                ".." => {
                    parts.pop();
                }
                s => parts.push(s),
            }
        }
        format!("/{}", parts.join("/"))
    }

    pub fn write(&mut self, path: &str, data: &[u8]) {
        self.files.insert(Self::normalize(path), data.to_vec());
    }

    pub fn read(&self, path: &str) -> Option<&[u8]> {
        self.files.get(&Self::normalize(path)).map(Vec::as_slice)
    }

    pub fn delete(&mut self, path: &str) -> bool {
        let p = Self::normalize(path);
        if self.files.remove(&p).is_some() {
            return true;
        }
        // deleting a directory removes everything under it
        let prefix = format!("{}/", p.trim_end_matches('/'));
        let keys: Vec<String> = self
            .files
            .keys()
            .filter(|k| k.starts_with(&prefix))
            .cloned()
            .collect();
        if keys.is_empty() {
            return false;
        }
        for k in keys {
            self.files.remove(&k);
        }
        true
    }

    pub fn rename(&mut self, from: &str, to: &str) -> bool {
        let src = Self::normalize(from);
        let dst = Self::normalize(to);
        if src == dst {
            return true;
        }
        if let Some(data) = self.files.remove(&src) {
            self.files.insert(dst, data);
            return true;
        }
        // directory rename: move every key under src/
        let prefix = format!("{}/", src.trim_end_matches('/'));
        let moved: Vec<(String, Vec<u8>)> = self
            .files
            .iter()
            .filter(|(k, _)| k.starts_with(&prefix))
            .map(|(k, v)| {
                (
                    format!("{}{}", dst.trim_end_matches('/'), &k[src.len()..]),
                    v.clone(),
                )
            })
            .collect();
        if moved.is_empty() {
            return false;
        }
        let keys: Vec<String> = self
            .files
            .keys()
            .filter(|k| k.starts_with(&prefix))
            .cloned()
            .collect();
        for k in keys {
            self.files.remove(&k);
        }
        for (k, v) in moved {
            self.files.insert(k, v);
        }
        true
    }

    pub fn exists(&self, path: &str) -> bool {
        let p = Self::normalize(path);
        self.files.contains_key(&p)
            || self
                .files
                .keys()
                .any(|k| k.starts_with(&format!("{}/", p.trim_end_matches('/'))))
    }

    /// Immediate children of `path` (files and derived directories).
    pub fn list(&self, path: &str) -> Vec<FileEntry> {
        let dir = Self::normalize(path);
        let prefix = if dir == "/" {
            "/".to_string()
        } else {
            format!("{}/", dir.trim_end_matches('/'))
        };
        let mut entries: BTreeMap<String, FileEntry> = BTreeMap::new();
        for (p, data) in &self.files {
            if let Some(rest) = p.strip_prefix(&prefix) {
                let name = rest.split('/').next().unwrap_or("");
                if name.is_empty() {
                    continue;
                }
                let child_path = format!("{}{}", prefix, name);
                let is_dir = rest.contains('/');
                entries
                    .entry(name.to_string())
                    .or_insert_with(|| FileEntry {
                        path: child_path,
                        name: name.to_string(),
                        is_dir,
                        size: if is_dir { 0 } else { data.len() as u64 },
                    });
            }
        }
        entries.into_values().collect()
    }

    /// Every file and derived directory, depth-first sorted.
    pub fn walk(&self) -> Vec<FileEntry> {
        let mut out = Vec::new();
        let mut dirs = std::collections::BTreeSet::new();
        for (p, data) in &self.files {
            out.push(FileEntry {
                path: p.clone(),
                name: p.rsplit('/').next().unwrap_or(p).to_string(),
                is_dir: false,
                size: data.len() as u64,
            });
            let mut acc = String::new();
            for seg in p.trim_start_matches('/').split('/') {
                if !acc.is_empty() {
                    acc.push('/');
                }
                acc.push_str(seg);
                if acc != p.trim_start_matches('/') {
                    dirs.insert(format!("/{}", acc));
                }
            }
        }
        for d in dirs {
            out.push(FileEntry {
                name: d.rsplit('/').next().unwrap_or(&d).to_string(),
                path: d.clone(),
                is_dir: true,
                size: 0,
            });
        }
        out.sort_by(|a, b| a.path.cmp(&b.path));
        out
    }

    pub fn file_count(&self) -> usize {
        self.files.len()
    }

    pub fn total_bytes(&self) -> u64 {
        self.files.values().map(|v| v.len() as u64).sum()
    }

    pub fn clear(&mut self) {
        self.files.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_paths() {
        assert_eq!(Vfs::normalize("a/b/../c"), "/a/c");
        assert_eq!(Vfs::normalize("./x//y/"), "/x/y");
        assert_eq!(Vfs::normalize("\\win\\path"), "/win/path");
        assert_eq!(Vfs::normalize(".."), "/");
    }

    #[test]
    fn list_derives_dirs() {
        let mut v = Vfs::new();
        v.write("/src/a.ts", b"1");
        v.write("/src/deep/b.ts", b"22");
        v.write("/README.md", b"hi");
        let root = v.list("/");
        assert_eq!(root.len(), 2);
        let src = root.iter().find(|e| e.name == "src").unwrap();
        assert!(src.is_dir);
        let kids = v.list("/src");
        assert_eq!(kids.len(), 2);
        assert!(kids.iter().any(|e| e.name == "deep" && e.is_dir));
    }

    #[test]
    fn delete_dir_recursive() {
        let mut v = Vfs::new();
        v.write("/a/b/c.txt", b"x");
        v.write("/a/d.txt", b"y");
        assert!(v.delete("/a"));
        assert_eq!(v.file_count(), 0);
    }

    #[test]
    fn rename_dir() {
        let mut v = Vfs::new();
        v.write("/old/x.txt", b"1");
        assert!(v.rename("/old", "/new"));
        assert!(v.read("/new/x.txt").is_some());
        assert!(!v.exists("/old"));
    }
}
