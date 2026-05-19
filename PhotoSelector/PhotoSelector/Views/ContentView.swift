import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: LibraryStore

    var body: some View {
        NavigationSplitView {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 200, ideal: 240, max: 320)
        } detail: {
            HStack(spacing: 0) {
                mainContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                if store.showInspector {
                    Divider()
                    InspectorView()
                        .frame(width: 280)
                        .transition(.move(edge: .trailing))
                }
            }
            .animation(.easeInOut(duration: 0.18), value: store.showInspector)
            .toolbar { MainToolbar() }
        }
        .overlay {
            if store.isImporting {
                ImportOverlay()
            } else if store.allPhotos.isEmpty {
                EmptyStateView()
            }
        }
    }

    @ViewBuilder
    private var mainContent: some View {
        switch store.viewMode {
        case .grid:
            PhotoGridView()
        case .detail:
            PhotoDetailView()
        }
    }
}

private struct ImportOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.35).ignoresSafeArea()
            VStack(spacing: 14) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .controlSize(.large)
                Text("Importing photos…")
                    .font(.callout)
                    .foregroundStyle(.white)
            }
            .padding(28)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
        }
    }
}

private struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 64, weight: .light))
                .foregroundStyle(.secondary)
            Text("No Photos Loaded")
                .font(.title2)
            Text("Use ⌘O to open an SD card or folder of photos.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.regularMaterial)
    }
}
