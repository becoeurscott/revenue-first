import Foundation
import UserNotifications

/// Daily mission reminders and weekly check-in reminders, scheduled on the device.
///
/// No server is involved: the app plans the next week of reminders from the user's own settings
/// (reminder time, daily reminders, weekly check-ins) and replans whenever progress or settings change.
/// Tapping a reminder opens its screen through the same path as a tapped push.
enum Reminders {
    static let prefix = "vaulten.reminder."

    struct Plan: Equatable {
        var enabled: Bool
        var daily: Bool
        var weekly: Bool
        /// "9:00 AM" style, from Settings.
        var time: String
        var currentDay: Int
        var todayDone: Bool
        var finished: Bool
        var todayTitle: String
        var lastCheckIn: Date?
    }

    private static var last: Plan?

    static func start() {
        UNUserNotificationCenter.current().delegate = Delegate.shared
    }

    /// Replans only when something that affects reminders changed.
    static func sync(force: Bool = false, _ plan: Plan) {
        guard force || plan != last else { return }
        last = plan
        Task { await schedule(plan) }
    }

    private static func schedule(_ plan: Plan) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(prefix) }
        center.removePendingNotificationRequests(withIdentifiers: pending)
        guard plan.enabled, plan.daily || plan.weekly else { return }

        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            Monitoring.track("reminder_permission", ["accepted": granted])
            guard granted else { return }
        } else if settings.authorizationStatus == .denied {
            return
        }

        let (hour, minute) = parse(plan.time)
        let cal = Calendar.current
        let now = Date()
        var requests: [UNNotificationRequest] = []

        if plan.daily && !plan.finished {
            for offset in 0..<7 {
                guard let day = cal.date(byAdding: .day, value: offset, to: now),
                      let fire = cal.date(bySettingHour: hour, minute: minute, second: 0, of: day),
                      fire > now else { continue }
                if offset == 0 && plan.todayDone { continue }
                let first = offset == 0 || (offset == 1 && !plan.todayDone)
                let title = first ? "Day \(plan.currentDay) is waiting" : "Your next mission is ready"
                let body = first ? plan.todayTitle : "A few minutes today keeps your streak alive."
                requests.append(request(id: "daily.\(cal.component(.dayOfYear, from: fire))", title: title, body: body, link: "/home", at: fire))
            }
        }

        if plan.weekly {
            // The next four Sundays, skipping one that comes too soon after the last check-in.
            var sunday = cal.nextDate(after: now, matching: DateComponents(hour: hour, minute: minute, weekday: 1), matchingPolicy: .nextTime)
            var added = 0
            while let fire = sunday, added < 4 {
                let tooSoon = plan.lastCheckIn.map { fire.timeIntervalSince($0) < 6 * 86_400 } ?? false
                if !tooSoon {
                    requests.append(request(id: "weekly.\(cal.component(.weekOfYear, from: fire))", title: "Weekly check-in", body: "Three minutes to look back on your week and plan the next one.", link: "/check-in", at: fire))
                    added += 1
                }
                sunday = cal.date(byAdding: .day, value: 7, to: fire)
            }
        }

        for r in requests { try? await center.add(r) }
    }

    private static func request(id: String, title: String, body: String, link: String, at date: Date) -> UNNotificationRequest {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["link": link]
        let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        return UNNotificationRequest(identifier: prefix + id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: parts, repeats: false))
    }

    /// "9:00 AM" → (9, 0). Falls back to 9:00.
    static func parse(_ time: String) -> (Int, Int) {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "h:mm a"
        guard let d = f.date(from: time) else { return (9, 0) }
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        return (c.hour ?? 9, c.minute ?? 0)
    }

    final class Delegate: NSObject, UNUserNotificationCenterDelegate {
        static let shared = Delegate()

        /// Show reminders even while the app is open.
        func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
            [.banner, .list, .sound]
        }

        func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
            let n = response.notification.request
            guard n.identifier.hasPrefix(Reminders.prefix) else { return } // pushes are handled by OneSignal
            let link = (n.content.userInfo["link"] as? String) ?? "/home"
            let item = OpenedPush(title: n.content.title, body: n.content.body, link: link)
            await MainActor.run { NotificationCenter.default.post(name: Push.openedLink, object: item) }
            Monitoring.track("reminder_opened", ["link": link])
        }
    }
}
