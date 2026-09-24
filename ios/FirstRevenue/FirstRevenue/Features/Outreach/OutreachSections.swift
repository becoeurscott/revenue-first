import SwiftUI

// MARK: - Messages feed

struct OutreachMessagesSection: View {
    @Environment(AppStore.self) private var store
    @State private var loading = true

    private struct Item: Identifiable {
        let event: ContactEvent
        let prospect: Prospect
        var id: String { "\(prospect.id)-\(event.id)" }
    }

    private var feed: [Item] {
        store.s.prospects
            .filter { $0.path == store.s.pathId }
            .flatMap { p in p.history.filter { $0.kind == "message" || $0.kind == "reply" }.map { Item(event: $0, prospect: p) } }
            .sorted { $0.event.date > $1.event.date }
    }

    var body: some View {
        Group {
            if loading {
                SkeletonList(count: 4)
            } else if feed.isEmpty {
                EmptyStateView(title: "No messages yet", message: "Messages you mark as sent, and the replies you log, show up here as one timeline.") {
                    Button { store.push(.generate(prospectId: nil)) } label: { Label("Write your first message", systemImage: "square.and.pencil") }
                        .buttonStyle(.fr(.primary))
                }
            } else {
                list(feed)
            }
        }
        .task {
            try? await Task.sleep(for: .milliseconds(500))
            withAnimation(.snappy) { loading = false }
        }
    }

    private func list(_ items: [Item]) -> some View {
        let sent = items.filter { $0.event.kind == "message" }.count
        let replies = items.count - sent
        return VStack(alignment: .leading, spacing: Space.m) {
            summary(sent: sent, replies: replies)
            LazyVStack(spacing: Space.m) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    OutreachMessageRow(event: item.event, prospect: item.prospect) { store.push(.prospect(item.prospect.id)) }
                        .fadeUp(i)
                }
            }
        }
    }

    private func summary(sent: Int, replies: Int) -> some View {
        var text = Text("\(sent)").fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(" sent  ·  ")
            + Text("\(replies)").fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(replies == 1 ? " reply" : " replies")
        if sent > 0 { text = text + Text("  ·  \(Int((Double(replies) / Double(sent) * 100).rounded()))% reply rate") }
        return text.font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
    }
}

private struct OutreachMessageRow: View {
    let event: ContactEvent
    let prospect: Prospect
    let open: () -> Void

    private var isReply: Bool { event.kind == "reply" }

    var body: some View {
        Button { Haptics.tap(); open() } label: {
            VStack(alignment: .leading, spacing: Space.m) {
                HStack(spacing: Space.m) {
                    AvatarView(name: prospect.name, size: 40)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(prospect.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                        Text(prospect.business).font(.caption).foregroundStyle(Theme.faint).lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    VStack(alignment: .trailing, spacing: 4) {
                        Badge(isReply ? "Reply" : "Sent", tone: isReply ? .success : .info, systemImage: isReply ? "arrowshape.turn.up.left.fill" : "paperplane.fill")
                        Text(event.date.timeAgo).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                    }
                }
                Text(event.text)
                    .font(.subheadline)
                    .foregroundStyle(isReply ? Theme.inkSoft : Theme.muted)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(isReply ? Theme.success.opacity(0.07) : Theme.bgSunken))
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(isReply ? "Reply from" : "Sent to") \(prospect.name), \(event.date.timeAgo). \(event.text)")
    }
}

// MARK: - Templates

struct OutreachTemplatesSection: View {
    @Environment(AppStore.self) private var store
    @State private var filter = "All"
    @State private var active: OutreachTemplate?
    @State private var pendingDelete: OutreachTemplate?

    private var templates: [OutreachTemplate] {
        let path = store.s.pathId.rawValue
        let custom = store.s.customTemplates.filter { $0.path == "all" || $0.path == path }
        return custom + MockData.shared.templates.filter { $0.path == "all" || $0.path == path }
    }

    private var visible: [OutreachTemplate] { templates.filter { filter == "All" || $0.stage == filter } }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            FilterChips(options: OutreachStage.all, selection: $filter) { opt in
                opt == "All" ? templates.count : templates.filter { $0.stage == opt }.count
            }
            content
        }
        .sheet(item: $active) { t in
            OutreachTemplateSheet(template: t) { pendingDelete = t }
        }
        .confirmationDialog("Delete this template?", isPresented: deleteBinding, titleVisibility: .visible, presenting: pendingDelete) { t in
            Button("Delete", role: .destructive) {
                withAnimation(.snappy) { store.deleteTemplate(t.id) }
                store.showToast("Template deleted")
            }
        } message: { t in
            Text("\"\(t.title)\" will be removed from your saved templates.")
        }
    }

