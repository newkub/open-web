use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;
use protocol_rust::RepoInfo;
use vfs_rust::Vfs;

/// wasm-facing virtual filesystem. One instance per loaded project;
/// the JS side owns lifecycle (create on repo load, drop on reset).
#[wasm_bindgen]
pub struct WebVfs {
    inner: Vfs,
}

#[wasm_bindgen]
impl WebVfs {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WebVfs {
        WebVfs {
            inner: Vfs::new(),
        }
    }

    pub fn write_file(&mut self, path: &str, data: &Uint8Array) {
        self.inner.write(path, &data.to_vec());
    }

    /// Returns `undefined` when the path does not exist.
    pub fn read_file(&self, path: &str) -> Option<Uint8Array> {
        self.inner
            .read(path)
            .map(|bytes| Uint8Array::from(bytes))
    }

    pub fn delete_file(&mut self, path: &str) -> bool {
        self.inner.delete(path)
    }

    pub fn rename(&mut self, from: &str, to: &str) -> bool {
        self.inner.rename(from, to)
    }

    pub fn exists(&self, path: &str) -> bool {
        self.inner.exists(path)
    }

    /// Immediate children of `path` as JS array of FileEntry.
    pub fn list(&self, path: &str) -> JsValue {
        serde_wasm_bindgen::to_value(&self.inner.list(path))
            .unwrap_or(JsValue::NULL)
    }

    /// Every file + derived directory, sorted by path.
    pub fn walk(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.inner.walk())
            .unwrap_or(JsValue::NULL)
    }

    pub fn file_count(&self) -> usize {
        self.inner.file_count()
    }

    pub fn total_bytes(&self) -> u64 {
        self.inner.total_bytes()
    }

    /// Bulk load: `entries` is an array of { path, data: Uint8Array }.
    pub fn load_files(&mut self, entries: JsValue) {
        let arr = js_sys::Array::from(&entries);
        for entry in arr.iter() {
            let obj = js_sys::Object::from(entry);
            let get = |k: &str| js_sys::Reflect::get(&obj, &k.into()).unwrap_or(JsValue::UNDEFINED);
            let Some(path) = get("path").as_string() else {
                continue;
            };
            if let Some(u8arr) = get("data").dyn_ref::<Uint8Array>() {
                self.inner.write(&path, &u8arr.to_vec());
            }
        }
    }

    pub fn clear(&mut self) {
        self.inner.clear();
    }
}

/// Repo metadata shown in the UI header.
#[wasm_bindgen]
pub struct WebRepoInfo {
    inner: RepoInfo,
}

#[wasm_bindgen]
impl WebRepoInfo {
    #[wasm_bindgen(getter)]
    pub fn url(&self) -> String {
        self.inner.url.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn owner(&self) -> String {
        self.inner.owner.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn repo(&self) -> String {
        self.inner.repo.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn branch(&self) -> String {
        self.inner.branch.clone()
    }
    #[wasm_bindgen(getter)]
    pub fn file_count(&self) -> usize {
        self.inner.file_count
    }
    #[wasm_bindgen(getter)]
    pub fn total_bytes(&self) -> u64 {
        self.inner.total_bytes
    }
}

/// Build a WebRepoInfo from JS values.
#[wasm_bindgen]
pub fn make_repo_info(
    url: &str,
    owner: &str,
    repo: &str,
    branch: &str,
    file_count: usize,
    total_bytes: u64,
) -> WebRepoInfo {
    WebRepoInfo {
        inner: RepoInfo {
            url: url.to_string(),
            owner: owner.to_string(),
            repo: repo.to_string(),
            branch: branch.to_string(),
            commit_sha: None,
            file_count,
            total_bytes,
        },
    }
}


