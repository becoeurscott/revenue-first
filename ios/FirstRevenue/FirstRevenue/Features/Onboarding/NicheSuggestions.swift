import Foundation

/// Niche suggestions for onboarding: a starting set that fits the route while the field is empty, and every
/// matching industry once the user types.
enum NicheSuggestions {
    /// Shown before typing, by route.
    static func starters(for method: EarningMethod?) -> [String] {
        switch method {
        case .freelanceServices?:
            ["Restaurants", "Dentists", "Hair salons", "Real estate agents", "Gyms and fitness studios", "Plumbers",
             "Lawyers", "Car dealerships", "Coffee shops", "Beauty salons", "Clinics", "E-commerce stores"]
        case .youtubeServices?:
            ["Podcasters", "Fitness coaches", "Gaming streamers", "Business YouTubers", "Educators", "Finance creators",
             "Tech reviewers", "Cooking channels", "Motivational speakers", "Travel vloggers", "Beauty creators", "Coaches and consultants"]
        case .digitalProducts?:
            ["Productivity", "Personal finance", "Fitness", "Language learning", "Small business", "Teachers",
             "Graphic design", "Parenting", "Career and job search", "Notion and planning", "Photography", "Wedding planning"]
        case .affiliateContent?:
            ["Tech and gadgets", "Home and kitchen", "Beauty and skincare", "Fitness gear", "Software and apps", "Travel",
             "Gaming gear", "Books", "Baby products", "Pet supplies", "Outdoor and camping", "Personal finance"]
        default:
            ["Fitness", "Gaming", "Beauty", "Personal finance", "Education", "Food and cooking",
             "Travel", "Fashion and style", "Technology", "Health and wellness", "Motivation", "Comedy"]
        }
    }

    /// Up to `limit` industries containing the typed text, best matches (starting with it) first.
    static func matches(_ typed: String, limit: Int = 12) -> [String] { search(typed, in: all, limit: limit) }

