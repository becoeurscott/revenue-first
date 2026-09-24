import Foundation

// Frontend-only "intelligence". Each engine is a pure function so a real API can replace it later
// without touching the screens. Ported 1:1 from src/data/{onboarding,pricing,messages,coach}.ts.

// MARK: - Path recommendation

struct Recommendation: Hashable {
    let pathId: PathID
    let match: Int
    let summary: String
    let reasons: [String]
}

enum RecommendationEngine {
    private static let contentSkills = ["Video editing", "Social media", "Graphic design", "Photography", "Writing"]
    private static let businessSkills = ["Sales", "Marketing", "Customer service", "Research", "Web development"]

    static func recommend(_ a: OnboardingAnswers) -> Recommendation {
        var clip = 0.0, gbp = 0.0
        var clipWhy: [String] = [], gbpWhy: [String] = []

        if a.interest == "Creating content" {
            clip += 4; clipWhy.append("You're more excited by creating content than by consulting")
        } else if a.interest == "Helping businesses" {
            gbp += 4; gbpWhy.append("You're drawn to helping real businesses get found")
        }

        let content = a.skills.filter(contentSkills.contains)
        let business = a.skills.filter(businessSkills.contains)
        if !content.isEmpty {
            clip += Double(content.count) * 1.5 + (content.contains("Video editing") ? 2 : 0)
            clipWhy.append("You already have \(content.prefix(2).joined(separator: " and ").lowercased()) skills")
        }
        if !business.isEmpty {
            gbp += Double(business.count) * 1.5 + (business.contains("Sales") ? 2 : 0)
            gbpWhy.append("Your \(business.prefix(2).joined(separator: " and ").lowercased()) background transfers directly")
        }

        if ["Comfortable", "Very comfortable"].contains(a.comfort) {
            gbp += 1.5; gbpWhy.append("You're comfortable talking to owners, which local outreach rewards")
        } else if !a.comfort.isEmpty {
            clip += 1; clipWhy.append("Creator outreach happens over DMs — low pressure while you build confidence")
        }

        if ["15 minutes", "30 minutes"].contains(a.time) {
            gbp += 1; gbpWhy.append("Profile audits fit neatly into \(a.time) a day")
        } else if !a.time.isEmpty {
            clip += 1; clipWhy.append("\(a.time) a day is enough to edit and pitch consistently")
        }

        if a.budget == "$0" {
            gbp += 0.5; gbpWhy.append("It needs no paid tools to start")
        } else if !a.budget.isEmpty {
            clipWhy.append("Your \(a.budget) budget comfortably covers the editing tools")
        }

        if ["Creator", "Student"].contains(a.role) { clip += 0.5 }
        if ["Employee", "Entrepreneur"].contains(a.role) { gbp += 0.5 }

        let pathId: PathID = gbp > clip ? .gbp : .clipping
        let total = max(clip + gbp, 1)
        let match = min(98, Int((72 + max(clip, gbp) / total * 26).rounded()))
        var reasons = Array((pathId == .clipping ? clipWhy : gbpWhy).prefix(4))
        if !a.goal.isEmpty { reasons.append("A first \(a.goal) is realistic on this path within 30 days") }
        let summary = pathId == .clipping
            ? "Based on your skills, available time, and interest in content, we've matched you with Short-Form Clipping."
            : "Based on your strengths, schedule, and interest in helping businesses, we've matched you with Google Business Profiles."
        return Recommendation(pathId: pathId, match: match, summary: summary, reasons: reasons)
    }
}

// MARK: - Pricing assistant

struct PriceRecommendation: Hashable {
    struct Row: Hashable { let label: String; let amount: Int }
    let low: Int
    let high: Int
    let mid: Int
    let breakdown: [Row]
    let rationale: String
    let tips: [String]
}

enum PricingEngine {
    private static func round5(_ n: Double) -> Int { Int((n / 5).rounded()) * 5 }
    private static func mult(_ list: [LabeledMultiplier], _ label: String) -> Double { (list.first { $0.label == label } ?? list[0]).mult }

