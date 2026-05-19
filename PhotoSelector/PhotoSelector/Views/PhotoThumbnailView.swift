import SwiftUI
import AppKit

struct PhotoThumbnailView: View {
    @EnvironmentObject var store: LibraryStore
    @ObservedObject var photo: Photo
    @State private var image: NSImage?

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(nsColor: .quaternaryLabelColor))

            if let image {
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .clipped()
            } else {
                ProgressView().controlSize(.small)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            if photo.flag == .reject {
                Color.black.opacity(0.5)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }

            overlay
        }
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(borderColor, lineWidth: isSelected ? 3 : (isFocused ? 2 : 0))
        )
        .task(id: photo.id) {
            if let img = await ThumbnailCache.shared.thumbnail(for: photo.fileURL) {
                self.image = img
            }
        }
    }

    private var isSelected: Bool { store.selection.contains(photo.id) }
    private var isFocused: Bool { store.focusedPhotoID == photo.id }

    private var borderColor: Color {
        if isSelected { return .accentColor }
        if isFocused { return Color.accentColor.opacity(0.6) }
        return .clear
    }

    @ViewBuilder
    private var overlay: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                if photo.flag == .pick {
                    badge(systemName: "flag.fill", color: .green)
                } else if photo.flag == .reject {
                    badge(systemName: "flag.slash.fill", color: .red)
                }
                if photo.colorLabel != .none {
                    Circle()
                        .fill(Color(nsColor: photo.colorLabel.nsColor))
                        .frame(width: 10, height: 10)
                        .padding(4)
                        .background(.black.opacity(0.45), in: Circle())
                }
                Spacer()
            }
            Spacer()
            if photo.rating > 0 {
                HStack(spacing: 1) {
                    ForEach(0..<photo.rating, id: \.self) { _ in
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(.yellow)
                    }
                }
                .padding(4)
                .background(.black.opacity(0.45), in: Capsule())
            }
        }
        .padding(6)
    }

    private func badge(systemName: String, color: Color) -> some View {
        Image(systemName: systemName)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(.white)
            .padding(5)
            .background(color, in: Circle())
    }
}