    /// Entries of `list` containing the typed text: those starting with it, then a word starting with it, then the rest.
    static func search(_ typed: String, in list: [String], limit: Int = 12) -> [String] {
        let all = list
        let q = typed.trimmingCharacters(in: .whitespaces).folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
        guard q.count >= 1 else { return [] }
        func norm(_ s: String) -> String { s.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil) }
        func rank(_ s: String) -> Int? {
            let n = norm(s)
            if n.hasPrefix(q) { return 0 }
            if n.split(separator: " ").contains(where: { $0.hasPrefix(q) }) { return 1 }
            return n.contains(q) ? 2 : nil
        }
        let ranked: [(String, Int)] = all.compactMap { s in rank(s).map { (s, $0) } }
        return Array(ranked.sorted { $0.1 < $1.1 }.map(\.0).prefix(limit))
    }

    /// Every industry and audience we suggest, A to Z.
    static let all: [String] = [
        "Accountants", "Acting", "Agriculture", "Air conditioning and HVAC", "Animation", "Anime", "Antiques", "Apps and software",
        "Architecture", "Art and drawing", "Astrology", "Automotive", "Aviation", "Baby products", "Bakeries", "Barbers",
        "Beauty", "Beauty salons", "Beekeeping", "Bicycles and cycling", "Blockchain and crypto", "Board games", "Books", "Boxing",
        "Bridal and weddings", "Business coaching", "Business YouTubers", "Camping and outdoors", "Car dealerships", "Car detailing",
        "Career and job search", "Carpentry", "Cats", "Chess", "Childcare", "Chiropractors", "Cleaning services", "Clinics",
        "Clothing brands", "Coaches and consultants", "Coffee shops", "Comedy", "Comics", "Construction", "Content creators",
        "Cooking", "Cosmetics", "Crafts and DIY", "Cybersecurity", "Dance", "Data science", "Dating and relationships", "Dentists",
        "Dermatology", "Digital marketing", "Dogs", "Driving schools", "E-commerce stores", "Education", "Educators", "Electricians",
        "Electronics", "Entrepreneurship", "Event planning", "Fashion and style", "Film and movies", "Finance creators", "Fishing",
        "Fitness", "Fitness coaches", "Fitness gear", "Florists", "Food and cooking", "Food trucks", "Football", "Furniture",
        "Gaming", "Gaming gear", "Gaming streamers", "Gardening", "Graphic design", "Gyms and fitness studios", "Hair salons",
        "Handmade goods", "Health and wellness", "Hiking", "History", "Home and kitchen", "Home decor", "Home improvement",
        "Hotels and hospitality", "Hunting", "Insurance agents", "Interior design", "Investing", "Jewelry", "Journaling",
        "Language learning", "Law firms", "Lawyers", "Life coaching", "Local businesses", "Luxury", "Makeup", "Marketing agencies",
        "Martial arts", "Massage therapists", "Meditation and mindfulness", "Mental health", "Minimalism", "Mobile apps",
        "Motivation", "Motivational speakers", "Motorcycles", "Music", "Music producers", "Musicians", "Nail salons", "Nonprofits",
        "Notion and planning", "Nutrition", "Nurses", "Online courses", "Outdoor and camping", "Painting", "Parenting",
        "Personal development", "Personal finance", "Pet grooming", "Pet supplies", "Pets", "Pharmacies", "Photographers",
        "Photography", "Physical therapy", "Pilates", "Plants", "Plumbers", "Podcasters", "Podcasters and creators", "Poetry",
        "Productivity", "Programming", "Psychology", "Real estate", "Real estate agents", "Recruiting", "Religion and faith",
        "Remote work", "Restaurants", "Retail stores", "Roofing", "Running", "SaaS companies", "Science", "Sewing", "Skateboarding",
        "Skincare", "Small business", "Sneakers", "Soccer", "Social media marketing", "Software and apps", "Spas", "Sports",
        "Startups", "Streetwear", "Students", "Study tips", "Sustainability", "Tattoo artists", "Teachers", "Tech and gadgets",
        "Tech reviewers", "Technology", "Tennis", "Therapists", "Thrifting", "Travel", "Travel vloggers", "Tutoring",
        "Vegan food", "Veterinarians", "Video editing", "Video games", "Watches", "Web design", "Wedding planning",
        "Weight loss", "Wine and cocktails", "Woodworking", "Writing", "Yoga",
    ]

    /// Skills offered in "Add another skill", beyond the route's own choices.
    static let skills: [String] = [
        "3D modeling", "Accounting", "Admin and virtual assistance", "Animation", "App development", "Baking", "Blogging",
        "Bookkeeping", "Branding", "Canva", "Cold outreach", "Coaching", "Coding", "Community building", "Community management",
        "Content strategy", "Cooking", "Copywriting", "Course creation", "Customer service", "Data analysis", "Data entry",
        "Drawing and illustration", "Drone filming", "Ebook writing", "Email marketing", "Event planning", "Excel and spreadsheets",
        "Facebook ads", "Fashion and styling", "Figma", "Fitness training", "Gaming", "Google Ads", "Google Business Profile",
        "Graphic design", "Hair and makeup", "Interior design", "Interviewing", "Languages", "Lead generation", "Live streaming",
        "Logo design", "Makeup", "Marketing", "Motion graphics", "Music and audio", "Music production", "Negotiation",
        "Notion and templates", "Nutrition", "Online research", "Organizing", "Photo editing", "Photography", "Pinterest",
        "Podcasting", "Presentation design", "Product reviews", "Project management", "Proofreading", "Public speaking",
        "Research", "Sales", "Scriptwriting", "SEO", "Shopify", "Short-form video", "Social media", "Social media ads",
        "Speaking on camera", "Storytelling", "Teaching", "Thumbnail design", "TikTok", "Translation", "Trend spotting",
        "Tutoring", "UX design", "Video editing", "Voiceover", "Web design", "WordPress", "Writing", "YouTube SEO",
    ]
}