    static func recommend(path: PathID, service: String, experience: String, clientSize: String, scope: String, turnaround: String) -> PriceRecommendation {
        let data = MockData.shared.pricing
        let options = data.options[path.rawValue]!
        let svc = options.services.first { $0.label == service } ?? options.services[0]
        let expMult = mult(data.experienceLevels, experience)

        let base = round5(svc.base * expMult)
        let scopeAdj = round5(Double(base) * (mult(options.scopes, scope) - 1))
        let work = Double(base + scopeAdj)
        let revisions = round5(work * 0.1)
        let rush = round5(work * (mult(data.turnarounds, turnaround) - 1))
        let sizeAdj = round5(work * (mult(data.clientSizes, clientSize) - 1))

        let rows = [
            PriceRecommendation.Row(label: "Base service", amount: base),
            .init(label: "Scope adjustment", amount: scopeAdj),
            .init(label: "Revisions (2 rounds)", amount: revisions),
            .init(label: "Rush delivery", amount: rush),
            .init(label: "Client size adjustment", amount: sizeAdj),
        ]
        let mid = rows.reduce(0) { $0 + $1.amount }
        let low = round5(Double(mid) * 0.8), high = round5(Double(mid) * 1.2)

        let levelNote = expMult < 1
            ? "As a beginner, a slightly lower price makes it easy for a first client to say yes while you build proof."
            : expMult > 1 ? "Your experience justifies a premium. Lead with results from past clients."
            : "With some results behind you, you can charge the standard market rate."
        let rushNote = rush > 0 ? " Faster delivery is priced in, so state the deadline clearly in your offer." : ""
        let rationale = "For “\(svc.label)” a fair range is $\(low)–$\(high), with $\(mid) as your target. \(levelNote)\(rushNote) Quote the target, and only go toward $\(low) in exchange for something: a testimonial, faster payment or a longer commitment."
        let tips = path == .clipping
            ? ["Quote one price for the whole pack, never per clip or per hour.", "Ask for 50% upfront before you start editing.", "After delivery, offer a monthly retainer at a small discount."]
            : ["Anchor your price to one new customer: what is a new patient or member worth to them?", "Ask for 50% upfront and 50% when the fixes are live.", "Offer monthly posts and review replies as a follow-on retainer."]
        return PriceRecommendation(low: low, high: high, mid: mid, breakdown: rows, rationale: rationale, tips: tips)
    }
}

// MARK: - Outreach message generator

enum OutreachEngine {
    private struct ToneKit {
        let greeting: (String) -> String
        let openers: [(String) -> String]
        let bodies: [String]
        let closers: [String]
    }

    private static let kits: [String: ToneKit] = [
        "Friendly": ToneKit(
            greeting: { "Hey \($0)!" },
            openers: [
                { "I've been following \($0) for a little while and I really like what you're building." },
                { "I came across \($0) this week and ended up spending way longer on it than I planned, in a good way." },
                { "Quick note from a fan of \($0). The quality really stands out compared to others in your space." },
            ],
            bodies: [
                "I work with a small number of clients at a time, so everything gets my full attention and you always deal with me directly.",
                "I'm early in building this service, which means you get extra care, fast replies and a price that's easy to say yes to.",
                "I keep things simple: clear scope, quick turnaround, and two rounds of revisions so you end up with something you love.",
            ],
            closers: ["Either way, keep it up!", "Thanks for reading this far!", "Hope to hear from you."]),
        "Professional": ToneKit(
            greeting: { "Hi \($0)," },
            openers: [
                { "I'm reaching out because I reviewed \($0) this week and noticed a clear opportunity you may not be using yet." },
                { "I took some time to look closely at \($0) and wanted to share one specific observation with you." },
                { "My name is Alex. I've been studying \($0) and I believe a small change could bring you noticeably more reach." },
            ],
            bodies: [
                "My process is straightforward: a defined scope, a fixed price agreed upfront, delivery within one week, and two rounds of revisions included.",
                "I handle the work end to end, so it requires about ten minutes of your time in total. You approve, I deliver.",
                "You receive a clear scope and a fixed price before anything starts, and you only continue if the first results are useful.",
            ],
            closers: ["Thank you for your time.", "I appreciate you considering it.", "Best regards,"]),
        "Casual": ToneKit(
            greeting: { "Hey \($0)," },
            openers: [
                { "so I was checking out \($0) last night and had an idea I couldn't shake." },
                { "big fan of \($0). Not going to write you an essay, promise." },
                { "found \($0) a few days ago and I think you're leaving some easy wins on the table." },
            ],
            bodies: [
                "No big contract, no weird upsells. I do the work, you look at it, and if it's not useful you've lost nothing.",
                "It's just me, so you get fast replies and zero agency nonsense. Most things are done within the week.",
                "I take care of the whole thing. You'd spend maybe ten minutes on it, tops.",
            ],
            closers: ["No pressure at all.", "Cheers!", "Talk soon, hopefully."]),
        "Direct": ToneKit(
            greeting: { "\($0)," },
            openers: [
                { "I looked at \($0) and found something that is costing you attention every week." },
                { "short version: \($0) has a gap I can fix within a week." },
                { "I'll keep this brief. \($0) is good, and it could be reaching far more people than it does today." },
            ],
            bodies: [
                "Fixed price, one-week delivery, two revision rounds. If the first result is not useful, you owe me nothing.",
                "I do the work end to end. You approve the result. It takes about ten minutes of your time.",
                "One clear scope, one price, no long-term commitment. You decide what happens after you see the results.",
            ],
            closers: ["Yes or no is fine.", "Thanks.", "Your call."]),
    ]

