import Foundation
import AppKit
import ImageIO

/// Asynchronous, in-memory + on-disk thumbnail cache backed by Image I/O.
/// Image I/O can decode RAW, HEIC, JPEG, etc. natively on Apple Silicon Macs.
actor ThumbnailCache {
    static let shared = ThumbnailCache()

    private var memory = NSCache<NSURL, NSImage>()
    private var inFlight: [URL: Task<NSImage?, Never>] = [:]

    private let diskRoot: URL
    private let maxPixel: Int = 512

    init() {
        memory.countLimit = 600
        let support = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let dir = support.appendingPathComponent("PhotoSelectorThumbnails", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        self.diskRoot = dir
    }

    func thumbnail(for url: URL) async -> NSImage? {
        if let img = memory.object(forKey: url as NSURL) {
            return img
        }
        if let task = inFlight[url] {
            return await task.value
        }

        let task = Task<NSImage?, Never> { [diskRoot, maxPixel] in
            let diskURL = Self.diskURL(for: url, in: diskRoot)
            if let data = try? Data(contentsOf: diskURL), let img = NSImage(data: data) {
                return img
            }

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
            let size = NSSize(width: cg.width, height: cg.height)
            let img = NSImage(cgImage: cg, size: size)

            if let tiff = img.tiffRepresentation,
               let rep = NSBitmapImageRep(data: tiff),
               let jpeg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82]) {
                try? jpeg.write(to: diskURL)
            }
            return img
        }
        inFlight[url] = task
        let result = await task.value
        inFlight[url] = nil
        if let result {
            memory.setObject(result, forKey: url as NSURL)
        }
        return result
    }

    private static func diskURL(for url: URL, in root: URL) -> URL {
        let digest = url.absoluteString.data(using: .utf8)?.base64EncodedString()
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "=", with: "") ?? UUID().uuidString
        return root.appendingPathComponent(digest).appendingPathExtension("jpg")
    }
}
