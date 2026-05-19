import Foundation
import AppKit
import ImageIO

/// Loads a display-sized image for the detail view. Decodes at a capped pixel size
/// so 50MP RAW files don't blow up memory while still looking sharp on a 5K display.
actor ImageLoader {
    static let shared = ImageLoader()

    private var memory = NSCache<NSURL, NSImage>()
    private var inFlight: [URL: Task<NSImage?, Never>] = [:]

    init() {
        memory.countLimit = 8
    }

    func load(url: URL, maxPixel: Int = 4096) async -> NSImage? {
        if let img = memory.object(forKey: url as NSURL) {
            return img
        }
        if let task = inFlight[url] {
            return await task.value
        }
        let task = Task<NSImage?, Never> {
            guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
            let opts: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageIfAbsent: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true,
                kCGImageSourceThumbnailMaxPixelSize: maxPixel
            ]
            guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else {
                return nil
            }
            return NSImage(cgImage: cg, size: NSSize(width: cg.width, height: cg.height))
        }
        inFlight[url] = task
        let result = await task.value
        inFlight[url] = nil
        if let result {
            memory.setObject(result, forKey: url as NSURL)
        }
        return result
    }

    /// Load a higher-resolution version for 100% pixel-peeping.
    func loadFull(url: URL) async -> NSImage? {
        await load(url: url, maxPixel: 8192)
    }
}