    private var deleteBinding: Binding<Bool> {
        Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
    }

    @ViewBuilder private var content: some View {
        if visible.isEmpty {
            EmptyStateView(title: "No templates here", message: "There are no \(filter) templates for your path yet. Generate a message and save it as your own.", mood: .thinking, compact: true) {
                Button("Show all templates") { withAnimation(.snappy) { filter = "All" } }.buttonStyle(.fr(.secondary))
            }
        } else {
            LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) {
                ForEach(Array(visible.enumerated()), id: \.element.id) { i, t in
                    RevealSwipeRow(actions: t.custom == true ? [RevealSwipeAction(title: "Delete", systemImage: "trash", tint: Theme.danger) { pendingDelete = t }] : []) {
                        OutreachTemplateRow(template: t) { active = t }
                    }
                    .contextMenu { contextMenu(t) }
                    .fadeUp(i)
                }
            }
        }
    }

    @ViewBuilder private func contextMenu(_ t: OutreachTemplate) -> some View {
        Button { OutreachClipboard.copy(t.body, store: store, toast: "Template copied") } label: { Label("Copy", systemImage: "doc.on.doc") }
        ShareLink(item: t.body) { Label("Share", systemImage: "square.and.arrow.up") }
        if t.custom == true {
            Button(role: .destructive) { pendingDelete = t } label: { Label("Delete", systemImage: "trash") }
        }
    }
}

private struct OutreachTemplateRow: View {
    let template: OutreachTemplate
    let open: () -> Void

    var body: some View {
        Button { Haptics.tap(); open() } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Badge(template.stage, tone: OutreachStage.tone(template.stage))
                    if template.custom == true { Badge("Saved by you", systemImage: "bookmark.fill") }
                    Spacer(minLength: 0)
                }
                Text(template.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).multilineTextAlignment(.leading)
                Text(template.body).font(.subheadline).foregroundStyle(Theme.muted).lineLimit(3).multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens the full template")
    }
}

