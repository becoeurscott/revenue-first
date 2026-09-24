import SwiftUI

private let someoneNew = "Someone new"

struct OutreachGenerateView: View {
    let prospectId: String?
    @Environment(AppStore.self) private var store

    var body: some View {
        Screen(title: "Write a message", subtitle: "Tell me who it's for. I'll draft it, you make it yours.") {
            PremiumGate(feature: "Outreach Assistant", message: "Generate personal outreach messages for any prospect, tone and goal in seconds.") {
                OutreachGenerator(prospectId: prospectId)
            }
        }
    }
}

private enum GeneratorPhase { case idle, loading, done, error }

private struct OutreachGenerator: View {
    let prospectId: String?
    @Environment(AppStore.self) private var store
    @Environment(\.horizontalSizeClass) private var hSize
    @State private var didInit = false
    @State private var who = someoneNew
    @State private var newName = ""
    @State private var newBusiness = ""
    @State private var service = ""
    @State private var tone = ""
    @State private var goal = ""
    @State private var variant = 0
    @State private var phase: GeneratorPhase = .idle
    @State private var token = 0
    @State private var message = ""
    @State private var editing = false
    @State private var sent = false
    @State private var saving = false
    @State private var templateTitle = ""

    private var options: GeneratorOptions { MockData.shared.generatorOptions }
    private var path: PathID { store.s.pathId }
    private var services: [String] { options.services[path.rawValue] ?? [] }

    /// Unique label per current-path prospect (disambiguates shared names).
    private var labels: [(label: String, id: String)] {
        var seen = Set<String>()
        var out: [(label: String, id: String)] = []
        for p in store.s.prospects where p.path == path {
            let label = seen.contains(p.name) ? "\(p.name) (\(p.business))" : p.name
            seen.insert(p.name)
            out.append((label, p.id))
        }
        return out
    }

    private var prospect: Prospect? {
        guard let id = labels.first(where: { $0.label == who })?.id else { return nil }
        return store.s.prospects.first { $0.id == id }
    }

    var body: some View {
        ScrollViewReader { proxy in
            Adaptive2Col(spacing: Space.xl, leadingWeight: 0.5) {
                form
            } trailing: {
                result.id("result")
            }
            .onChange(of: phase) { _, new in
                guard new == .loading, hSize != .regular else { return }
                withAnimation(.snappy) { proxy.scrollTo("result", anchor: .top) }
            }
        }
        .onAppear(perform: setup)
        .task(id: token) { await generate() }
        .alert("Save as template", isPresented: $saving) {
            TextField("Template title", text: $templateTitle)
            Button("Save", action: saveTemplate)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Find it later under Outreach, in Templates.")
        }
    }

    // MARK: Form