    private static let pathLines: [PathID: [(String, String) -> String]] = [
        .clipping: [
            { s, _ in "What I do: \(s). I take your long-form content, find the strongest moments, and turn them into captioned vertical clips for Shorts, Reels and TikTok." },
            { s, b in "I offer \(s): I pull the best 30–60 second moments out of \(b), add hooks and captions, and hand you clips that are ready to post." },
            { s, _ in "My service is \(s). Your long videos already contain great short clips. They just need someone to cut, caption and package them every week." },
        ],
        .gbp: [
            { s, b in "What I do: \(s). I fix the things on the \(b) Google listing that decide who shows up first on Maps: services, photos, categories and reviews." },
            { s, _ in "I offer \(s). Most local businesses lose calls because their Google profile is half empty, and it's one of the easiest things to fix." },
            { s, b in "My service is \(s). When people search nearby, a complete profile wins the call, and right now \(b) is missing a few key pieces." },
        ],
    ]

    private static let goalLines: [String: [PathID: [String]]] = [
        "Start a conversation": [
            .clipping: ["Are short clips something you have been meaning to do more of?", "Is short-form on your radar for this quarter, or is it not a priority right now?", "Curious: who handles your Shorts and Reels at the moment?"],
            .gbp: ["Is showing up higher on Google Maps something you have been thinking about?", "Curious: who looks after your Google profile at the moment?", "Would it be useful if I shared the two or three things I noticed?"],
        ],
        "Offer a free sample": [
            .clipping: ["Can I cut one clip from your latest episode for free, so you can judge the quality yourself?", "I'd like to send you one finished sample clip at no cost. Should I go ahead?", "I already have a moment in mind from your last upload. Want me to send a free sample?"],
            .gbp: ["Can I send you a free one-page audit showing exactly what I would fix?", "I've already written up a short audit of your profile. Want me to send it over, free?", "I'd like to send you a free list of the five quickest fixes. Should I go ahead?"],
        ],
        "Book a call": [
            .clipping: ["Do you have 15 minutes this week for a quick call? I can walk you through a few clip ideas.", "Would a 15-minute call on Thursday or Friday work to go through the plan?", "Open to a short call this week? I'll bring three clip ideas made for your channel."],
            .gbp: ["Do you have 15 minutes this week for a quick call? I can walk you through what I found.", "Would a 15-minute call on Thursday or Friday work? I will share my screen and show you the gaps.", "Open to a short call this week? I will bring a one-page audit of your profile."],
        ],
        "Follow up": [
            .clipping: ["I sent a note last week and wanted to bump it once. Is a free sample clip still worth a look?", "Following up on my earlier message in case it got buried. Should I send that sample clip?", "Circling back one time. If the timing is off, just say so and I'll check in next month."],
            .gbp: ["I sent a note last week and wanted to bump it once. Is the free audit still worth a look?", "Following up on my earlier message in case it got buried. Should I send the audit over?", "Circling back one time. If the timing is off, just say so and I'll check in next month."],
        ],
    ]

    private static func pick<T>(_ items: [T], _ v: Int) -> T { items[((v % items.count) + items.count) % items.count] }

    /// Pure, offline message generator. No network calls.
    static func generate(name: String, business: String, service: String, tone: String, goal: String, path: PathID, variant v: Int, sender: String = "Alex") -> String {
        let first = name.split(separator: " ").first.map(String.init) ?? "there"
        let biz = business.trimmingCharacters(in: .whitespaces).isEmpty ? "your business" : business
        let svc = service.isEmpty ? (MockData.shared.generatorOptions.services[path.rawValue]?.first ?? "") : service
        let kit = kits[tone] ?? kits["Friendly"]!
        let goals = goalLines[goal] ?? goalLines["Start a conversation"]!
        let opener = pick(kit.openers, v)(biz)
        let pathLine = pick(pathLines[path]!, v + 1)(svc, biz)
        let body = pick(kit.bodies, v + 2)
        let cta = pick(goals[path]!, v)
        let closer = pick(kit.closers, v + 1)
        return ["\(kit.greeting(first)) \(opener)", pathLine, body, cta, "\(closer)\n— \(sender.isEmpty ? "Alex" : sender)"].joined(separator: "\n\n")
    }
}

// MARK: - Mock AI coach

enum CoachEngine {
    /// First canned reply whose keyword appears in the message, in data order (most specific first).
    static func reply(to text: String) -> CoachReply {
        let lower = text.lowercased()
        return MockData.shared.coach.replies.first { $0.keywords.contains { lower.contains($0) } } ?? MockData.shared.coach.fallback
    }

    /// Simulated "thinking" time, scaled a little with answer length.
    static func typingDelay(for reply: String) -> Duration {
        .milliseconds(min(2200, 900 + reply.count * 2))
    }
}
