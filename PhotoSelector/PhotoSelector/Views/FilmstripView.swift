import SwiftUI

struct FilmstripView: View {
    @EnvironmentObject var store: LibraryStore

    var body: some View {
        ScrollViewReader { scroller in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(store.filteredPhotos) { photo in
                        FilmstripCell(photo: photo)
                            .id(photo.id)
                            .onTapGesture { store.focusedPhotoID = photo.id }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
            }
            .onChange(of: store.focusedPhotoID) { _, new in
                if let id = new {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        scroller.scrollTo(id, anchor: .center)
                    }
                }
            }
        }
    }
}

private struct FilmstripCell: View {
    @EnvironmentObject var store: LibraryStore
    @ObservedObject var photo: Photo
    @State private var image: NSImage?

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 3)
                .fill(Color(nsColor: .quaternaryLabelColor))
            if let image {
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .clipShape(RoundedRectangle(cornerRadius: 3))
            }
            if photo.flag == .pick {
                VStack { HStack { Spacer(); Image(systemName: "flag.fill").font(.system(size: 9)).foregroundStyle(.green).padding(3) }; Spacer() }
            } else if photo.flag == .reject {
                Color.black.opacity(0.5).clipShape(RoundedRectangle(cornerRadius: 3))
            }
        }
        .frame(width: 110, height: 80)
        .overlay(
            RoundedRectangle(cornerRadius: 3)
                .stroke(store.focusedPhotoID == photo.id ? Color.accentColor : .clear, lineWidth: 2)
        )
        .task(id: photo.id) {
            if let img = await ThumbnailCache.shared.thumbnail(for: photo.fileURL) {
                self.image = img
            }
        }
    }
}
