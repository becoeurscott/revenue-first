import SwiftUI
import UIKit

struct ResourceDetailView: View {
    let id: String
    @Environment(AppStore.self) private var store

    var body: some View {
        if let resource = MockData.resource(id) {
            ResDetailContent(resource: resource)
        } else {
            Screen(title: "Resource") {
                EmptyStateView(title: "Resource not found", message: "This resource may have moved or the link is incorrect.", mood: .sad) {
                    Button("Browse resources") { store.push(.resources) }.buttonStyle(.fr(.primary))
                }
                .padding(.top, Space.xl)
            }
        }
    }
}

private struct ResDetailContent: View {
    let resource: Resource
    @Environment(AppStore.self) private var store

    private var saved: Bool { store.s.savedResources.contains(resource.id) }

    var body: some View {
        Screen(title: resource.type) {
            VStack(alignment: .leading, spacing: Space.xl) {
                header.fadeUp(0)
                Text(resource.description).font(.callout).foregroundStyle(Theme.muted).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: 640, alignment: .leading)
                if let link = resource.link {
                    Button { store.open(link: link) } label: {
                        Label("Open \(resource.title)", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                    }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                bodySections.padding(.top, Space.s)
                related
            }
        }
        .toolbar { toolbarContent }
    }

    @ToolbarContentBuilder private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button(action: toggleSaved) {
                Image(systemName: saved ? "bookmark.fill" : "bookmark")
                    .foregroundStyle(saved ? Theme.brand300 : Theme.ink)
                    .contentTransition(.symbolEffect(.replace))
            }
            .accessibilityLabel(saved ? "Remove from saved" : "Save resource")
            ShareLink(item: ResText.all(resource), subject: Text(resource.title), preview: SharePreview(resource.title, image: Image(systemName: ResourceIcon.name(resource.type)))) {
                Image(systemName: "square.and.arrow.up")
            }
            .accessibilityLabel("Share resource")
        }
    }

    private func toggleSaved() {
        let wasSaved = saved
        withAnimation(.snappy) { store.toggleSavedResource(resource.id) }
        if wasSaved { store.showToast("Removed from saved", .info) } else { store.showToast("Saved to your resources") }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: Space.l) {
            Image(systemName: ResourceIcon.name(resource.type))
                .font(.system(size: 24, weight: .semibold)).foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.brandGradient))
                .shadow(color: Theme.brand600.opacity(0.4), radius: 10, y: 4)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: Space.s) {
                Text(resource.title).font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                FlowLayout(spacing: 6) {
                    Badge(resource.type, tone: .brand)
                    Badge("\(resource.minutes) min", systemImage: "clock")
                    Badge(pathLabel, tone: resource.path == "all" ? .neutral : .info)
                }
            }
        }
    }

    private var pathLabel: String {
        guard resource.path != "all", let p = PathID(rawValue: resource.path) else { return "All paths" }
        return MockData.path(p).name
    }

    @ViewBuilder private var bodySections: some View {
        switch resource.type {
        case "Checklist": ResChecklistBody(resource: resource)
        case "Template", "Script": ResCopyBody(resource: resource)
        default: ResReadBody(resource: resource)
        }
    }

    @ViewBuilder private var related: some View {
        let items = relatedItems
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: Space.m) {
                SectionHeader(title: "Related resources", action: "All") { store.push(.resources) }
                LazyVGrid(columns: adaptiveColumns(min: 280), spacing: Space.m) {
                    ForEach(items) { ResourceCard(resource: $0) }
                }
            }
            .padding(.top, Space.l)
        }
    }

    private var relatedItems: [Resource] {
        let pool = MockData.resources(for: store.s.pathId).filter { $0.id != resource.id }
        let sameType = pool.filter { $0.type == resource.type }
        let samePath = pool.filter { $0.type != resource.type && $0.path == resource.path }
        let rest = pool.filter { r in !sameType.contains(r) && !samePath.contains(r) }
        return Array((sameType + samePath + rest).prefix(3))
    }
}

enum ResText {
    static func section(_ s: ResourceSection) -> String { s.body.joined(separator: "\n\n") }
    static func all(_ r: Resource) -> String {
        r.sections.map { "\($0.heading)\n\n\(section($0))" }.joined(separator: "\n\n———\n\n")
    }
}

// MARK: Checklist

private struct ResChecklistBody: View {
    let resource: Resource
    @Environment(AppStore.self) private var store

