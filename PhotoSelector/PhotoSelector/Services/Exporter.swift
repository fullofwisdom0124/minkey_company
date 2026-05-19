import Foundation

enum ExportMode {
    case copy
    case move
}

struct ExportResult {
    var copied: Int
    var skipped: Int
    var failed: [(URL, Error)]
}

enum Exporter {
    static func export(photos: [Photo], to destination: URL, mode: ExportMode = .copy) async throws -> ExportResult {
        let fm = FileManager.default
        try fm.createDirectory(at: destination, withIntermediateDirectories: true)

        var copied = 0
        var skipped = 0
        var failed: [(URL, Error)] = []

        for photo in photos {
            let src = photo.fileURL
            let dst = destination.appendingPathComponent(src.lastPathComponent)

            if fm.fileExists(atPath: dst.path) {
                skipped += 1
                continue
            }

            do {
                switch mode {
                case .copy:
                    try fm.copyItem(at: src, to: dst)
                case .move:
                    try fm.moveItem(at: src, to: dst)
                }
                copied += 1
            } catch {
                failed.append((src, error))
            }
            await Task.yield()
        }

        return ExportResult(copied: copied, skipped: skipped, failed: failed)
    }
}
