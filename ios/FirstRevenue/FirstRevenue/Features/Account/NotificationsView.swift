import SwiftUI

/// Uses a native `List` (instead of the `Screen` scroll scaffold) so rows get real swipe actions.
struct NotificationsView: View {
    @Environment(AppStore.self) private var store
    @State private var filter = "All"
    @State private var loading = true

    private var visible: [AppNotification] {
        store.s.notifications
            .filter { filter == "All" || !$0.read }
            .sorted { $0.date > $1.date }
    }

    var body: some View {
        let list = visible
        let today = list.filter { Calendar.current.isDateInToday($0.date) }
        let earlier = list.filter { !Calendar.current.isDateInToday($0.date) }
        List {
            if loading {
                plainRow { SkeletonList(count: 5) }
            } else if list.isEmpty {
                plainRow { emptyState }
            } else {
                section("Today", today)
                section("Earlier", earlier)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .listSectionSpacing(Space.l)
        .environment(\.defaultMinListRowHeight, 44)
        .frame(maxWidth: 920)
        .frame(maxWidth: .infinity)
        .safeAreaInset(edge: .top, spacing: 0) { filterBar }
        .background(Theme.bg.ignoresSafeArea())
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.bg.opacity(0.9), for: .navigationBar)
        .toolbar { toolbarContent }
        .animation(.snappy, value: list.map(\.id))
        .animation(.snappy, value: loading)
        .task {
            guard loading else { return }
            try? await Task.sleep(for: .milliseconds(350))
            loading = false
        }
    }

    @ToolbarContentBuilder private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                withAnimation(.snappy) { store.markAllRead() }
                store.showToast("All notifications marked as read")
            } label: {
                Label("Mark all read", systemImage: "checkmark.circle").labelStyle(.titleOnly)
            }
            .disabled(store.unreadCount == 0)
            .accessibilityLabel("Mark all as read")
        }
    }

    private var filterBar: some View {
        FilterChips(options: ["All", "Unread"], selection: $filter, count: { o in
            o == "All" ? store.s.notifications.count : store.unreadCount
        })
        .padding(.horizontal, Space.gutter)
        .padding(.top, Space.s)
        .padding(.bottom, Space.s)
        .frame(maxWidth: 920, alignment: .leading)
        .frame(maxWidth: .infinity)
        .background(Theme.bg)
    }

    // MARK: Sections

    @ViewBuilder private func section(_ title: String, _ items: [AppNotification]) -> some View {
        if !items.isEmpty {
            Section {
                ForEach(items) { n in
                    NotifRow(notification: n) { open(n) }
                        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                        .listRowBackground(rowBackground(n))
                        .listRowSeparatorTint(Theme.line)
                        .alignmentGuide(.listRowSeparatorLeading) { _ in 72 }
                        .swipeActions(edge: .leading, allowsFullSwipe: true) { readToggle(n) }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) { readToggle(n) }
                        .contextMenu { menu(n) }
                }
            } header: {
                Text(title.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
                    .accessibilityAddTraits(.isHeader)
            }
        }
    }

    private func rowBackground(_ n: AppNotification) -> some View {
        ZStack {
            Theme.surface
            if !n.read { Theme.brand500.opacity(0.07) }
        }
    }

    private func readToggle(_ n: AppNotification) -> some View {
        Button {
            withAnimation(.snappy) { store.toggleRead(n.id) }
            Haptics.select()
        } label: {
            Label(n.read ? "Unread" : "Read", systemImage: n.read ? "envelope.badge" : "envelope.open")
        }
        .tint(n.read ? Theme.brand500 : Theme.info)
    }

    @ViewBuilder private func menu(_ n: AppNotification) -> some View {
        Button { open(n) } label: { Label("Open", systemImage: "arrow.up.forward.app") }
        Button {
            withAnimation(.snappy) { store.toggleRead(n.id) }
        } label: {
            Label(n.read ? "Mark as unread" : "Mark as read", systemImage: n.read ? "envelope.badge" : "envelope.open")
        }
    }

    private func open(_ n: AppNotification) {
        Haptics.tap()
        store.markRead(n.id)
        store.open(link: n.link)
    }

    // MARK: Empty & loading

    private func plainRow<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .listRowInsets(EdgeInsets(top: Space.s, leading: 0, bottom: Space.s, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }

    @ViewBuilder private var emptyState: some View {
        if filter == "Unread" && !store.s.notifications.isEmpty {
            EmptyStateView(title: "You're all caught up", message: "No unread notifications. Go make some progress and we'll have news for you soon.", mood: .happy) {
                Button("View all") { withAnimation(.snappy) { filter = "All" } }.buttonStyle(.fr(.secondary))
            }
        } else {
            EmptyStateView(title: "No notifications", message: "Mission reminders, replies from prospects and milestones will show up here.", mood: .sleepy) {
                Button("Go to today's mission") {
                    store.popToRoot()
                    store.tab = .home
                }
                .buttonStyle(.fr(.primary))
            }
        }
    }
}

private struct NotifRow: View {
    let notification: AppNotification
    let action: () -> Void

    var body: some View {
        let n = notification
        let unread = !n.read
        Button(action: action) {
            HStack(alignment: .top, spacing: Space.m) {
                SymbolTile(icon: n.icon, tint: unread ? Theme.brand300 : Theme.muted, size: 44, circle: true)
                    .overlay(alignment: .topTrailing) {
                        if unread {
                            Circle().fill(Theme.brand400).frame(width: 12, height: 12)
                                .overlay(Circle().stroke(Theme.surface, lineWidth: 2))
                                .offset(x: 1, y: -1)
                        }
                    }
                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .firstTextBaseline, spacing: Space.s) {
                        Text(n.title)
                            .font(unread ? .subheadline.weight(.bold) : .subheadline.weight(.medium))
                            .foregroundStyle(unread ? Theme.ink : Theme.inkSoft)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 4)
                        Text(n.date.timeAgo).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                    }
                    Text(n.body)
                        .font(.footnote)
                        .foregroundStyle(unread ? Theme.muted : Theme.faint)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
            }
            .padding(.horizontal, Space.l)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(unread ? "Unread. " : "")\(n.title). \(n.body). \(n.date.timeAgo)")
        .accessibilityHint("Opens the notification. Swipe for read options.")
    }
}
