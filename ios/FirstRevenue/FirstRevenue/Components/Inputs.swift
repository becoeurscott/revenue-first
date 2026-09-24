import SwiftUI

struct FRTextField: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var systemImage: String? = nil
    var secure = false
    var error: String? = nil
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType? = nil
    @State private var reveal = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
            HStack(spacing: 10) {
                if let systemImage { Image(systemName: systemImage).foregroundStyle(Theme.faint).frame(width: 20) }
                Group {
                    if secure && !reveal { SecureField(placeholder, text: $text) } else { TextField(placeholder, text: $text) }
                }
                .focused($focused)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .textInputAutocapitalization(keyboard == .emailAddress || secure ? .never : .sentences)
                .autocorrectionDisabled(keyboard == .emailAddress || secure)
                .foregroundStyle(Theme.ink)
                if secure {
                    Button { reveal.toggle() } label: { Image(systemName: reveal ? "eye.slash" : "eye").foregroundStyle(Theme.faint).frame(width: 44, height: 44) }
                        .accessibilityLabel(reveal ? "Hide password" : "Show password")
                }
            }
            .padding(.leading, 16).padding(.trailing, secure ? 4 : 16)
            .frame(minHeight: 52)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(error != nil ? Theme.danger.opacity(0.7) : focused ? Theme.brand500 : Theme.line, lineWidth: focused ? 1.5 : 1))
            if let error { Text(error).font(.footnote).foregroundStyle(Theme.danger).transition(.opacity) }
        }
        .animation(.snappy, value: focused)
    }
}

struct FRTextArea: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var minHeight: CGFloat = 110
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
            TextField(placeholder, text: $text, axis: .vertical)
                .focused($focused)
                .lineLimit(4...12)
                .foregroundStyle(Theme.ink)
                .padding(14)
                .frame(minHeight: minHeight, alignment: .topLeading)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(focused ? Theme.brand500 : Theme.line, lineWidth: focused ? 1.5 : 1))
        }
    }
}

/// Labeled menu picker styled like a text field.
struct SelectRow: View {
    let label: String
    @Binding var selection: String
    let options: [String]
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
            Menu {
                Picker(label, selection: $selection) { ForEach(options, id: \.self) { Text($0).tag($0) } }
            } label: {
                HStack {
                    Text(selection.isEmpty ? "Choose…" : selection).foregroundStyle(selection.isEmpty ? Theme.faint : Theme.ink).lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
                }
                .padding(.horizontal, 16)
                .frame(minHeight: 52)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
            }
            .accessibilityLabel(label)
            .accessibilityValue(selection)
        }
    }
}

struct SearchField: View {
    @Binding var text: String
    var placeholder = "Search"
    var onSubmit: () -> Void = {}
    @FocusState var focused: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass").foregroundStyle(Theme.faint)
            TextField(placeholder, text: $text).focused($focused).submitLabel(.search).onSubmit(onSubmit).foregroundStyle(Theme.ink).autocorrectionDisabled()
            if !text.isEmpty {
                Button { text = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.faint).frame(width: 36, height: 36) }
                    .accessibilityLabel("Clear search")
            }
        }
        .padding(.leading, 16).padding(.trailing, 6)
        .frame(height: 48)
        .background(Capsule().fill(Theme.surface))
        .overlay(Capsule().strokeBorder(focused ? Theme.brand500 : Theme.line))
    }
}

/// Horizontally scrolling single-select chips.
struct FilterChips<T: Hashable>: View {
    let options: [T]
    @Binding var selection: T
    var title: (T) -> String
    var count: ((T) -> Int?)? = nil

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { o in
                    let on = o == selection
                    Button { Haptics.select(); withAnimation(.snappy) { selection = o } } label: {
                        HStack(spacing: 5) {
                            Text(title(o))
                            if let c = count?(o) { Text("\(c)").font(.caption2.weight(.bold)).opacity(0.7).monospacedDigit() }
                        }
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(on ? Theme.brand300 : Theme.muted)
                        .padding(.horizontal, 16).frame(height: 40)
                        .background(Capsule().fill(on ? Theme.brand500.opacity(0.15) : Theme.surface))
                        .overlay(Capsule().strokeBorder(on ? Theme.brand500.opacity(0.5) : Theme.line))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .padding(.horizontal, Space.gutter)
        }
        .padding(.horizontal, -Space.gutter)
    }
}

extension FilterChips where T == String {
    init(options: [String], selection: Binding<String>, count: ((String) -> Int?)? = nil) {
        self.init(options: options, selection: selection, title: { $0 }, count: count)
    }
}

/// Pill segmented control with a sliding gradient thumb.
struct SegmentedTabs<T: Hashable>: View {
    let options: [T]
    @Binding var selection: T
    var title: (T) -> String
    @Namespace private var ns

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(options, id: \.self) { o in
                    let on = o == selection
                    Button { Haptics.select(); withAnimation(.snappy) { selection = o } } label: {
                        Text(title(o))
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(on ? .white : Theme.muted)
                            .padding(.horizontal, 16).frame(height: 38)
                            .frame(minWidth: 72)
                            .background {
                                if on { Capsule().fill(Theme.brandGradient).matchedGeometryEffect(id: "thumb", in: ns).shadow(color: Theme.brand600.opacity(0.35), radius: 8, y: 3) }
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .padding(4)
        }
        .background(Capsule().fill(Theme.surface))
        .overlay(Capsule().strokeBorder(Theme.line))
        .clipShape(Capsule())
    }
}

extension SegmentedTabs where T == String {
    init(options: [String], selection: Binding<String>) { self.init(options: options, selection: selection, title: { $0 }) }
}

/// Toggle tinted with the brand color.
struct FRToggleRow: View {
    let icon: String
    let title: String
    var detail: String? = nil
    @Binding var isOn: Bool
    var body: some View {
        ListRow(icon: icon, title: title, detail: detail, showChevron: false, action: nil) {
            Toggle(title, isOn: $isOn).labelsHidden().tint(Theme.brand500)
        }
    }
}
