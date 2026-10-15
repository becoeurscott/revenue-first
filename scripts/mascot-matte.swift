// Cut the mascot out of every frame in a folder using the on-device Vision subject lift.
//
// Usage: swiftc -O scripts/mascot-matte.swift -o /tmp/mascot-matte && /tmp/mascot-matte <frames-in> <frames-out>
// Reads every .png in <frames-in>, writes an RGBA .png with the same name to <frames-out>.
// Gaps fully enclosed by the character (the hoodie pocket opening) are kept opaque.
// Used by scripts/mascot-clips.sh; nothing leaves the Mac.

import AppKit
import CoreImage
import ImageIO
import UniformTypeIdentifiers
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: mascot-matte <frames-in> <frames-out>\n".data(using: .utf8)!)
    exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

let frames = try FileManager.default.contentsOfDirectory(at: input, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension == "png" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
let lock = NSLock()
var failed = 0

/// Subject mask (0...1 per pixel, row-major, same size as the image).
func subjectMask(_ image: CGImage) throws -> [Float]? {
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: image)
    try handler.perform([request])
    guard let result = request.results?.first else { return nil }
    let buffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    let w = CVPixelBufferGetWidth(buffer), h = CVPixelBufferGetHeight(buffer)
    let stride = CVPixelBufferGetBytesPerRow(buffer) / MemoryLayout<Float>.size
    let base = CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to: Float.self)
    var mask = [Float](repeating: 0, count: w * h)
    for y in 0..<h { for x in 0..<w { mask[y * w + x] = base[y * stride + x] } }
    return mask
}

/// Marks transparent pixels that cannot reach the frame border through other transparent pixels.
func enclosedHoles(_ mask: [Float], width w: Int, height h: Int) -> [Bool] {
    var outside = [Bool](repeating: false, count: w * h)
    var stack: [Int] = []
    func push(_ i: Int) { if !outside[i] && mask[i] < 0.5 { outside[i] = true; stack.append(i) } }
    for x in 0..<w { push(x); push((h - 1) * w + x) }
    for y in 0..<h { push(y * w); push(y * w + w - 1) }
    while let i = stack.popLast() {
        let x = i % w, y = i / w
        if x > 0 { push(i - 1) }
        if x < w - 1 { push(i + 1) }
        if y > 0 { push(i - w) }
        if y < h - 1 { push(i + w) }
    }
    let holes = (0..<(w * h)).map { mask[$0] < 0.5 && !outside[$0] }
    // Grow the holes by 2px so the soft edge around them is opaque too, not a faint fringe.
    var grown = holes
    for i in 0..<(w * h) where holes[i] {
        let x = i % w, y = i / w
        for dy in -2...2 { for dx in -2...2 {
            let nx = x + dx, ny = y + dy
            if nx >= 0, nx < w, ny >= 0, ny < h { grown[ny * w + nx] = true }
        } }
    }
    return grown
}

func matte(_ url: URL) throws -> Bool {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw CocoaError(.fileReadCorruptFile) }
    let w = image.width, h = image.height
    var pixels = [UInt8](repeating: 0, count: w * h * 4)
    let ctx = CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                        space: srgb, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))

    let mask = try subjectMask(image) ?? [Float](repeating: 0, count: w * h)
    let holes = enclosedHoles(mask, width: w, height: h)
    for i in 0..<(w * h) {
        let a = holes[i] ? 1 : max(0, min(1, mask[i]))
        // The bitmap is premultiplied, so scale colour along with alpha.
        pixels[i * 4] = UInt8(Float(pixels[i * 4]) * a)
        pixels[i * 4 + 1] = UInt8(Float(pixels[i * 4 + 1]) * a)
        pixels[i * 4 + 2] = UInt8(Float(pixels[i * 4 + 2]) * a)
        pixels[i * 4 + 3] = UInt8(255 * a)
    }
    let out = ctx.makeImage()!
    let dest = CGImageDestinationCreateWithURL(output.appendingPathComponent(url.lastPathComponent) as CFURL,
                                               UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, out, nil)
    guard CGImageDestinationFinalize(dest) else { throw CocoaError(.fileWriteUnknown) }
    return mask.contains { $0 > 0.5 }
}

DispatchQueue.concurrentPerform(iterations: frames.count) { i in
    autoreleasepool {
        do {
            if try !matte(frames[i]) { lock.lock(); failed += 1; lock.unlock() }
        } catch {
            lock.lock(); failed += 1; lock.unlock()
            FileHandle.standardError.write("\(frames[i].lastPathComponent): \(error)\n".data(using: .utf8)!)
        }
    }
}
print("matted \(frames.count - failed)/\(frames.count) frames")
