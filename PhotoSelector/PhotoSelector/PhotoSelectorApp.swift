import SwiftUI

@main
struct PhotoSelectorApp: App {
    @StateObject private var store = LibraryStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .frame(minWidth: 1280, minHeight: 800)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: true))
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Open Folder…") { openFolder() }
                    .keyboardShortcut("o", modifiers: [.command])
            }
            CommandMenu("Photo") {
                Button("Flag as Pick") { store.toggleFlag(.pick) }
                    .keyboardShortcut("p", modifiers: [])
                Button("Flag as Reject") { store.toggleFlag(.reject) }
                    .keyboardShortcut("x", modifiers: [])
                Button("Remove Flag") { store.setFlag(.unflagged) }
                    .keyboardShortcut("u", modifiers: [])
                Divider()
                ForEach(0...5, id: \.self) { stars in
                    Button("Rating: \(stars)") { store.setRating(stars) }
                        .keyboardShortcut(KeyEquivalent(Character("\(stars)")), modifiers: [])
                }
                Divider()
                Button("Export Selected…") { exportSelected() }
                    .keyboardShortcut("e", modifiers: [.command, .shift])
            }
            CommandMenu("View") {
                Button("Grid") { store.viewMode = .grid }
                    .keyboardShortcut("g", modifiers: [.command])
                Button("Detail") { store.viewMode = .detail }
                    .keyboardShortcut("d", modifiers: [.command])
                Divider()
                Toggle("Inspector", isOn: $store.showInspector)
                    .keyboardShortcut("i", modifiers: [.command, .option])
            }
        }
    }

    private func openFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Open"
        panel.message = "Choose the SD card or folder with photos to select from."

        if panel.runModal() == .OK, let url = panel.url {
            Task { await importFolder(url) }
        }
    }

    private func importFolder(_ url: URL) async {
        await MainActor.run {
            store.isImporting = true
            store.importProgress = 0
        }
        let photos = await PhotoImporter.scan(folder: url)
        await MainActor.run {
            store.setPhotos(photos, rootURL: url)
            store.isImporting = false
        }
    }

    private func exportSelected() {
        let toExport: [Photo]
        if !store.selection.isEmpty {
            toExport = store.allPhotos.filter { store.selection.contains($0.id) }
        } else {
            toExport = store.allPhotos.filter { $0.flag == .pick }
        }
        guard !toExport.isEmpty else {
            NSSound.beep()
            return
        }

        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Export Here"
        panel.message = "Choose a destination folder for the selected photos."

        if panel.runModal() == .OK, let dst = panel.url {
            Task {
                do {
                    _ = try await Exporter.export(photos: toExport, to: dst)
                } catch {
                    await MainActor.run {
                        let alert = NSAlert(error: error)
                        alert.runModal()
                    }
                }
            }
        }
    }
}