    private var checked: [String] { store.s.checklistState[resource.id] ?? [] }
    private var total: Int { resource.sections.reduce(0) { $0 + $1.body.count } }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            progressCard
            ForEach(Array(resource.sections.enumerated()), id: \.offset) { si, section in
                VStack(alignment: .leading, spacing: Space.m) {
                    Text(section.heading).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    VStack(spacing: 0) {
                        ForEach(Array(section.body.enumerated()), id: \.offset) { ii, item in
                            itemRow(id: "\(si)-\(ii)", text: item)
                            if ii < section.body.count - 1 { Divider().overlay(Theme.line).padding(.leading, 52) }
                        }
                    }
                    .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.surface))
                    .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line))
                    .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
                }
            }
        }
    }

    private var progressCard: some View {
        let done = checked.count
        let complete = total > 0 && done >= total
        return VStack(alignment: .leading, spacing: Space.m) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(complete ? "All done — nice work" : "Your progress").font(.bodyStrong).foregroundStyle(Theme.ink)
                    Text("\(done) of \(total) checked").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
                        .contentTransition(.numericText())
                }
                Spacer()
                if done > 0 {
                    Button {
                        withAnimation(.snappy) { store.s.checklistState[resource.id] = [] }
                        store.showToast("Checklist reset", .info)
                    } label: { Label("Reset", systemImage: "arrow.counterclockwise") }
                        .buttonStyle(.fr(.ghost, size: .sm))
                }
            }
            ProgressBar(value: total > 0 ? Double(done) / Double(total) : 0, tone: complete ? .success : .brand, label: "Checklist progress")
        }
        .card(complete ? .completed : .plain)
    }

    private func itemRow(id: String, text: String) -> some View {
        let on = checked.contains(id)
        return Button {
            toggle(id)
        } label: {
            HStack(alignment: .top, spacing: Space.m) {
                ZStack {
                    Circle().strokeBorder(on ? Color.clear : Theme.lineStrong, lineWidth: 1.5)
                    if on {
                        Circle().fill(Theme.success)
                        Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(.white)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .frame(width: 24, height: 24)
                .padding(.top, 1)
                Text(text)
                    .font(.body)
                    .foregroundStyle(on ? Theme.faint : Theme.inkSoft)
                    .strikethrough(on, color: Theme.faint)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, Space.l)
            .padding(.vertical, 14)
            .frame(minHeight: 56)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(text)
        .accessibilityValue(on ? "Checked" : "Not checked")
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    }

    private func toggle(_ item: String) {
        let wasComplete = checked.count >= total
        withAnimation(.bouncy) { store.toggleChecklistItem(resource: resource.id, item: item) }
        Haptics.select()
        let nowComplete = total > 0 && (store.s.checklistState[resource.id] ?? []).count >= total
        if nowComplete && !wasComplete {
            store.showToast("Checklist complete. Nice work!")
        }
    }
}

// MARK: Template / Script

private struct ResCopyBody: View {
    let resource: Resource
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            ForEach(resource.sections, id: \.heading) { section in
                VStack(alignment: .leading, spacing: Space.s) {
                    HStack(spacing: Space.m) {
                        Text(section.heading).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                        Spacer()
                        Button { copy(ResText.section(section), "Copied to clipboard") } label: { Label("Copy", systemImage: "doc.on.doc") }
                            .buttonStyle(.fr(.secondary, size: .sm))
                            .accessibilityLabel("Copy \(section.heading)")
                    }
                    block(ResText.section(section))
                }
            }
            Button { copy(ResText.all(resource), "Copied the full \(resource.type.lowercased())") } label: {
                Label("Copy all", systemImage: "doc.on.doc.fill")
            }
            .buttonStyle(.fr(.secondary, size: .lg, full: true))
        }
    }

    private func block(_ text: String) -> some View {
        Text(text)
            .font(.system(.subheadline, design: .monospaced))
            .foregroundStyle(Theme.inkSoft)
            .lineSpacing(3)
            .textSelection(.enabled)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Space.l)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.bgSunken))
            .overlay(alignment: .leading) {
                UnevenRoundedRectangle(topLeadingRadius: Radius.md, bottomLeadingRadius: Radius.md, style: .continuous)
                    .fill(Theme.brand500.opacity(0.6)).frame(width: 3)
            }
            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
            .contextMenu {
                Button { copy(text, "Copied to clipboard") } label: { Label("Copy", systemImage: "doc.on.doc") }
                ShareLink(item: text) { Label("Share", systemImage: "square.and.arrow.up") }
            }
    }

    private func copy(_ text: String, _ message: String) {
        UIPasteboard.general.string = text
        store.showToast(message)
    }
}

// MARK: Guide / Tool / Calculator

private struct ResReadBody: View {
    let resource: Resource
    var numbered: Bool { resource.type != "Guide" }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            ForEach(resource.sections, id: \.heading) { section in
                VStack(alignment: .leading, spacing: Space.m) {
                    Text(section.heading).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    ForEach(Array(section.body.enumerated()), id: \.offset) { i, p in
                        paragraph(i, p)
                    }
                }
                .frame(maxWidth: 680, alignment: .leading)
            }
        }
    }

    private func paragraph(_ i: Int, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            if numbered {
                Text("\(i + 1)").font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(Theme.brand300)
                    .frame(width: 28, height: 28).background(Circle().fill(Theme.brand500.opacity(0.15)))
                    .accessibilityHidden(true)
            }
            Text(text).font(.body).foregroundStyle(Theme.inkSoft).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
                .padding(.top, numbered ? 3 : 0)
        }
        .accessibilityElement(children: .combine)
    }
}
