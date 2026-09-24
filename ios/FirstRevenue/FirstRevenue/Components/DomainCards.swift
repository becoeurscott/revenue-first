import SwiftUI

// MARK: Lessons

struct LessonThumb: View {
    let lesson: Lesson
    var locked = false
    var body: some View {
        ZStack {
            Theme.hueGradient(lesson.hue)
            Circle().strokeBorder(.white.opacity(0.1), lineWidth: 12).frame(width: 96).offset(x: 60, y: -34)
            RoundedRectangle(cornerRadius: 6).strokeBorder(.white.opacity(0.15)).frame(width: 54, height: 30).rotationEffect(.degrees(-6)).offset(x: -46, y: 22)
            Image(systemName: locked ? "lock.fill" : "play.fill")
                .font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                .frame(width: 40, height: 40).background(Circle().fill(.black.opacity(0.35))).overlay(Circle().strokeBorder(.white.opacity(0.25)))
        }
        .overlay(alignment: .bottomTrailing) {
            Text(lesson.duration).font(.caption2.weight(.bold)).monospacedDigit().foregroundStyle(.white)
                .padding(.horizontal, 6).padding(.vertical, 2).background(RoundedRectangle(cornerRadius: 6).fill(.black.opacity(0.6))).padding(8)
        }
        .aspectRatio(16 / 9, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .accessibilityHidden(true)
    }
}

struct LessonCard: View {
    let lesson: Lesson
    var row = false
    @Environment(AppStore.self) private var store

    var body: some View {
        let done = store.s.completedLessons.contains(lesson.id)
        let saved = store.s.savedLessons.contains(lesson.id)
        let locked = store.isLessonLocked(lesson)
        Button { Haptics.tap(); store.push(.lesson(lesson.id)) } label: {
            Group {
                if row {
                    HStack(spacing: Space.m) {
                        LessonThumb(lesson: lesson, locked: locked).frame(width: 118)
                        info(done: done, saved: saved)
                    }
                    .card(padding: 10)
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        LessonThumb(lesson: lesson, locked: locked)
                        info(done: done, saved: saved).padding(.horizontal, 4).padding(.bottom, 4)
                    }
                    .card(padding: 10)
                }
            }
        }
        .buttonStyle(.pressable)
        .accessibilityLabel("\(lesson.title), \(lesson.category), \(lesson.minutes) minutes\(done ? ", completed" : "")\(locked ? ", locked" : "")")
    }

    private func info(done: Bool, saved: Bool) -> some View {
        HStack(alignment: .top, spacing: 6) {
            VStack(alignment: .leading, spacing: 4) {
                Text(lesson.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(2).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 5) {
                    Text(lesson.category).lineLimit(1)
                    Text("·")
                    Text("\(lesson.minutes) min").monospacedDigit()
                    if saved { Image(systemName: "bookmark.fill").foregroundStyle(Theme.brand300) }
                }
                .font(.caption).foregroundStyle(Theme.faint)
            }
            Spacer(minLength: 0)
            if done { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.success) }
        }
    }
}

// MARK: Prospects

extension ProspectStatus {
    var tone: Tone {
        switch self {
        case .new: .neutral
        case .contacted: .info
        case .replied: .brand
        case .interested, .negotiating: .warning
        case .won: .success
        case .lost: .danger
        }
    }
}

struct StatusBadge: View {
    let status: ProspectStatus
    var body: some View { Badge(status.rawValue, tone: status.tone) }
}

