import Foundation

// Month reviews: no income guarantee, so every 30 days end with honest numbers, the most likely reason
// money hasn't come yet, and a next month aimed at exactly that. Progress before money is shown as a
// funnel (output → reach → money) so a user with $0 can still see they are moving.

/// A finished month, kept on the enrollment so later months can compare.
struct MonthReview: Codable, Hashable {
    let month: Int
    let finishedAt: Date
    /// Funnel values when the month ended, keyed by metric.
    let metrics: [String: Int]
    let diagnosis: String
    let focus: String
}

/// One step of a journey's funnel.
struct FunnelStep: Hashable {
    let metric: StatMetric
    let label: String
    let icon: String
    var isMoney = false
}

enum MonthDiagnosis: String {
    case earned, consistency, output, reach, conversion

    var title: String {
        switch self {
        case .earned: "You earned money. Now repeat it."
        case .consistency: "The plan wasn't finished yet"
        case .output: "More output is the fastest fix"
        case .reach: "People aren't seeing it yet"
        case .conversion: "Interest is there. The offer needs work."
        }
    }
}

/// What a journey's first months honestly look like, and the funnel that shows progress before money.
enum MonthCoach {
    static func funnel(for journey: JourneyConfig) -> [FunnelStep] {
        switch journey.id {
        case .youtubeServices, .freelanceServices:
            return [FunnelStep(metric: .contacted, label: "Contacted", icon: "paperplane.fill"),
                    FunnelStep(metric: .replies, label: "Replies", icon: "bubble.left.and.bubble.right.fill"),
                    FunnelStep(metric: .clients, label: "Clients", icon: "person.2.fill"),
                    FunnelStep(metric: .revenue, label: "Earned", icon: "dollarsign.circle.fill", isMoney: true)]
        case .youtubeOwnedChannel:
            return [FunnelStep(metric: .videosPublished, label: "Videos", icon: "play.rectangle.fill"),
                    FunnelStep(metric: .subscribers, label: "Subscribers", icon: "person.3.fill"),
                    FunnelStep(metric: .channelIncome, label: "Earned", icon: "dollarsign.circle.fill", isMoney: true)]
        case .digitalProducts:
            return [FunnelStep(metric: .productsLaunched, label: "Launched", icon: "shippingbox.fill"),
                    FunnelStep(metric: .pageVisits, label: "Page visits", icon: "eye.fill"),
                    FunnelStep(metric: .salesCount, label: "Sales", icon: "cart.fill"),
                    FunnelStep(metric: .productRevenue, label: "Earned", icon: "dollarsign.circle.fill", isMoney: true)]
        case .affiliateContent:
            return [FunnelStep(metric: .postsPublished, label: "Posts", icon: "doc.richtext.fill"),
                    FunnelStep(metric: .linkClicks, label: "Link clicks", icon: "cursorarrow.click"),
                    FunnelStep(metric: .affiliateIncome, label: "Earned", icon: "dollarsign.circle.fill", isMoney: true)]
        case .creatorBrand:
            return [FunnelStep(metric: .postsPublished, label: "Posts", icon: "square.grid.2x2.fill"),
                    FunnelStep(metric: .followers, label: "Followers", icon: "person.3.fill"),
                    FunnelStep(metric: .brandIncome, label: "Earned", icon: "dollarsign.circle.fill", isMoney: true)]
        case .unknown:
            return []
        }
    }

    /// Output that usually comes before first income in a month, for an honest comparison.
    static func monthlyOutputTarget(_ id: EarningMethod) -> Int {
        switch id {
        case .youtubeServices, .freelanceServices: 60
        case .youtubeOwnedChannel: 8
        case .digitalProducts: 1
        case .affiliateContent, .creatorBrand: 20
        case .unknown: 1
        }
    }

    /// An honest first-income timeline, shown from the start so a $0 first month is expected, not a surprise.
    static func timeline(_ id: EarningMethod) -> String {
        switch id {
        case .youtubeServices, .freelanceServices: "A first client usually takes 2 to 8 weeks of steady, personal outreach and follow-ups."
        case .youtubeOwnedChannel: "Channels usually take several months before the first income. The first goals are publishing on a schedule and your first 100 subscribers."
        case .digitalProducts: "A first sale usually comes 2 to 8 weeks after launch, once you share the product where your buyers are."
        case .affiliateContent: "A first commission usually takes 1 to 3 months of consistent, helpful content."
        case .creatorBrand: "A first brand deal usually takes 2 to 6 months. UGC gigs and small paid posts can come sooner."
        case .unknown: "First income takes time. Steady weekly action is what gets you there."
        }
    }

