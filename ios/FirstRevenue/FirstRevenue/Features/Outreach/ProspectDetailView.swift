import SwiftUI

struct ProspectDetailView: View {
    let id: String
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var addingNote = false
    @State private var choosingFollowUp = false
    @State private var confirmWon = false
    @State private var confirmLost = false
    @State private var confirmRemove = false
    @State private var celebrate = false
    @State private var removing = false

    private var prospect: Prospect? { store.s.prospects.first { $0.id == id } }

    var body: some View {
        if let p = prospect {
            detail(p)
        } else if !removing {
            Screen(title: "Prospect") {
                EmptyStateView(title: "Prospect not found", message: "This prospect may have been removed from your list.", mood: .sad) {
                    Button("Back to prospects") { dismiss() }.buttonStyle(.fr(.primary))
                }
            }
        }
    }

    private func detail(_ p: Prospect) -> some View {
        Screen(title: p.name) {
            Adaptive2Col(leadingWeight: 0.6) {
                ProspectHeaderCard(prospect: p, onStatus: { changeStatus(p, $0) }).fadeUp(0)
                actionGrid(p).fadeUp(1)
                if !p.about.isEmpty { aboutSection(p) }
                if let audit = p.gbp { ProspectAuditCard(audit: audit) }
            } trailing: {
                notesSection(p)
                ProspectTimeline(events: p.history)
                if p.status == .won { wonFooter }
            }
        }
        .overlay { if celebrate { ConfettiView() } }
        .toolbar { toolbar(p) }
        .sheet(isPresented: $addingNote) { ProspectNoteSheet(prospect: p) }
        .confirmationDialog("Set follow-up", isPresented: $choosingFollowUp, titleVisibility: .visible) { followUpButtons(p) } message: {
            Text("It will appear in Follow-ups when it's due.")
        }
        .alert("Did you win \(first(p))?", isPresented: $confirmWon) {
            Button("Yes, I won it") { markWon(p) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("We'll mark \(p.business) as Won and book \(money(p.value)) in your revenue tracker.")
        }
        .confirmationDialog("Mark as lost?", isPresented: $confirmLost, titleVisibility: .visible) {
            Button("Mark Lost", role: .destructive) {
                withAnimation(.snappy) { store.setProspectStatus(p.id, .lost) }
                store.showToast("\(first(p)) marked as Lost. On to the next one.", .info)
            }
        } message: {
            Text("Any open potential deal for this prospect is removed from your pipeline. You can change the status again later.")
        }
        .confirmationDialog("Remove this prospect?", isPresented: $confirmRemove, titleVisibility: .visible) {
            Button("Remove", role: .destructive) { remove(p) }
        } message: {
            Text("\(p.name) and all notes and history will be deleted. This can't be undone.")
        }
        .task(id: celebrate) {
            guard celebrate else { return }
            try? await Task.sleep(for: .seconds(2.2))
            celebrate = false
        }
    }

    // MARK: Sections

    @ToolbarContentBuilder private func toolbar(_ p: Prospect) -> some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Picker("Status", selection: statusBinding(p)) {
                    ForEach(ProspectStatus.allCases) { s in Text(s.rawValue).tag(s) }
                }
                .pickerStyle(.menu)
                Button { store.push(.generate(prospectId: p.id)) } label: { Label("Write a message", systemImage: "square.and.pencil") }
                Divider()
                Button(role: .destructive) { confirmRemove = true } label: { Label("Remove prospect", systemImage: "trash") }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            .accessibilityLabel("More options")
        }
    }

    private func actionGrid(_ p: Prospect) -> some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)
        return LazyVGrid(columns: cols, spacing: 10) {
            ProspectActionTile(title: "Send Message", icon: "paperplane.fill", style: .primary) { store.push(.generate(prospectId: p.id)) }
            ProspectActionTile(title: "Add Note", icon: "note.text.badge.plus", style: .plain) { addingNote = true }
            ProspectActionTile(title: "Set Follow-up", icon: "calendar.badge.plus", style: .plain) { choosingFollowUp = true }
            ProspectActionTile(title: "Mark Interested", icon: "heart.fill", style: .warning, disabled: p.status == .interested) { changeStatus(p, .interested) }
            ProspectActionTile(title: "Mark Won", icon: "trophy.fill", style: .success, disabled: p.status == .won) { confirmWon = true }
            ProspectActionTile(title: "Mark Lost", icon: "hand.thumbsdown.fill", style: .danger, disabled: p.status == .lost) { confirmLost = true }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Actions")
    }

    private func aboutSection(_ p: Prospect) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "About")
            Text(p.about).font(.subheadline).foregroundStyle(Theme.inkSoft).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
                .card()
        }
    }

    private func notesSection(_ p: Prospect) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Notes", action: "Add note") { addingNote = true }
            if p.notes.isEmpty {
                EmptyStateView(title: "No notes yet", message: "Jot down what you noticed about \(first(p)). Details make your messages personal.", mood: .thinking, compact: true) {
                    Button("Add a note") { addingNote = true }.buttonStyle(.fr(.secondary, size: .sm))
                }
            } else {
                VStack(spacing: 10) {
                    ForEach(p.notes) { n in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(n.text).font(.subheadline).foregroundStyle(Theme.inkSoft).textSelection(.enabled)
                                .fixedSize(horizontal: false, vertical: true)
                            Text(n.date.timeAgo).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                        }
                        .card(padding: 14)
                        .accessibilityElement(children: .combine)
                    }
                }
            }
        }
    }

    private var wonFooter: some View {
        Button { store.push(.revenue) } label: {
            HStack(spacing: Space.m) {
                OutreachIconTile(systemImage: "checkmark.seal.fill", tint: Theme.success)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Deal booked").font(.subheadline.weight(.bold)).foregroundStyle(Theme.ink)
                    Text("Track the payment in Revenue").font(.footnote).foregroundStyle(Theme.muted)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .card(.completed, padding: Space.l)
        }
        .buttonStyle(.pressable)
    }

    @ViewBuilder private func followUpButtons(_ p: Prospect) -> some View {
        Button("Tomorrow") { setFollowUp(p, 1) }
        Button("In 3 days") { setFollowUp(p, 3) }
        Button("In 1 week") { setFollowUp(p, 7) }
        if p.followUp != nil {
            Button("Clear follow-up", role: .destructive) { setFollowUp(p, nil) }
        }
    }

    // MARK: Actions

    private func first(_ p: Prospect) -> String { p.name.split(separator: " ").first.map(String.init) ?? p.name }

    private func statusBinding(_ p: Prospect) -> Binding<ProspectStatus> {
        Binding(get: { p.status }, set: { changeStatus(p, $0) })
    }

    private func changeStatus(_ p: Prospect, _ status: ProspectStatus) {
        guard status != p.status else { return }
        switch status {
        case .won: confirmWon = true
        case .lost: confirmLost = true
        default:
            withAnimation(.snappy) { store.setProspectStatus(p.id, status) }
            store.showToast("\(first(p)) marked as \(status.rawValue)")
        }
    }

    private func markWon(_ p: Prospect) {
        withAnimation(.snappy) { store.setProspectStatus(p.id, .won) }
        celebrate = true
        store.showToast("Client won! Deal added to revenue")
    }

    private func setFollowUp(_ p: Prospect, _ days: Int?) {
        withAnimation(.snappy) { store.setFollowUp(p.id, days: days) }
        guard let days else { store.showToast("Follow-up cleared", .info); return }
        store.showToast("Follow-up set for \(days == 1 ? "tomorrow" : "\(days) days from now")")
    }

    private func remove(_ p: Prospect) {
        removing = true
        dismiss()
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            store.removeProspect(p.id)
            store.showToast("Prospect removed", .info)
        }
    }
}

