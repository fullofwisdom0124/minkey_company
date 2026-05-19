import SwiftUI

struct MainToolbar: ToolbarContent {
    @EnvironmentObject var store: LibraryStore

    var body: some ToolbarContent {
        ToolbarItemGroup(placement: .navigation) {
            Picker("View", selection: $store.viewMode) {
                Image(systemName: "square.grid.2x2").tag(ViewMode.grid)
                Image(systemName: "rectangle").tag(ViewMode.detail)
            }
            .pickerStyle(.segmented)
            .help("Grid (⌘G) / Detail (⌘D)")
        }

        ToolbarItemGroup(placement: .principal) {
            if store.viewMode == .grid {
                HStack(spacing: 6) {
                    Image(systemName: "photo")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Slider(value: $store.thumbnailSize, in: 80...360)
                        .frame(width: 180)
                    Image(systemName: "photo.fill")
                        .foregroundStyle(.secondary)
                }
                .help("Thumbnail size")
            }
        }

        ToolbarItemGroup(placement: .primaryAction) {
            Menu {
                Picker("Sort By", selection: $store.sort) {
                    ForEach(SortMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                Toggle("Ascending", isOn: $store.sortAscending)
            } label: {
                Image(systemName: "arrow.up.arrow.down")
            }
            .help("Sort")

            Button {
                store.showInspector.toggle()
            } label: {
                Image(systemName: "sidebar.right")
            }
            .help("Toggle inspector (⌥⌘I)")
        }
    }
}
