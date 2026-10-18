use std::path::Path;

pub fn remove_dir_contents(dir: &Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                count += remove_dir_contents(&path);
                let _ = std::fs::remove_dir(&path);
            } else if path.is_file() {
                let _ = std::fs::remove_file(&path);
                count += 1;
            }
        }
    }
    count
}