// MARK: - Header

private struct ProspectHeaderCard: View {
    let prospect: Prospect
    let onStatus: (ProspectStatus) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            identity
            Divider().overlay(Theme.line)
            valueRow
            if let f = prospect.followUp { followUpPill(f) }
        }
        .card(.hero)
    }

    private var identity: some View {
        HStack(alignment: .top, spacing: Space.l) {
            AvatarView(name: prospect.name, size: 64)
            VStack(alignment: .leading, spacing: 3) {
                Text(prospect.name).font(.title2).foregroundStyle(Theme.ink).lineLimit(2)
                Text(prospect.business).font(.subheadline).foregroundStyle(Theme.muted).lineLimit(2)
                Text("\(prospect.platform) · \(prospect.audience)").font(.footnote).foregroundStyle(Theme.faint).lineLimit(1)
                if !prospect.handle.isEmpty {
                    Text(prospect.handle).font(.footnote.weight(.medium)).foregroundStyle(Theme.brand300).lineLimit(1).textSelection(.enabled)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var valueRow: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Potential deal value").font(.footnote).foregroundStyle(Theme.muted)
                Text(money(prospect.value)).font(.number(34)).foregroundStyle(Theme.textGradient)
                    .contentTransition(.numericText())
            }
            .accessibilityElement(children: .combine)
            Spacer()
            statusMenu
        }
    }

    private var statusMenu: some View {
        Menu {
            Picker("Status", selection: Binding(get: { prospect.status }, set: onStatus)) {
                ForEach(ProspectStatus.allCases) { s in Text(s.rawValue).tag(s) }
            }
        } label: {
            HStack(spacing: 4) {
                StatusBadge(status: prospect.status)
                Image(systemName: "chevron.down").font(.caption.weight(.bold)).foregroundStyle(Theme.muted)
            }
            .frame(minHeight: 44)
        }
        .accessibilityLabel("Status: \(prospect.status.rawValue). Change status")
    }

    private func followUpPill(_ date: Date) -> some View {
        Label("Follow-up \(date.timeAgo.lowercased()) · \(date.shortDate)", systemImage: "calendar.badge.clock")
            .font(.footnote.weight(.medium))
            .foregroundStyle(Theme.warning)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.warning.opacity(0.1)))
    }
}