struct OutreachTemplateSheet: View {
    let template: OutreachTemplate
    let onDelete: () -> Void
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    HStack(spacing: 6) {
                        Badge(template.stage, tone: OutreachStage.tone(template.stage))
                        if template.custom == true { Badge("Saved by you", systemImage: "bookmark.fill") }
                    }
                    Text(template.body)
                        .font(.body).lineSpacing(3)
                        .foregroundStyle(Theme.inkSoft)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .card(padding: Space.l)
                    Label("Replace anything in [brackets] before sending. Personal first lines get the most replies.", systemImage: "lightbulb")
                        .font(.footnote).foregroundStyle(Theme.faint)
                    if template.custom == true { deleteButton }
                }
                .padding(Space.xl)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
            .safeAreaInset(edge: .bottom) { actions }
            .navigationTitle(template.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .outreachSheetChrome([.medium, .large])
        }
    }

    private var deleteButton: some View {
        Button(role: .destructive) {
            dismiss()
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(450))
                onDelete()
            }
        } label: { Label("Delete template", systemImage: "trash") }
            .buttonStyle(.fr(.danger, size: .sm))
    }

    private var actions: some View {
        BottomBar {
            HStack(spacing: Space.s) {
                Button { OutreachClipboard.copy(template.body, store: store, toast: "Template copied") } label: { Label("Copy", systemImage: "doc.on.doc") }
                    .buttonStyle(.fr(.secondary, full: true))
                ShareLink(item: template.body, subject: Text(template.title)) { Label("Share", systemImage: "square.and.arrow.up") }
                    .buttonStyle(.fr(.secondary, full: true))
            }
            Button {
                dismiss()
                store.push(.generate(prospectId: nil))
            } label: { Label("Use in generator", systemImage: "wand.and.stars") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
    }
}

// MARK: - Follow-ups

struct OutreachFollowUpsSection: View {
    @Environment(AppStore.self) private var store

    private var mine: [Prospect] { store.s.prospects.filter { $0.path == store.s.pathId } }
    private var scheduled: [Prospect] {
        mine.filter { $0.followUp != nil }.sorted { ($0.followUp ?? .distantFuture) < ($1.followUp ?? .distantFuture) }
    }
    private var suggested: [Prospect] {
        let cutoff = Date().addingTimeInterval(-3 * 86_400)
        return mine.filter { p in
            guard p.status == .contacted, p.followUp == nil, let last = p.lastContact else { return false }
            return last <= cutoff
        }
    }

    var body: some View {
        if scheduled.isEmpty && suggested.isEmpty {
            EmptyStateView(title: "No follow-ups due", message: "You're all caught up. Set a follow-up from any prospect and it will show up here when it's time.", mood: .happy)
        } else {
            VStack(alignment: .leading, spacing: Space.xl) {
                if !scheduled.isEmpty { scheduledSection }
                if !suggested.isEmpty { suggestedSection }
            }
        }
    }

    private var scheduledSection: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Scheduled")
            LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) {
                ForEach(Array(scheduled.enumerated()), id: \.element.id) { i, p in
                    OutreachFollowUpRow(prospect: p) {
                        dueBadge(p)
                    } actions: {
                        Button { done(p) } label: { Label("Done", systemImage: "checkmark") }
                            .buttonStyle(.fr(.success, size: .sm))
                    }
                    .fadeUp(i)
                }
            }
        }
    }

    private var suggestedSection: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Suggested follow-ups")
            Text("Contacted 3+ days ago with no reply. A short bump often gets the answer.")
                .font(.footnote).foregroundStyle(Theme.muted)
            LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) {
                ForEach(Array(suggested.enumerated()), id: \.element.id) { i, p in
                    OutreachFollowUpRow(prospect: p) {
                        Text("Last contact: \(p.lastContact.timeAgo)").font(.caption).foregroundStyle(Theme.faint)
                    } actions: {
                        Button { schedule(p) } label: { Label("Set follow-up", systemImage: "calendar.badge.plus") }
                            .buttonStyle(.fr(.primary, size: .sm))
                    }
                    .fadeUp(i)
                }
            }
        }
    }

    private func dueBadge(_ p: Prospect) -> some View {
        let due = p.followUp ?? Date()
        let overdue = due < Date()
        return Badge(overdue ? "Due \(due.timeAgo.lowercased())" : due.timeAgo, tone: overdue ? .danger : .warning, systemImage: "calendar.badge.clock")
    }

    private func first(_ p: Prospect) -> String { p.name.split(separator: " ").first.map(String.init) ?? p.name }

    private func done(_ p: Prospect) {
        withAnimation(.snappy) { store.setFollowUp(p.id, days: nil) }
        store.showToast("Follow-up with \(first(p)) done")
    }

    private func schedule(_ p: Prospect) {
        withAnimation(.snappy) { store.setFollowUp(p.id, days: 1) }
        store.showToast("Follow-up with \(first(p)) set for tomorrow")
    }
}

private struct OutreachFollowUpRow<Meta: View, Actions: View>: View {
    let prospect: Prospect
    @ViewBuilder var meta: Meta
    @ViewBuilder var actions: Actions
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(spacing: Space.m) {
            Button { Haptics.tap(); store.push(.prospect(prospect.id)) } label: {
                HStack(spacing: Space.m) {
                    AvatarView(name: prospect.name)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(prospect.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                        Text(prospect.business).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
                    }
                    Spacer(minLength: 6)
                    StatusBadge(status: prospect.status)
                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
            .accessibilityLabel("\(prospect.name), \(prospect.business), \(prospect.status.rawValue)")
            Divider().overlay(Theme.line)
            HStack {
                meta
                Spacer(minLength: 8)
                actions
            }
        }
        .card(padding: Space.l)
    }
}
