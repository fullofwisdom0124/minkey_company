import SwiftUI

struct InspectorView: View {
    @EnvironmentObject var store: LibraryStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let photo = store.focusedPhoto {
                    fileSection(photo: photo)
                    Divider()
                    selectionSection(photo: photo)
                    Divider()
                    exifSection(photo: photo)
                } else {
                    Text("No photo selected").foregroundStyle(.secondary)
                }
            }
            .padding(16)
        }
        .background(.regularMaterial)
    }

    private func fileSection(photo: Photo) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(photo.fileName)
                .font(.headline)
                .lineLimit(2)
            if let date = photo.metadata.captureDate {
                Text(date.formatted(date: .abbreviated, time: .shortened))
                    .foregroundStyle(.secondary)
                    .font(.caption)
            }
            if let w = photo.metadata.pixelWidth, let h = photo.metadata.pixelHeight {
                Text("\(w) × \(h)").font(.caption).foregroundStyle(.secondary)
            }
            if let size = photo.metadata.fileSize {
                Text(ByteCountFormatter.string(fromByteCount: size, countStyle: .file))
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func selectionSection(photo: Photo) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Selection").font(.subheadline.bold())

            HStack(spacing: 6) {
                flagButton(.pick, label: "Pick", color: .green, current: photo.flag)
                flagButton(.reject, label: "Reject", color: .red, current: photo.flag)
                flagButton(.unflagged, label: "Clear", color: .gray, current: photo.flag)
            }

            HStack(spacing: 2) {
                ForEach(1...5, id: \.self) { i in
                    Image(systemName: i <= photo.rating ? "star.fill" : "star")
                        .foregroundStyle(.yellow)
                        .onTapGesture {
                            store.setRating(photo.rating == i ? 0 : i, on: photo)
                        }
                }
            }

            HStack(spacing: 6) {
                ForEach(ColorLabel.allCases) { label in
                    Circle()
                        .fill(label == .none ? Color.gray.opacity(0.3) : Color(nsColor: label.nsColor))
                        .frame(width: 18, height: 18)
                        .overlay(
                            Circle().stroke(photo.colorLabel == label ? Color.primary : .clear, lineWidth: 2)
                        )
                        .onTapGesture { store.setColorLabel(label, on: photo) }
                }
            }
        }
    }

    private func flagButton(_ flag: PhotoFlag, label: String, color: Color, current: PhotoFlag) -> some View {
        Button {
            if let p = store.focusedPhoto { store.setFlag(flag, on: p) }
        } label: {
            Text(label)
                .font(.caption)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(current == flag ? color : Color.gray.opacity(0.2), in: Capsule())
                .foregroundStyle(current == flag ? .white : .primary)
        }
        .buttonStyle(.plain)
    }

    private func exifSection(photo: Photo) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Camera").font(.subheadline.bold())
            row("Make", photo.metadata.cameraMake)
            row("Model", photo.metadata.cameraModel)
            row("Lens", photo.metadata.lensModel)
            if let f = photo.metadata.focalLength { row("Focal", "\(Int(f))mm") }
            if let a = photo.metadata.aperture { row("Aperture", String(format: "f/%.1f", a)) }
            row("Shutter", photo.metadata.shutterSpeed)
            if let iso = photo.metadata.iso { row("ISO", "\(iso)") }
        }
    }

    @ViewBuilder
    private func row(_ key: String, _ value: String?) -> some View {
        if let value, !value.isEmpty {
            HStack(alignment: .top) {
                Text(key).font(.caption).foregroundStyle(.secondary).frame(width: 60, alignment: .leading)
                Text(value).font(.caption)
                Spacer()
            }
        }
    }
}
