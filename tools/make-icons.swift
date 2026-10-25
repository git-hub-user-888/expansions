// Draws the app icons: a yellow square with "x²" in dark rounded type.
// Run from the project root: swift tools/make-icons.swift
import AppKit

func render(size: Int, scale: CGFloat, to path: String) {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let s = CGFloat(size)
  NSColor(srgbRed: 1, green: 0.816, blue: 0, alpha: 1).setFill()
  NSRect(x: 0, y: 0, width: s, height: s).fill()

  func font(_ points: CGFloat) -> NSFont {
    let base = NSFont.systemFont(ofSize: points, weight: .heavy)
    let rounded = base.fontDescriptor.withDesign(.rounded) ?? base.fontDescriptor
    return NSFont(descriptor: rounded, size: points) ?? base
  }
  let ink = NSColor(srgbRed: 0.09, green: 0.09, blue: 0.06, alpha: 1)
  let text = NSMutableAttributedString(string: "x", attributes: [.font: font(s * 0.56 * scale), .foregroundColor: ink])
  text.append(NSAttributedString(string: "2", attributes: [
    .font: font(s * 0.3 * scale), .foregroundColor: ink, .baselineOffset: s * 0.2 * scale,
  ]))
  let bounds = text.boundingRect(with: NSSize(width: s, height: s), options: [.usesLineFragmentOrigin, .usesDeviceMetrics])
  text.draw(at: NSPoint(x: (s - bounds.width) / 2 - bounds.minX, y: (s - bounds.height) / 2 - bounds.minY))
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

render(size: 180, scale: 1, to: "icons/apple-touch-icon.png")
render(size: 192, scale: 1, to: "icons/icon-192.png")
render(size: 512, scale: 1, to: "icons/icon-512.png")
render(size: 512, scale: 0.78, to: "icons/icon-maskable-512.png")
