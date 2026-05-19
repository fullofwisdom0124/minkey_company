import Foundation
import SwiftUI

enum ViewMode {
    case grid
    case detail
}

enum FilterMode: Hashable {
    case all
    case pick
    case reject
    case unflagged
    case rated(Int)
    case color(ColorLabel)
}

enum SortMode: String, CaseIterable, Identifiable {
    case captureDate = "Capture Date"
    case fileName = "File Name"
    case rating = "Rating"

    var id: String { rawValue }
}

@MainActor
final class LibraryStore: ObservableObject {
    @Published var allPhotos: [Photo] = []
    @Published var rootURL: URL?
    @Published var isImporting: Bool = false
    @Published var importProgress: Double = 0

    @Published var viewMode: ViewMode = .grid
    @Published var filter: FilterMode = .all
    @Published var sort: SortMode = .captureDate
    @Published var sortAscending: Bool = true

    @Published var selection: Set<Photo.ID> = []
    @Published var focusedPhotoID: Photo.ID?

    @Published var thumbnailSize: CGFloat = 180
    @Published var showInspector: Bool = true

    var filteredPhotos: [Photo] {
        let base: [Photo]
        switch filter {
        case .all:
            base = allPhotos
        case .pick:
            base = allPhotos.filter { $0.flag == .pick }
        case .reject:
            base = allPhotos.filter { $0.flag == .reject }
        case .unflagged:
            base = allPhotos.filter { $0.flag == .unflagged }
        case .rated(let stars):
            base = allPhotos.filter { $0.rating >= stars }
        case .color(let label):
            base = allPhotos.filter { $0.colorLabel == label }
        }

        let sorted = base.sorted { a, b in
            let result: Bool
            switch sort {
            case .captureDate:
                let da = a.metadata.captureDate ?? .distantPast
                let db = b.metadata.captureDate ?? .distantPast
                result = da < db
            case .fileName:
                result = a.fileName.localizedStandardCompare(b.fileName) == .orderedAscending
            case .rating:
                result = a.rating < b.rating
            }
            return sortAscending ? result : !result
        }
        return sorted
    }

    var focusedPhoto: Photo? {
        guard let id = focusedPhotoID else { return nil }
        return allPhotos.first { $0.id == id }
    }

    func setPhotos(_ photos: [Photo], rootURL: URL?) {
        self.allPhotos = photos
        self.rootURL = rootURL
        self.selection.removeAll()
        self.focusedPhotoID = photos.first?.id
    }

    // MARK: - Navigation

    func selectNext() {
        let visible = filteredPhotos
        guard !visible.isEmpty else { return }
        if let id = focusedPhotoID, let idx = visible.firstIndex(where: { $0.id == id }) {
            let next = min(idx + 1, visible.count - 1)
            focusedPhotoID = visible[next].id
        } else {
            focusedPhotoID = visible.first?.id
        }
    }

    func selectPrevious() {
        let visible = filteredPhotos
        guard !visible.isEmpty else { return }
        if let id = focusedPhotoID, let idx = visible.firstIndex(where: { $0.id == id }) {
            let prev = max(idx - 1, 0)
            focusedPhotoID = visible[prev].id
        } else {
            focusedPhotoID = visible.first?.id
        }
    }

    // MARK: - Flagging / rating

    func toggleFlag(_ flag: PhotoFlag) {
        objectWillChange.send()
        for photo in currentTargets() {
            photo.flag = (photo.flag == flag) ? .unflagged : flag
        }
    }

    func setFlag(_ flag: PhotoFlag, on photo: Photo? = nil) {
        objectWillChange.send()
        let targets = photo.map { [$0] } ?? currentTargets()
        for p in targets { p.flag = flag }
    }

    func setRating(_ rating: Int, on photo: Photo? = nil) {
        objectWillChange.send()
        let targets = photo.map { [$0] } ?? currentTargets()
        let clamped = max(0, min(5, rating))
        for p in targets { p.rating = clamped }
    }

    func setColorLabel(_ label: ColorLabel, on photo: Photo? = nil) {
        objectWillChange.send()
        let targets = photo.map { [$0] } ?? currentTargets()
        for p in targets { p.colorLabel = label }
    }

    private func currentTargets() -> [Photo] {
        if selection.count > 1 {
            return allPhotos.filter { selection.contains($0.id) }
        }
        if let p = focusedPhoto {
            return [p]
        }
        return []
    }

    // MARK: - Counters

    var pickCount: Int { allPhotos.lazy.filter { $0.flag == .pick }.count }
    var rejectCount: Int { allPhotos.lazy.filter { $0.flag == .reject }.count }
    var unflaggedCount: Int { allPhotos.lazy.filter { $0.flag == .unflagged }.count }
}
