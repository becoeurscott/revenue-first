import SwiftUI

private enum ProfileSheet: String, Identifiable {
    case edit, goals, skills
    var id: String { rawValue }
}

struct ProfileView: View {
    @Environment(AppStore.self) private var store
    @State private var sheet: ProfileSheet?
    @State private var confirmLogout = false

    var body: some View {
        Screen(title: "Profile", large: true) {
            Adaptive2Col(spacing: Space.xl, leadingWeight: 0.45) {
                header.fadeUp(0)
                statsRow.fadeUp(1)
            } trailing: {
                aboutGroup.fadeUp(2)
                journeyGroup.fadeUp(3)
                accountGroup.fadeUp(4)
                ListGroup {
                    ListRow(icon: "rectangle.portrait.and.arrow.right", title: "Log out", danger: true) { confirmLogout = true }
                }
                .fadeUp(5)
            }
        }
        .toolbar { toolbarContent }
        .sheet(item: $sheet) { s in
            switch s {
            case .edit: AccountEditProfileSheet()
            case .goals: ProfileGoalsSheet { sheet = .edit }
            case .skills: ProfileSkillsSheet()
            }
        }
        .confirmationDialog("Log out?", isPresented: $confirmLogout, titleVisibility: .visible) {
            Button("Log out", role: .destructive) { store.logout() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Your progress is saved on this device. You can log back in any time.")
        }
    }

    @ToolbarContentBuilder private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button { store.push(.notifications) } label: {
                Image(systemName: store.unreadCount > 0 ? "bell.badge.fill" : "bell")
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(Theme.danger, Theme.ink)
            }
            .accessibilityLabel(store.unreadCount > 0 ? "Notifications, \(store.unreadCount) unread" : "Notifications")
            Button { store.push(.settings) } label: { Image(systemName: "gearshape") }
                .accessibilityLabel("Settings")
        }
    }

    // MARK: Header

    private var displayName: String { store.s.user.name.isEmpty ? "Your profile" : store.s.user.name }

    private var header: some View {
        let program = store.program
        let stats = store.stats
        return VStack(alignment: .leading, spacing: Space.l) {
            HStack(spacing: Space.l) {
                AvatarView(name: displayName, size: 72)
                    .overlay(Circle().strokeBorder(Theme.brand500.opacity(0.45), lineWidth: 2).padding(-4))
                    .padding(4)
                VStack(alignment: .leading, spacing: 4) {
                    Text(displayName).font(.title3.weight(.heavy)).foregroundStyle(Theme.ink).lineLimit(1)
                    Text(store.s.user.email.isEmpty ? "No email added" : store.s.user.email).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
                    HStack(spacing: 6) {
                        Badge(store.journey.shortLabel, tone: .brand, systemImage: store.journey.icon)
                        Badge("Day \(program.currentDay) / \(program.totalDays)")
                    }
                    .padding(.top, 4)
                }
            }
            VStack(spacing: 6) {
                HStack {
                    Text("Level \(stats.level)").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink)
                    Spacer()
                    Text("\(stats.xp % 400) / 400 XP").font(.footnote).monospacedDigit().foregroundStyle(Theme.faint)
                }
                ProgressBar(value: stats.levelProgress, label: "Level \(stats.level) progress")
            }
            Button { sheet = .edit } label: { Label("Edit profile", systemImage: "pencil") }
                .buttonStyle(.fr(.secondary, full: true))
        }
        .card(.hero)
    }

    private var statsRow: some View {
        let stats = store.stats
        return HStack(spacing: Space.m) {
            StatCard(icon: "flame.fill", value: "\(stats.streak)", label: "Day streak") { store.push(.streak) }
            ForEach(store.journey.sellsServices ? [StatMetric.prospects, .revenue] : [.videosPublished, .subscribers], id: \.self) { m in
                StatCard(icon: Journeys.metric(m).icon, value: stats.display(m), label: Journeys.metric(m).label, accent: m == .revenue || m == .videosPublished) {
                    if let route = store.route(for: m) { store.push(route) }
                }
            }
        }
    }

    // MARK: Lists

    private var aboutGroup: some View {
        let user = store.s.user
        let stats = store.stats
        return ListGroup(title: "About me") {
            ListRow(icon: "target", title: "My Goals", detail: "\(store.goal.isMoney ? money(stats.value(store.goal.metric)) : stats.value(store.goal.metric).formatted()) toward \(store.goal.label)") { sheet = .goals }
            ListRow(icon: "sparkles", title: "My Skills", detail: user.skills.isEmpty ? "Add your skills" : user.skills.joined(separator: ", ")) { sheet = .skills }
            ListRow(icon: "safari", title: "My Journey", detail: store.journey.shortLabel) { store.push(.paths) }
            ListRow(icon: "scope", title: "My Niche", detail: store.niche?.normalizedLabel ?? "Not set") { sheet = .edit }
        }
    }

    private var journeyGroup: some View {
        let stats = store.stats
        return ListGroup(title: "My journey") {
            ListRow(icon: "chart.line.uptrend.xyaxis", title: "Progress", detail: "\(stats.daysCompleted) of \(MockData.totalDays) days completed") { store.tab = .progress }
            ListRow(icon: "trophy", title: "Achievements") { store.push(.achievements) }
            if store.journey.sellsServices {
                ListRow(icon: "dollarsign.circle", title: "Revenue", detail: "\(money(stats.revenue)) collected") { store.push(.revenue) }
            } else {
                ListRow(icon: "play.rectangle.on.rectangle", title: "Channel", detail: "\(stats.videosPublished) published · \(money(stats.channelIncome)) earned") { store.push(.channel(.content)) }
            }
            ListRow(icon: "play.rectangle", title: "Lessons", detail: "\(stats.lessons) completed") { store.push(.lessons) }
            ListRow(icon: "folder", title: "Resources", detail: "\(store.s.savedResources.count) saved") { store.push(.resources) }
        }
    }

    private var accountGroup: some View {
        let unread = store.unreadCount
        return ListGroup(title: "Account") {
            ListRow(icon: "bell", title: "Notifications", action: { store.push(.notifications) }) {
                if unread > 0 { Badge("\(unread) new", tone: .brand) }
            }
            ListRow(icon: "crown", title: "Subscription", detail: subscriptionDetail) { store.push(.subscription) }
            ListRow(icon: "gearshape", title: "Settings") { store.push(.settings) }
            ListRow(icon: "lifepreserver", title: "Help") { store.push(.help) }
        }
    }

    private var subscriptionDetail: String {
        let sub = store.s.subscription
        let planName = MockData.shared.subscription.plans.first { $0.id == sub.plan }?.name
        switch sub.status {
        case .active: return "Premium\(planName.map { " · \($0)" } ?? "") · Active"
        case .expired: return "Premium · Expired"
        case .none: return "Free plan"
        }
    }
}