struct ProspectCard: View {
    let prospect: Prospect
    @Environment(AppStore.self) private var store
    var body: some View {
        Button { Haptics.tap(); store.push(.prospect(prospect.id)) } label: {
            VStack(spacing: Space.m) {
                HStack(alignment: .top, spacing: Space.m) {
                    AvatarView(name: prospect.name)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(prospect.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                            Spacer(minLength: 6)
                            StatusBadge(status: prospect.status)
                        }
                        Text(prospect.business).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
                        Text("\(prospect.platform) · \(prospect.audience)").font(.caption).foregroundStyle(Theme.faint).lineLimit(1)
                    }
                }
                Divider().overlay(Theme.line)
                HStack {
                    if let f = prospect.followUp {
                        Label("Follow-up \(f.timeAgo.lowercased())", systemImage: "calendar.badge.clock").foregroundStyle(Theme.warning)
                    } else {
                        Text("Last contact: \(prospect.lastContact.timeAgo)")
                    }
                    Spacer()
                    Text(money(prospect.value)).font(.subheadline.weight(.bold)).monospacedDigit().foregroundStyle(Theme.ink)
                }
                .font(.caption).foregroundStyle(Theme.faint)
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityLabel("\(prospect.name), \(prospect.business), \(prospect.status.rawValue), \(money(prospect.value))")
    }
}

// MARK: Resources

enum ResourceIcon {
    static func name(_ type: String) -> String {
        switch type {
        case "Template": "doc.text"
        case "Tool": "wrench.and.screwdriver"
        case "Guide": "map"
        case "Checklist": "checklist"
        case "Script": "text.bubble"
        case "Calculator": "function"
        default: "doc"
        }
    }
}

struct ResourceCard: View {
    let resource: Resource
    @Environment(AppStore.self) private var store
    var body: some View {
        let saved = store.s.savedResources.contains(resource.id)
        Button { Haptics.tap(); store.push(.resource(resource.id)) } label: {
            HStack(spacing: Space.m) {
                Image(systemName: ResourceIcon.name(resource.type)).font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.brand300)
                    .frame(width: 44, height: 44).background(RoundedRectangle(cornerRadius: Radius.md).fill(Theme.brand500.opacity(0.12)))
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(resource.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                        if saved { Image(systemName: "bookmark.fill").font(.caption).foregroundStyle(Theme.brand300) }
                    }
                    Text("\(resource.type) · \(resource.minutes) min").font(.caption).foregroundStyle(Theme.faint)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
    }
}

// MARK: Streak heatmap

struct HeatmapView: View {
    let activeDays: [String]
    var weeks = 5
    var body: some View {
        let active = Set(activeDays)
        let cal = Calendar.current
        let today = Date()
        let end = cal.date(byAdding: .day, value: 7 - cal.component(.weekday, from: today), to: today)!
        let cells = (0..<(weeks * 7)).map { cal.date(byAdding: .day, value: -(weeks * 7 - 1 - $0), to: end)! }
        let cols = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)
        VStack(spacing: 8) {
            LazyVGrid(columns: cols, spacing: 6) {
                ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { Text($0.element).font(.caption2.weight(.semibold)).foregroundStyle(Theme.faint) }
            }
            LazyVGrid(columns: cols, spacing: 6) {
                ForEach(cells, id: \.self) { d in
                    let on = active.contains(d.dayKey)
                    let isToday = d.dayKey == today.dayKey
                    Text("\(cal.component(.day, from: d))")
                        .font(.caption.weight(.semibold)).monospacedDigit()
                        .foregroundStyle(on ? .white : isToday ? Theme.ink : Theme.faint)
                        .frame(maxWidth: .infinity).aspectRatio(1, contentMode: .fit)
                        .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(on ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.surface2)))
                        .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(isToday && !on ? Theme.brand500.opacity(0.7) : .clear, lineWidth: 2))
                        .opacity(d > today && !on ? 0.35 : 1)
                }
            }
        }
        .accessibilityElement()
        .accessibilityLabel("\(activeDays.count) active days in the last \(weeks) weeks")
    }
}

// MARK: Mock video player

/// Fake player. Nothing streams — playback is simulated at 40× so a 12-minute lesson finishes in ~20s.
struct VideoPlayerMock: View {
    let lesson: Lesson
    var onProgress: (Double) -> Void = { _ in }
    var onEnded: () -> Void = {}
    @State private var playing = false
    @State private var muted = false
    @State private var t = 0.0
    @State private var fullscreen = false