// MARK: - Action tile

private struct ProspectActionTile: View {
    enum Style { case primary, plain, warning, success, danger }
    let title: String
    let icon: String
    let style: Style
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button { Haptics.tap(); action() } label: {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: icon).font(.system(size: 18, weight: .semibold)).foregroundStyle(iconColor)
                Spacer(minLength: 0)
                Text(title).font(.footnote.weight(.semibold)).foregroundStyle(textColor)
                    .lineLimit(2).minimumScaleFactor(0.8).multilineTextAlignment(.leading)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 88, alignment: .leading)
            .background(background)
        }
        .buttonStyle(.pressable)
        .disabled(disabled)
        .opacity(disabled ? 0.4 : 1)
    }

    private var iconColor: Color {
        switch style {
        case .primary: .white
        case .plain: Theme.brand300
        case .warning: Theme.warning
        case .success: Theme.success
        case .danger: Theme.danger
        }
    }

    private var textColor: Color {
        switch style {
        case .primary: .white
        case .plain, .warning: Theme.inkSoft
        case .success: Theme.success
        case .danger: Theme.danger
        }
    }

    @ViewBuilder private var background: some View {
        let shape = RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
        switch style {
        case .primary:
            shape.fill(Theme.brandGradient).shadow(color: Theme.brand600.opacity(0.35), radius: 10, y: 4)
        case .plain, .warning:
            shape.fill(Theme.surface).overlay(shape.strokeBorder(Theme.line))
        case .success:
            shape.fill(Theme.success.opacity(0.1)).overlay(shape.strokeBorder(Theme.success.opacity(0.25)))
        case .danger:
            shape.fill(Theme.danger.opacity(0.08)).overlay(shape.strokeBorder(Theme.danger.opacity(0.25)))
        }
    }
}

// MARK: - Profile audit

