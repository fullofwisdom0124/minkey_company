import Foundation
import ImageIO
import UniformTypeIdentifiers

enum PhotoImporter {
    static let supportedExtensions: Set<String> = [
        "jpg", "jpeg", "heic", "heif", "png", "tif", "tiff",
        // RAW
        "cr2", "cr3", "crw",       // Canon
        "nef", "nrw",              // Nikon
        "arw", "srf", "sr2",       // Sony
        "raf",                     // Fujifilm
        "orf",                     // Olympus
        "rw2",                     // Panasonic
        "pef",                     // Pentax
        "dng",                     // Adobe / various
        "raw"                      // Generic
    ]

    /// Scan the given folder (recursively) and return Photos with metadata.
    static func scan(folder: URL) async -> [Photo] {
        let fm = FileManager.default
        guard let enumerator = fm.enumerator(
            at: folder,
            includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey],
            options: [.skipsHiddenFiles, .skipsPackageDescendants]
        ) else {
            return []
        }

        var urls: [URL] = []
        for case let url as URL in enumerator {
            let ext = url.pathExtension.lowercased()
            if supportedExtensions.contains(ext) {
                urls.append(url)
            }
        }

        // Sort by file name so chronological order is stable before metadata read.
        urls.sort { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }

        guard !urls.isEmpty else { return [] }

        return await withTaskGroup(of: (Int, Photo).self) { group in
            for (idx, url) in urls.enumerated() {
                group.addTask {
                    let metadata = readMetadata(url: url)
                    return (idx, Photo(fileURL: url, metadata: metadata))
                }
            }

            var indexed: [(Int, Photo)] = []
            for await pair in group {
                indexed.append(pair)
            }
            return indexed.sorted { $0.0 < $1.0 }.map { $0.1 }
        }
    }

    static func readMetadata(url: URL) -> PhotoMetadata {
        var meta = PhotoMetadata()

        if let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
           let size = attrs[.size] as? NSNumber {
            meta.fileSize = size.int64Value
        }

        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any] else {
            return meta
        }

        meta.pixelWidth = props[kCGImagePropertyPixelWidth] as? Int
        meta.pixelHeight = props[kCGImagePropertyPixelHeight] as? Int

        if let tiff = props[kCGImagePropertyTIFFDictionary] as? [CFString: Any] {
            meta.cameraMake = tiff[kCGImagePropertyTIFFMake] as? String
            meta.cameraModel = tiff[kCGImagePropertyTIFFModel] as? String
        }

        if let exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any] {
            if let dateStr = exif[kCGImagePropertyExifDateTimeOriginal] as? String {
                meta.captureDate = parseExifDate(dateStr)
            }
            meta.iso = (exif[kCGImagePropertyExifISOSpeedRatings] as? [Int])?.first
            meta.focalLength = exif[kCGImagePropertyExifFocalLength] as? Double
            if let f = exif[kCGImagePropertyExifFNumber] as? Double {
                meta.aperture = f
            }
            if let exposure = exif[kCGImagePropertyExifExposureTime] as? Double {
                meta.shutterSpeed = formatShutter(exposure)
            }
            meta.lensModel = exif[kCGImagePropertyExifLensModel] as? String
        }

        if meta.captureDate == nil {
            let values = try? url.resourceValues(forKeys: [.contentModificationDateKey, .creationDateKey])
            meta.captureDate = values?.creationDate ?? values?.contentModificationDate
        }

        return meta
    }

    private static func parseExifDate(_ s: String) -> Date? {
        let f = DateFormatter()
        f.dateFormat = "yyyy:MM:dd HH:mm:ss"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        return f.date(from: s)
    }

    private static func formatShutter(_ t: Double) -> String {
        if t >= 1 {
            return String(format: "%.1fs", t)
        } else if t > 0 {
            let denom = Int((1.0 / t).rounded())
            return "1/\(denom)s"
        }
        return "—"
    }
}
