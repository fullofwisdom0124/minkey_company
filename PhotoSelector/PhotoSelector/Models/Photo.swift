import Foundation
import AppKit

enum PhotoFlag: Int, Codable, CaseIterable {
    case unflagged = 0
    case pick = 1
    case reject = -1

    var symbolName: String {
        switch self {
        case .pick: return "flag.fill"
        case .reject: return "flag.slash.fill"
        case .unflagged: return "flag"
        }
    }
}

enum ColorLabel: Int, Codable, CaseIterable, Identifiable {
    case none = 0
    case red = 1
    case yellow = 2
    case green = 3
    case blue = 4
    case purple = 5

    var id: Int { rawValue }

    var nsColor: NSColor {
        switch self {
        case .none: return .clear
        case .red: return .systemRed
        case .yellow: return .systemYellow
        case .green: return .systemGreen
        case .blue: return .systemBlue
        case .purple: return .systemPurple
        }
    }

    var displayName: String {
        switch self {
        case .none: return "None"
        case .red: return "Red"
        case .yellow: return "Yellow"
        case .green: return "Green"
        case .blue: return "Blue"
        case .purple: return "Purple"
        }
    }
}

struct PhotoMetadata: Codable, Hashable {
    var pixelWidth: Int?
    var pixelHeight: Int?
    var captureDate: Date?
    var cameraMake: String?
    var cameraModel: String?
    var lensModel: String?
    var focalLength: Double?
    var aperture: Double?
    var shutterSpeed: String?
    var iso: Int?
    var fileSize: Int64?

    var aspectRatio: CGFloat {
        guard let w = pixelWidth, let h = pixelHeight, h > 0 else { return 3.0 / 2.0 }
        return CGFloat(w) / CGFloat(h)
    }
}

final class Photo: Identifiable, ObservableObject, Hashable, @unchecked Sendable {
    let id: UUID
    let fileURL: URL
    let fileName: String
    let metadata: PhotoMetadata

    @Published var flag: PhotoFlag = .unflagged
    @Published var rating: Int = 0
    @Published var colorLabel: ColorLabel = .none

    init(fileURL: URL, metadata: PhotoMetadata) {
        self.id = UUID()
        self.fileURL = fileURL
        self.fileName = fileURL.lastPathComponent
        self.metadata = metadata
    }

    static func == (lhs: Photo, rhs: Photo) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