private struct ProspectAuditCard: View {
    let audit: GbpAudit

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Profile audit")
            VStack(alignment: .leading, spacing: Space.l) {
                summary
                problems
                suggestion
            }
            .card()
        }
    }

    private var summary: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text(audit.rating.formatted(.number.precision(.fractionLength(1)))).font(.number(26)).foregroundStyle(Theme.ink)
                    HStack(spacing: 2) {
                        ForEach(1...5, id: \.self) { n in
                            Image(systemName: Double(n) <= audit.rating.rounded() ? "star.fill" : "star")
                                .font(.caption).foregroundStyle(Double(n) <= audit.rating.rounded() ? Theme.warning : Theme.faint)
                        }
                    }
                }
                Text("\(audit.reviews.formatted()) reviews").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Rated \(audit.rating.formatted(.number.precision(.fractionLength(1)))) out of 5, \(audit.reviews) reviews")
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(audit.category).font(.footnote.weight(.semibold)).foregroundStyle(Theme.inkSoft)
                Label(audit.city, systemImage: "mappin.and.ellipse").font(.footnote).foregroundStyle(Theme.muted)
            }
        }
    }

    private var problems: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("PROBLEMS FOUND").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
            ForEach(audit.problems, id: \.self) { problem in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill").font(.footnote).foregroundStyle(Theme.warning).accessibilityHidden(true)
                    Text(problem).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.warning.opacity(0.07)))
            }
        }
    }

    private var suggestion: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "wrench.and.screwdriver.fill").font(.footnote).foregroundStyle(Theme.brand300).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text("Suggested service").font(.caption.weight(.semibold)).foregroundStyle(Theme.brand300)
                Text(audit.service).font(.subheadline).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.brand500.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.brand500.opacity(0.25)))
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Contact timeline

private struct ProspectTimeline: View {
    let events: [ContactEvent]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Contact history")
            if events.isEmpty {
                Text("No contact yet. Send the first message to start the timeline.")
                    .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Space.xl)
                    .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line, style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(events.enumerated()), id: \.element.id) { i, e in
                        ProspectTimelineRow(event: e, isLast: i == events.count - 1)
                    }
                }
            }
        }
    }
}

private struct ProspectTimelineRow: View {
    let event: ContactEvent
    let isLast: Bool

    private var meta: (icon: String, tint: Color, label: String) {
        switch event.kind {
        case "message": ("paperplane.fill", Theme.info, "Message sent")
        case "reply": ("arrowshape.turn.up.left.fill", Theme.success, "Reply received")
        case "call": ("phone.fill", Theme.brand300, "Call")
        case "note": ("note.text", Theme.muted, "Note")
        case "followup": ("calendar.badge.clock", Theme.warning, "Follow-up")
        default: ("arrow.left.arrow.right", Theme.muted, "Status")
        }
    }

    private var quoted: Bool { event.kind == "message" || event.kind == "reply" }

    var body: some View {
        HStack(alignment: .top, spacing: Space.m) {
            VStack(spacing: 0) {
                OutreachIconTile(systemImage: meta.icon, tint: meta.tint, size: 32)
                    .background(Circle().fill(Theme.bg).padding(-3))
                if !isLast { Rectangle().fill(Theme.line).frame(width: 1).frame(maxHeight: .infinity) }
            }
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(meta.label).font(.caption.weight(.semibold)).foregroundStyle(Theme.muted)
                    Spacer()
                    Text(event.date.timeAgo).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                }
                eventText
            }
            .padding(.top, 6)
            .padding(.bottom, isLast ? 0 : Space.l)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var eventText: some View {
        let text = Text(event.text).font(.subheadline).foregroundStyle(Theme.inkSoft)
        if quoted {
            text
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        } else {
            text.fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - Note sheet

private struct ProspectNoteSheet: View {
    let prospect: Prospect
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""

    private var value: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text("Only you can see notes about \(prospect.name.split(separator: " ").first.map(String.init) ?? prospect.name).")
                        .font(.subheadline).foregroundStyle(Theme.muted)
                    FRTextArea(label: "Note", text: $text, placeholder: "e.g. Posts a 90-min podcast every Tuesday, no Shorts yet.", minHeight: 150)
                    Button("Save note", action: save)
                        .buttonStyle(.fr(.primary, size: .lg, full: true))
                        .disabled(value.isEmpty)
                }
                .padding(Space.xl)
            }
            .navigationTitle("Add note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save", action: save).fontWeight(.semibold).disabled(value.isEmpty) }
            }
            .outreachSheetChrome([.medium, .large])
        }
    }

    private func save() {
        guard !value.isEmpty else { return }
        store.addProspectNote(prospect.id, value)
        dismiss()
        store.showToast("Note saved")
    }
}
