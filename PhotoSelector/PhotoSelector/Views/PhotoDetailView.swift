import SwiftUI
import AppKit

struct PhotoDetailView: View {
    @EnvironmentObject var store: LibraryStore
    @State private var image: NSImage?
    @State private var loadingURL: URL?
    @State private var zoom: CGFloat = 1.0
    @State private var pan: CGSize = .zero

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Color.black

                if let image, let photo = store.focusedPhoto, photo.fileURL == loadingURL {
                    GeometryReader { proxy in
                        Image(nsImage: image)
                            .resizable()
                            .interpolation(.high)
                            .aspectRatio(contentMode: .fit)
                            .scaleEffect(zoom)
                            .offset(pan)
                            .frame(width: proxy.size.width, height: proxy.size.height)
                            .gesture(
                                MagnificationGesture()
                                    .onChanged { value in
                                        zoom = max(0.25, min(8.0, value))
                                    }
                            )
                            .gesture(
                                DragGesture()
                                    .onChanged { value in
                                        if zoom > 1 {
                                            pan = value.translation
                                        }
                                    }
                            )
                            .onTapGesture(count: 2) {
                                if zoom > 1 {
                                    withAnimation { zoom = 1; pan = .zero }
                                } else {
                                    withAnimation { zoom = 2 }
                                }
                            }
                    }
                } else {
                    ProgressView().controlSize(.large).tint(.white)
                }

                if let photo = store.focusedPhoto {
                    flagOverlay(photo: photo)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Divider()
            FilmstripView()
                .frame(height: 96)
                .background(Color(nsColor: .windowBackgroundColor))
        }
        .focusable()
        .focusEffectDisabled()
        .onKeyPress(.rightArrow) { store.selectNext(); return .handled }
        .onKeyPress(.leftArrow) { store.selectPrevious(); return .handled }
        .onKeyPress(.escape) { store.viewMode = .grid; return .handled }
        .onKeyPress(.return) { store.viewMode = .grid; return .handled }
        .task(id: store.focusedPhotoID) {
            await loadFocused()
        }
    }

    @ViewBuilder
    private func flagOverlay(photo: Photo) -> some View {
        VStack {
            HStack {
                HStack(spacing: 8) {
                    if photo.flag == .pick {
                        Label("Pick", systemImage: "flag.fill")
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .background(.green.opacity(0.85), in: Capsule())
                            .foregroundStyle(.white)
                    } else if photo.flag == .reject {
                        Label("Reject", systemImage: "flag.slash.fill")
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .background(.red.opacity(0.85), in: Capsule())
                            .foregroundStyle(.white)
                    }
                    if photo.rating > 0 {
                        HStack(spacing: 1) {
                            ForEach(0..<photo.rating, id: \.self) { _ in
                                Image(systemName: "star.fill").foregroundStyle(.yellow)
                            }
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(.black.opacity(0.55), in: Capsule())
                    }
                }
                Spacer()
                Text(photo.fileName)
                    .font(.callout.monospaced())
                    .foregroundStyle(.white.opacity(0.75))
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(.black.opacity(0.45), in: Capsule())
            }
            .padding(12)
            Spacer()
        }
    }

    private func loadFocused() async {
        zoom = 1; pan = .zero
        image = nil
        guard let photo = store.focusedPhoto else { return }
        loadingURL = photo.fileURL
        let loaded = await ImageLoader.shared.load(url: photo.fileURL)
        if photo.fileURL == loadingURL {
            self.image = loaded
        }
    }
}
