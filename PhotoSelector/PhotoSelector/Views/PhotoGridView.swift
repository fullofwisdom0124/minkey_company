import SwiftUI

struct PhotoGridView: View {
    @EnvironmentObject var store: LibraryStore

    var body: some View {
        GeometryReader { proxy in
            ScrollViewReader { scroller in
                ScrollView {
                    let cell = store.thumbnailSize
                    let spacing: CGFloat = 4
                    let columns = max(1, Int((proxy.size.width - spacing) / (cell + spacing)))
                    let layout = Array(repeating: GridItem(.flexible(), spacing: spacing), count: columns)

                    LazyVGrid(columns: layout, spacing: spacing) {
                        ForEach(store.filteredPhotos) { photo in
                            PhotoThumbnailView(photo: photo)
                                .id(photo.id)
                                .frame(height: cell)
                                .onTapGesture(count: 2) {
                                    store.focusedPhotoID = photo.id
                                    store.viewMode = .detail
                                }
                                .onTapGesture(count: 1) {
                                    handleClick(photo)
                                }
                        }
                    }
                    .padding(spacing)
                }
                .background(Color(nsColor: .underPageBackgroundColor))
                .onChange(of: store.focusedPhotoID) { _, new in
                    if let id = new {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            scroller.scrollTo(id, anchor: .center)
                        }
                    }
                }
                .focusable()
                .focusEffectDisabled()
                .onKeyPress(.rightArrow) { store.selectNext(); return .handled }
                .onKeyPress(.leftArrow) { store.selectPrevious(); return .handled }
                .onKeyPress(.return) { store.viewMode = .detail; return .handled }
                .onKeyPress(.space) { store.viewMode = .detail; return .handled }
            }
        }
    }

    private func handleClick(_ photo: Photo) {
        let mods = NSEvent.modifierFlags
        if mods.contains(.command) {
            if store.selection.contains(photo.id) {
                store.selection.remove(photo.id)
            } else {
                store.selection.insert(photo.id)
            }
        } else if mods.contains(.shift), let focused = store.focusedPhotoID {
            let visible = store.filteredPhotos
            if let i = visible.firstIndex(where: { $0.id == focused }),
               let j = visible.firstIndex(where: { $0.id == photo.id }) {
                let range = i < j ? i...j : j...i
                for p in visible[range] { store.selection.insert(p.id) }
            }
        } else {
            store.selection = [photo.id]
        }
        store.focusedPhotoID = photo.id
    }
}