// MARK: Goals sheet

private struct ProfileGoalsSheet: View {
    let onEdit: () -> Void
    @Environment(AppStore.self) private var store

    var body: some View {
        let user = store.s.user
        let a = store.enrollment?.answers
        let stage = a?.startingStage.map { Journeys.stageLabel($0, method: store.journey.id) }
        AccountSheetScaffold(title: "My goals", description: "What you told us when you started. Your plan is built around it.", detents: [.medium, .large]) {
            goalCard
            Grid(horizontalSpacing: Space.m, verticalSpacing: Space.m) {
                GridRow {
                    AccountFactTile(label: "Time per week", value: a?.weeklyTime.isEmpty == false ? a!.weeklyTime : user.time)
                    AccountFactTile(label: "Starting budget", value: a?.budget.isEmpty == false ? a!.budget : user.budget)
                }
                GridRow {
                    AccountFactTile(label: "Starting point", value: stage ?? "Not set")
                    AccountFactTile(label: "Equipment", value: a?.equipment.isEmpty == false ? a!.equipment.joined(separator: ", ") : "Not set")
                }
            }
            if let niche = store.niche {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Niche").font(.caption).foregroundStyle(Theme.faint)
                    Text(niche.normalizedLabel).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                    Text("Your missions, coach answers and examples are written for \(niche.audience).").font(.footnote).foregroundStyle(Theme.muted).padding(.top, 2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .card(padding: 14)
            }
        } footer: {
            Button {
                onEdit()
            } label: { Label("Change my goal", systemImage: "pencil") }
                .buttonStyle(.fr(.secondary, full: true))
        }
    }

    private var goalCard: some View {
        let goal = store.goal
        let current = store.stats.value(goal.metric)
        let target = max(goal.target, 1)
        let fmt: (Int) -> String = { goal.isMoney ? money($0) : $0.formatted() }
        let ratio = min(Double(current) / Double(target), 1)
        let left = max(target - current, 0)
        return VStack(alignment: .leading, spacing: Space.m) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("30-DAY GOAL · \(goal.label.uppercased())").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300).lineLimit(1)
                    (Text(fmt(current)).font(.number(30)).foregroundStyle(Theme.ink)
                     + Text(" / \(fmt(target))").font(.body.weight(.semibold)).foregroundStyle(Theme.faint))
                }
                Spacer()
                Text("\(Int(ratio * 100))%").font(.subheadline.weight(.bold)).monospacedDigit().foregroundStyle(Theme.brand300)
            }
            ProgressBar(value: ratio, tone: ratio >= 1 ? .success : .brand, label: "Progress toward income goal")
            Text(left == 0 ? "Goal reached. Time to pick a bigger one." : "\(fmt(left)) to go. " + (store.journey.sellsServices ? "One more client could close the gap." : "Keep publishing on schedule."))
                .font(.footnote).foregroundStyle(Theme.muted)
        }
        .card(.selected)
    }
}

// MARK: Skills sheet

private struct ProfileSkillsSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var draft: [String] = []

    var body: some View {
        AccountSheetScaffold(title: "My skills", description: "Pick everything that applies. We use this to tailor suggestions.", detents: [.medium, .large]) {
            FlowLayout(spacing: Space.s) {
                ForEach(AccountProfileOptions.skills, id: \.value) { o in chip(o) }
            }
            Text(draft.isEmpty ? "No skills selected — that's fine, both paths start from zero." : "\(draft.count) selected")
                .font(.footnote).foregroundStyle(Theme.faint)
                .contentTransition(.numericText())
        } footer: {
            Button("Save skills", action: save).buttonStyle(.fr(.primary, size: .lg, full: true))
        }
        .onAppear { draft = store.s.user.skills.filter { $0 != "None yet" } }
    }

    private func chip(_ o: OnboardingOption) -> some View {
        let on = draft.contains(o.value)
        return Button {
            Haptics.select()
            withAnimation(.snappy) {
                if on { draft.removeAll { $0 == o.value } } else { draft.append(o.value) }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: o.icon).font(.caption.weight(.semibold))
                Text(o.value)
                if on { Image(systemName: "checkmark").font(.caption.weight(.bold)) }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(on ? Theme.brand300 : Theme.muted)
            .padding(.horizontal, 14)
            .frame(minHeight: 44)
            .background(Capsule().fill(on ? Theme.brand500.opacity(0.15) : Theme.surface))
            .overlay(Capsule().strokeBorder(on ? Theme.brand500.opacity(0.5) : Theme.line))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    private func save() {
        store.s.user.skills = draft
        store.s.answers.skills = draft
        store.showToast("Skills updated")
        dismiss()
    }
}
