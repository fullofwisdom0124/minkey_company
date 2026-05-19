import SwiftUI

struct SidebarView: View {
    @EnvironmentObject var store: LibraryStore

    var body: some View {
        List(selection: filterSelectionBinding) {
            Section("Library") {
                row(.all, label: "All Photos", systemImage: "photo.on.rectangle", count: store.allPhotos.count)
                row(.pick, label: "Picked", systemImage: "flag.fill", count: store.pickCount, tint: .green)
                row(.reject, label: "Rejected", systemImage: "flag.slash.fill", count: store.rejectCount, tint: .red)
                row(.unflagged, label: "Unflagged", systemImage: "flag", count: store.unflaggedCount)
            }

            Section("Ratings") {
                ForEach((1...5).reversed(), id: \.self) { stars in
                    row(.rated(stars), label: starsLabel(stars), systemImage: "star.fill", count: store.allPhotos.filter { $0.rating >= stars }.count, tint: .yellow)
                }
            }

            Section("Color Labels") {
                ForEach(ColorLabel.allCases.filter { $0 != .none }) { label in
                    row(
                        .color(label),
                        label: label.displayName,
                        systemImage: "circle.fill",
                        count: store.allPhotos.filter { $0.colorLabel == label }.count,
                        tint: Color(nsColor: label.nsColor)
                    )
                }
            }
        }
        .listStyle(.sidebar)
    }

    private var filterSelectionBinding: Binding<FilterMode?> {
        Binding(
            get: { store.filter },
            set: { if let new = $0 { store.filter = new } }
        )
    }

    @ViewBuilder
    private func row(_ filter: FilterMode, label: String, systemImage: String, count: Int, tint: Color = .accentColor) -> some View {
        HStack {
            Image(systemName: systemImage).foregroundStyle(tint)
            Text(label)
            Spacer()
            Text("\(count)")
                .foregroundStyle(.secondary)
                .monospacedDigit()
        }
        .tag(filter)
    }

    private func starsLabel(_ n: Int) -> String {
        String(repeating: "★", count: n) + String(repeating: "☆", count: 5 - n)
    }
}