    private var form: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            SelectRow(label: "Prospect", selection: $who, options: labels.map(\.label) + [someoneNew])
            if prospect == nil { newProspectFields }
            SelectRow(label: "Service", selection: $service, options: services)
            tonePicker
            SelectRow(label: "Goal", selection: $goal, options: options.goals)
            Button { run(phase == .idle ? 0 : variant + 1) } label: {
                LoadingLabel(title: phase == .idle ? "Generate message" : "Generate a new one", systemImage: "sparkles", loading: phase == .loading)
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
            .disabled(phase == .loading)
        }
        .card()
        .animation(.snappy, value: who)
    }

    private var newProspectFields: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            FRTextField(label: "Their first name", text: $newName, placeholder: "Jamie", systemImage: "person")
            FRTextField(label: path == .clipping ? "Channel or brand" : "Business name", text: $newBusiness, placeholder: path == .clipping ? "The Growth Hour" : "Rivera Dental", systemImage: path == .clipping ? "play.rectangle" : "storefront")
        }
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private var tonePicker: some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: 8), count: hSize == .regular ? 4 : 2)
        return VStack(alignment: .leading, spacing: 6) {
            Text("Tone").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
            LazyVGrid(columns: cols, spacing: 8) {
                ForEach(options.tones, id: \.self) { t in toneChip(t) }
            }
        }
    }

    private func toneChip(_ t: String) -> some View {
        let on = tone == t
        return Button { Haptics.select(); withAnimation(.snappy) { tone = t } } label: {
            Text(t)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(on ? Theme.brand300 : Theme.muted)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(on ? Theme.brand500.opacity(0.15) : Theme.surface2))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(on ? Theme.brand500.opacity(0.5) : Theme.line))
        }
        .buttonStyle(.pressable)
        .accessibilityAddTraits(on ? [.isSelected] : [])
        .accessibilityLabel("\(t) tone")
    }

    // MARK: Result

    @ViewBuilder private var result: some View {
        switch phase {
        case .idle: idleCard
        case .loading: loadingCard
        case .error: errorCard
        case .done: doneCard
        }
    }

    private var idleCard: some View {
        VStack(spacing: Space.s) {
            OutreachIconTile(systemImage: "square.and.pencil", size: 48)
            Text("Your message appears here").font(.headline).foregroundStyle(Theme.ink)
            Text("Pick who you're writing to and what you want. You'll get a short message you can send in under a minute.")
                .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 300)
        }
        .padding(.vertical, 40)
        .padding(.horizontal, Space.xl)
        .frame(maxWidth: .infinity)
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line, style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
    }

    private var loadingCard: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            HStack(spacing: Space.m) {
                MascotView(mood: .thinking, size: 56, interactive: false, float: false)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Writing your message…").font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                    Text("Keeping it short and personal.").font(.footnote).foregroundStyle(Theme.muted)
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array([0.5, 1, 0.92, 0.8, 1, 0.66].enumerated()), id: \.offset) { _, w in
                    GeometryReader { g in SkeletonBlock(height: 13, width: g.size.width * w) }.frame(height: 13)
                }
            }
        }
        .card()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Writing your message")
    }

    private var errorCard: some View {
        VStack(spacing: Space.s) {
            OutreachIconTile(systemImage: "wifi.slash", tint: Theme.danger, size: 48)
            Text("Couldn't generate your message").font(.headline).foregroundStyle(Theme.ink)
            Text("You seem to be offline. Check your connection and try again. Your choices are kept.")
                .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            Button { run(variant) } label: { Label("Retry", systemImage: "arrow.clockwise") }
                .buttonStyle(.fr(.secondary))
                .padding(.top, Space.s)
        }
        .frame(maxWidth: .infinity)
        .card()
    }

    private var doneCard: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            resultHeader
            messageBody
            actionGrid
            sentRow
        }
        .card(.hero)
        .transition(.scale(scale: 0.97).combined(with: .opacity))
    }

    private var resultHeader: some View {
        let words = message.split(whereSeparator: \.isWhitespace).count
        return HStack(alignment: .firstTextBaseline) {
            Text(prospect.map { "Message for \(firstName($0))" } ?? "Your message").font(.headline).foregroundStyle(Theme.ink)
            Spacer()
            Text("Version \(variant + 1) · \(words) words").font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
        }
    }

    @ViewBuilder private var messageBody: some View {
        if editing {
            TextField("Your message", text: $message, axis: .vertical)
                .lineLimit(8...20)
                .foregroundStyle(Theme.ink)
                .padding(14)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.brand500, lineWidth: 1.5))
                .accessibilityLabel("Edit message")
        } else {
            Text(message)
                .font(.body).lineSpacing(3)
                .foregroundStyle(Theme.inkSoft)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.bgSunken.opacity(0.7)))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        }
    }

    private var actionGrid: some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: 10), count: 2)
        let empty = message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return LazyVGrid(columns: cols, spacing: 10) {
            Button { OutreachClipboard.copy(message, store: store, toast: "Message copied") } label: { Label("Copy", systemImage: "doc.on.doc") }
                .buttonStyle(.fr(.primary, full: true)).disabled(empty)
            Button { run(variant + 1) } label: { Label("Regenerate", systemImage: "arrow.clockwise") }
                .buttonStyle(.fr(.secondary, full: true))
            Button { withAnimation(.snappy) { editing.toggle() } } label: { Label(editing ? "Done" : "Edit", systemImage: editing ? "checkmark" : "pencil") }
                .buttonStyle(.fr(.secondary, full: true))
            Button { templateTitle = "\(goal) · \(tone)"; saving = true } label: { Label("Save Template", systemImage: "bookmark") }
                .buttonStyle(.fr(.secondary, full: true)).disabled(empty)
            ShareLink(item: message) { Label("Share", systemImage: "square.and.arrow.up") }
                .buttonStyle(.fr(.secondary, full: true)).disabled(empty)
                .gridCellColumns(2)
        }
    }

    @ViewBuilder private var sentRow: some View {
        if let p = prospect {
            if sent {
                HStack(spacing: 8) {
                    Label("Logged as sent", systemImage: "checkmark.circle.fill").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.success)
                    Spacer()
                    Button("View \(firstName(p))") { store.push(.prospect(p.id)) }
                        .buttonStyle(.fr(.success, size: .sm))
                }
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.success.opacity(0.1)))
            } else {
                Button { markSent(p) } label: { Label("Mark as sent", systemImage: "paperplane.fill") }
                    .buttonStyle(.fr(.success, full: true))
                    .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    // MARK: Logic

    private func firstName(_ p: Prospect) -> String { p.name.split(separator: " ").first.map(String.init) ?? p.name }

    private func setup() {
        guard !didInit else { return }
        didInit = true
        service = services.first ?? ""
        tone = options.tones.first ?? "Friendly"
        goal = options.goals.first ?? ""
        if let pid = prospectId, let match = labels.first(where: { $0.id == pid }) { who = match.label }
    }

    private func run(_ next: Int) {
        Haptics.tap()
        variant = next
        editing = false
        sent = false
        withAnimation(.snappy) { phase = .loading }
        token += 1
    }

    private func generate() async {
        guard token > 0 else { return }
        try? await Task.sleep(for: .milliseconds(1100))
        guard !Task.isCancelled else { return }
        if store.isOffline {
            withAnimation(.snappy) { phase = .error }
            Haptics.notify(.error)
            return
        }
        message = OutreachEngine.generate(
            name: prospect?.name ?? newName,
            business: prospect?.business ?? newBusiness,
            service: service, tone: tone, goal: goal, path: path,
            variant: variant, sender: store.s.user.firstName
        )
        withAnimation(.snappy) { phase = .done }
        Haptics.soft()
    }

    private func saveTemplate() {
        let title = templateTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { store.showToast("Add a title to save the template", .warning); return }
        store.saveTemplate(title: title, body: message)
        store.showToast("Saved to your templates")
    }

    private func markSent(_ p: Prospect) {
        store.logOutreach(p.id, message)
        withAnimation(.snappy) { sent = true }
        store.showToast("Logged as sent to \(firstName(p))")
    }
}