    var body: some View {
        player.fullScreenCover(isPresented: $fullscreen) {
            player.frame(maxHeight: .infinity).background(.black).overlay(alignment: .topLeading) {
                Button { fullscreen = false } label: { Image(systemName: "xmark").font(.headline).foregroundStyle(.white).frame(width: 44, height: 44).background(Circle().fill(.black.opacity(0.5))) }
                    .padding().accessibilityLabel("Exit fullscreen")
            }
        }
        .task(id: playing) {
            guard playing else { return }
            let total = Double(lesson.seconds)
            while playing && !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(100))
                t = min(t + 4, total)
                onProgress(t / total)
                if t >= total { playing = false; onEnded() }
            }
        }
    }

    private var player: some View {
        let total = Double(lesson.seconds)
        return ZStack {
            Theme.hueGradient(lesson.hue)
            Circle().strokeBorder(.white.opacity(0.1), lineWidth: 24).frame(width: 220).offset(x: 120, y: -70).rotationEffect(.degrees(playing ? 360 : 0)).animation(playing ? .linear(duration: 9).repeatForever(autoreverses: false) : .default, value: playing)
            if !playing {
                Text(lesson.title).font(.title2.weight(.heavy)).foregroundStyle(.white).shadow(radius: 4)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading).padding(.horizontal, 20).padding(.bottom, 58)
            }
            Button {
                Haptics.tap()
                if t >= total { t = 0 }
                playing.toggle()
            } label: {
                Image(systemName: playing ? "pause.fill" : "play.fill").font(.system(size: 26, weight: .bold)).foregroundStyle(.white)
                    .frame(width: 72, height: 72).background(Circle().fill(.white.opacity(0.15))).overlay(Circle().strokeBorder(.white.opacity(0.3))).background(.ultraThinMaterial, in: Circle())
                    .opacity(playing ? 0.35 : 1)
            }
            .accessibilityLabel(playing ? "Pause lesson" : "Play lesson")
        }
        .overlay(alignment: .top) {
            HStack {
                Text(lesson.category.uppercased()).font(.caption2.weight(.bold)).tracking(0.6)
                Spacer()
                Text("Simulated lesson · 40×").font(.caption2.weight(.semibold))
            }
            .foregroundStyle(.white.opacity(0.9)).padding(12)
        }
        .overlay(alignment: .bottom) {
            VStack(spacing: 6) {
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(.white.opacity(0.25))
                        Capsule().fill(Theme.brandGradient).frame(width: g.size.width * t / total)
                    }
                    .frame(height: 4).frame(maxHeight: .infinity)
                    .contentShape(Rectangle())
                    .gesture(DragGesture(minimumDistance: 0).onChanged { v in t = min(max(v.location.x / g.size.width, 0), 1) * total; onProgress(t / total) })
                }
                .frame(height: 20)
                .accessibilityElement()
                .accessibilityLabel("Playback position")
                .accessibilityValue("\(fmt(t)) of \(lesson.duration)")
                .accessibilityAdjustableAction { dir in t = dir == .increment ? min(t + 15, total) : max(t - 15, 0) }
                HStack {
                    Text("\(fmt(t)) / \(lesson.duration)").font(.caption.weight(.medium)).monospacedDigit()
                    Spacer()
                    Button { muted.toggle() } label: { Image(systemName: muted ? "speaker.slash.fill" : "speaker.wave.2.fill").frame(width: 40, height: 36) }.accessibilityLabel(muted ? "Unmute" : "Mute")
                    Button { fullscreen.toggle() } label: { Image(systemName: "arrow.up.left.and.arrow.down.right").frame(width: 40, height: 36) }.accessibilityLabel("Fullscreen")
                }
                .foregroundStyle(.white)
            }
            .padding(.horizontal, 12).padding(.bottom, 6)
            .background(LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .top, endPoint: .bottom))
        }
        .aspectRatio(16 / 9, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: fullscreen ? 0 : Radius.xl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line))
    }

    private func fmt(_ s: Double) -> String { String(format: "%d:%02d", Int(s) / 60, Int(s) % 60) }
}
