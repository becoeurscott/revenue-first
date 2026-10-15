import Foundation

extension AppStore {
    /// The active enrollment's personal program (Week 1 only on the free plan).
    var generatedProgram: GeneratedProgram? { enrollment?.program }

    /// Premium arrived but the unlock animation hasn't played for this enrollment yet.
    var shouldCelebrateUnlock: Bool { isPremium && enrollment != nil && enrollment?.programUnlocked != true }

    /// Writes what the user is entitled to and nothing more: Week 1 for everyone, Days 8–30 only with Premium.
    /// Concurrent callers (the unlock screen, the plan tab) join the same run.
    func syncProgram() async {
        if let programTask { return await programTask.value }
        let task = Task { await writeEntitledProgram() }
        programTask = task
        await task.value
        programTask = nil
    }

    func markProgramUnlocked() {
        updateEnrollment { $0.programUnlocked = true }
        Monitoring.track("program_unlocked", ["journey": journey.id.rawValue, "source": generatedProgram?.source.rawValue ?? ""])
    }

    private func writeEntitledProgram() async {
        guard let start = enrollment else { return }
        let method = start.journeyId
        let name = s.answers.name
        // Days already done keep the brief they were done with, even if the niche changed since.
        let done = Set(s.progress[s.pathId]?.completedDays ?? [])
        let kept = start.program?.days.filter { done.contains($0.day) } ?? []

        var program = start.program
        if program == nil || program?.nicheVersion != start.niche.version {
            var fresh = await ProgramGenerator.preview(for: start, name: name)
            fresh.days = Self.keeping(kept, in: fresh.days)
            program = fresh
            setProgram(fresh, for: method)
        }
        guard isPremium, let current = program, !current.isComplete, let latest = s.journey?.enrollments[method] else { return }
        var full = await ProgramGenerator.complete(current, for: latest, name: name)
        full.days = Self.keeping(kept, in: full.days)
        setProgram(full, for: method)
        Monitoring.track("program_completed", ["journey": method.rawValue, "source": full.source.rawValue])
    }

    /// Writes into the enrollment it was generated for, even if the user switched journeys meanwhile.
    private func setProgram(_ program: GeneratedProgram, for method: EarningMethod) {
        guard var state = s.journey, var e = state.enrollments[method] else { return }
        e.program = program
        state.enrollments[method] = e
        s.journey = state
    }

    private static func keeping(_ kept: [ProgramDay], in days: [ProgramDay]) -> [ProgramDay] {
        let keptDays = Set(kept.map(\.day))
        return (days.filter { !keptDays.contains($0.day) } + kept).sorted { $0.day < $1.day }
    }
}