    static func diagnose(journey: JourneyConfig, stats: Stats) -> MonthDiagnosis {
        let steps = funnel(for: journey)
        guard let output = steps.first, let money = steps.last else { return .consistency }
        if stats.value(money.metric) > 0 { return .earned }
        if stats.daysCompleted < 20 { return .consistency }
        if stats.value(output.metric) < monthlyOutputTarget(journey.id) { return .output }
        let reach = steps.count > 2 ? steps[1] : nil
        if let reach, stats.value(reach.metric) == 0 { return .reach }
        return .conversion
    }

    /// Why, in the user's own numbers, and what next month changes.
    static func explanation(_ d: MonthDiagnosis, journey: JourneyConfig, stats: Stats) -> (why: String, focus: String) {
        let steps = funnel(for: journey)
        let output = steps.first.map { stats.value($0.metric) } ?? 0
        let target = monthlyOutputTarget(journey.id)
        let service = journey.sellsServices
        let noun = journey.workspace?.itemNounPlural ?? "pieces"
        switch d {
        case .earned:
            let earned = steps.last.map { stats.value($0.metric) } ?? 0
            return ("You earned \(money(earned)) this month. That proves the method works for you.",
                    service ? "Turn your first client into a monthly retainer and find two more like them" : "Do more of what earned, and add one way to earn a little more from each visitor")
        case .consistency:
            return ("You finished \(stats.daysCompleted) of 30 missions. Most results come from the steps you didn't reach yet, so this is the clearest place to improve.",
                    "Finish the core actions, a little every day, before changing anything else")
        case .output:
            return service
                ? ("You contacted \(output) \(output == 1 ? "prospect" : "prospects"). First clients usually come after 60 to 100 personal messages plus follow-ups, so the method hasn't had a fair test yet.",
                   "Double your outreach and follow up with everyone after 3 to 4 days")
                : ("You published \(output) \(output == 1 ? (journey.workspace?.itemNoun ?? "piece") : noun). First results usually show after about \(target), so the method hasn't had a fair test yet.",
                   "Publish on a steady schedule you can keep, and hit \(target) by the end of next month")
        case .reach:
            return service
                ? ("You sent \(output) messages but got no replies yet. That usually means the first line, the free sample or the niche needs to change, not your effort.",
                   "A sharper first message with a free sample, tested on a narrower niche")
                : ("You published \(output) \(noun), but your numbers show almost nobody saw them yet. If you haven't logged your numbers, log them first. Otherwise titles, hooks and where you share matter most now.",
                   "Better titles and hooks, and one place to share every \(journey.workspace?.itemNoun ?? "piece")")
        case .conversion:
            return service
                ? ("People replied, but no one has paid yet. That is the hardest step for everyone, and it is fixable: make the first paid step small and easy to say yes to.",
                   "Turn replies into a small paid trial with a clear price")
                : ("People are seeing your \(noun), but not paying yet. The offer, the price or the call to action is the gap now, not the work.",
                   "A clearer offer, an honest beginner price and one clear call to action")
        }
    }
}

extension AppStore {
    /// Which month of the active journey the user is on (Month 1 = the first 30-day plan).
    var month: Int { enrollment?.month ?? 1 }

    /// Ends this month with a review and starts the next 30 days aimed at the diagnosis.
    /// Lessons, logged numbers, items, prospects and deals all stay; only the daily plan restarts.
    func startNextMonth() {
        guard let track = journey.track, enrollment != nil else { return }
        let stats = self.stats
        let diagnosis = MonthCoach.diagnose(journey: journey, stats: stats)
        let focus = MonthCoach.explanation(diagnosis, journey: journey, stats: stats).focus
        let snapshot = Dictionary(uniqueKeysWithValues: MonthCoach.funnel(for: journey).map { ($0.metric.rawValue, stats.value($0.metric)) })
        let finished = month
        updateEnrollment { e in
            e.reviews = (e.reviews ?? []) + [MonthReview(month: finished, finishedAt: Date(), metrics: snapshot, diagnosis: diagnosis.rawValue, focus: focus)]
            e.month = finished + 1
            e.focus = focus
            e.completedDayNiche = [:]
            // The next month's personal plan is written fresh, aimed at the focus.
            e.program = nil
            e.programUnlocked = true
        }
        for day in MockData.plan(track) { for t in day.tasks { s.tasks[t.id] = nil } }
        s.progress[track] = PathProgress()
        notify("arrow.clockwise.circle.fill", "Month \(finished + 1) starts today", "Your focus: \(focus.lowercasedFirst). Day 1 is ready.", "/plan/day/1")
        Monitoring.track("month_started", ["journey": journey.id.rawValue, "month": finished + 1, "diagnosis": diagnosis.rawValue])
    }
}
