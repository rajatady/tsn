import AppKit
import Foundation

let fm = FileManager.default
let root = URL(fileURLWithPath: fm.currentDirectoryPath)
  .appendingPathComponent("examples/native-gui/app-store/assets", isDirectory: true)

try fm.createDirectory(at: root, withIntermediateDirectories: true)

struct Palette {
  let a: NSColor
  let b: NSColor
  let c: NSColor
}

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> NSColor {
  NSColor(calibratedRed: r / 255, green: g / 255, blue: b / 255, alpha: a)
}

func save(name: String, width: CGFloat, height: CGFloat, draw: (NSRect) -> Void) throws {
  let size = NSSize(width: width, height: height)
  let image = NSImage(size: size)
  image.lockFocus()
  let rect = NSRect(origin: .zero, size: size)
  draw(rect)
  image.unlockFocus()

  guard let tiff = image.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else {
    fatalError("Failed to encode \(name)")
  }

  try png.write(to: root.appendingPathComponent(name))
}

func rounded(_ rect: NSRect, _ radius: CGFloat) -> NSBezierPath {
  NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

func fillGradient(_ rect: NSRect, _ colors: [NSColor], angle: CGFloat = 0) {
  NSGradient(colors: colors)?.draw(in: rect, angle: angle)
}

func drawGlowText(_ text: String, rect: NSRect, fontSize: CGFloat, weight: NSFont.Weight, color: NSColor, align: NSTextAlignment = .left) {
  let style = NSMutableParagraphStyle()
  style.alignment = align

  let shadow = NSShadow()
  shadow.shadowBlurRadius = fontSize * 0.5
  shadow.shadowColor = color.withAlphaComponent(0.55)
  shadow.shadowOffset = .zero

  let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: fontSize, weight: weight),
    .foregroundColor: color,
    .paragraphStyle: style,
    .shadow: shadow,
  ]

  text.draw(in: rect, withAttributes: attrs)
}

func drawText(_ text: String, rect: NSRect, fontSize: CGFloat, weight: NSFont.Weight, color: NSColor, align: NSTextAlignment = .left) {
  let style = NSMutableParagraphStyle()
  style.alignment = align
  let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: fontSize, weight: weight),
    .foregroundColor: color,
    .paragraphStyle: style,
  ]
  text.draw(in: rect, withAttributes: attrs)
}

func drawDots(in rect: NSRect, colors: [NSColor], count: Int, seed: CGFloat) {
  for idx in 0..<count {
    let t = CGFloat(idx) / CGFloat(max(count, 1))
    let radius = 16 + CGFloat((idx * 7) % 40)
    let x = rect.minX + rect.width * (0.1 + (t * 0.8))
    let y = rect.minY + rect.height * (0.2 + (CGFloat((idx * 29) % 60) / 100))
    let path = NSBezierPath(ovalIn: NSRect(x: x + seed * 3, y: y + seed * 2, width: radius, height: radius))
    colors[idx % colors.count].withAlphaComponent(0.8).setFill()
    path.fill()
  }
}

func drawIcon(name: String, title: String, palette: Palette) throws {
  try save(name: name, width: 120, height: 120) { rect in
    fillGradient(rect, [palette.a, palette.b, palette.c], angle: 45)
    rounded(rect.insetBy(dx: 2, dy: 2), 28).addClip()

    for idx in 0..<5 {
      let inset = CGFloat(idx * 10)
      let blob = NSBezierPath(ovalIn: NSRect(x: rect.minX + inset * 0.9, y: rect.maxY - 56 - inset, width: 50 + inset, height: 32 + inset * 0.8))
      [palette.b, palette.c, palette.a][idx % 3].withAlphaComponent(0.16).setFill()
      blob.fill()
    }

    let inner = rounded(rect.insetBy(dx: 10, dy: 10), 22)
    color(255, 255, 255, 0.12).setFill()
    inner.fill()

    let emblem = title.prefix(1).uppercased()
    drawGlowText(emblem, rect: NSRect(x: rect.minX, y: rect.midY - 24, width: rect.width, height: 56), fontSize: 42, weight: .black, color: color(252, 252, 255), align: .center)
  }
}

func drawHero(name: String) throws {
  try save(name: name, width: 1180, height: 520) { rect in
    fillGradient(rect, [color(56, 20, 99), color(118, 44, 162), color(211, 93, 128)], angle: 8)

    let floor = rounded(NSRect(x: rect.minX, y: rect.minY, width: rect.width, height: rect.height * 0.38), 0)
    color(0, 0, 0, 0.46).setFill()
    floor.fill()

    let halo = NSBezierPath(ovalIn: NSRect(x: rect.midX - 280, y: rect.midY - 170, width: 560, height: 300))
    color(255, 180, 230, 0.18).setFill()
    halo.fill()

    drawGlowText("Arcade", rect: NSRect(x: 120, y: 98, width: rect.width - 200, height: 190), fontSize: 118, weight: .heavy, color: color(240, 248, 255), align: .left)

    let palette = [
      color(255, 110, 124), color(255, 192, 84), color(79, 132, 255),
      color(245, 242, 72), color(255, 146, 231), color(118, 239, 201)
    ]

    for idx in 0..<14 {
      let radius = CGFloat(38 + (idx % 4) * 10)
      let x = CGFloat(140 + idx * 62)
      let y = CGFloat(208 + (idx % 3) * 18)
      let circle = NSBezierPath(ovalIn: NSRect(x: x, y: y, width: radius, height: radius))
      palette[idx % palette.count].setFill()
      circle.fill()
      let eye = NSBezierPath(ovalIn: NSRect(x: x + radius * 0.3, y: y + radius * 0.42, width: radius * 0.12, height: radius * 0.12))
      color(18, 18, 26).setFill()
      eye.fill()
    }
  }
}

func drawPerk(name: String, palette: Palette, title: String) throws {
  try save(name: name, width: 360, height: 200) { rect in
    fillGradient(rect, [palette.a, palette.b, palette.c], angle: 28)
    for idx in 0..<7 {
      let w = CGFloat(80 + idx * 16)
      let h = CGFloat(26 + idx * 5)
      let blob = rounded(NSRect(x: rect.minX - 30 + CGFloat(idx * 48), y: rect.minY + 18 + CGFloat((idx % 3) * 34), width: w, height: h), 20)
      color(255, 255, 255, 0.12).setFill()
      blob.fill()
    }

    let bubble = rounded(NSRect(x: rect.minX + 22, y: rect.minY + 20, width: 120, height: 120), 28)
    color(17, 18, 22, 0.12).setFill()
    bubble.fill()

    drawGlowText(String(title.prefix(1)), rect: NSRect(x: 42, y: 46, width: 80, height: 70), fontSize: 54, weight: .heavy, color: color(255, 255, 255), align: .center)
  }
}

func drawEditorial(name: String, palette: Palette, eyebrow: String, title: String) throws {
  try save(name: name, width: 520, height: 320) { rect in
    fillGradient(rect, [palette.a, palette.b, palette.c], angle: 18)
    drawDots(in: rect, colors: [color(255, 255, 255, 0.22), color(0, 0, 0, 0.16)], count: 18, seed: rect.width / 100)
    color(14, 14, 18, 0.22).setFill()
    rounded(NSRect(x: rect.minX + 26, y: rect.maxY - 132, width: rect.width * 0.46, height: 94), 28).fill()
    drawText(eyebrow, rect: NSRect(x: 44, y: rect.maxY - 82, width: rect.width * 0.38, height: 22), fontSize: 13, weight: .bold, color: color(244, 246, 252))
    drawText(title, rect: NSRect(x: 44, y: rect.maxY - 120, width: rect.width * 0.42, height: 54), fontSize: 26, weight: .heavy, color: color(252, 252, 255))
  }
}

func drawLandscape(name: String, palette: Palette, title: String) throws {
  try save(name: name, width: 760, height: 420) { rect in
    fillGradient(rect, [palette.a, palette.b, palette.c], angle: 90)
    color(255, 239, 173, 0.85).setFill()
    NSBezierPath(ovalIn: NSRect(x: rect.maxX - 140, y: rect.maxY - 128, width: 74, height: 74)).fill()

    color(78, 118, 66).setFill()
    rounded(NSRect(x: rect.minX, y: rect.midY - 20, width: rect.width, height: rect.height * 0.42), 0).fill()
    color(138, 92, 57).setFill()
    rounded(NSRect(x: rect.midX - 36, y: rect.midY + 30, width: 72, height: 120), 12).fill()
    color(214, 95, 44).setFill()
    rounded(NSRect(x: rect.midX - 62, y: rect.midY + 90, width: 124, height: 28), 14).fill()

    for idx in 0..<9 {
      let w = CGFloat(72 + idx * 10)
      let field = rounded(NSRect(x: rect.minX + CGFloat(idx * 74), y: rect.minY + CGFloat((idx % 3) * 28), width: w, height: 56), 16)
      [color(110, 164, 66), color(146, 190, 82), color(214, 176, 73)][idx % 3].setFill()
      field.fill()
    }

    let titleRect = rounded(NSRect(x: rect.minX + 24, y: rect.maxY - 108, width: 320, height: 76), 24)
    color(18, 18, 21, 0.24).setFill()
    titleRect.fill()
    drawText(title, rect: NSRect(x: 42, y: rect.maxY - 92, width: 270, height: 50), fontSize: 24, weight: .heavy, color: color(250, 250, 252))
  }
}

func drawMetricsCard(name: String, palette: Palette, label: String) throws {
  try save(name: name, width: 260, height: 180) { rect in
    fillGradient(rect, [palette.a, palette.b, palette.c], angle: 35)
    color(255, 255, 255, 0.16).setFill()
    rounded(NSRect(x: 18, y: 18, width: rect.width - 36, height: rect.height - 36), 24).fill()
    drawText(label, rect: NSRect(x: 28, y: rect.maxY - 74, width: rect.width - 56, height: 46), fontSize: 24, weight: .heavy, color: color(252, 252, 255))
  }
}

let palettes: [String: Palette] = [
  "blue": Palette(a: color(33, 76, 198), b: color(85, 141, 255), c: color(184, 214, 255)),
  "orange": Palette(a: color(211, 78, 46), b: color(251, 164, 77), c: color(255, 220, 151)),
  "pink": Palette(a: color(196, 63, 133), b: color(255, 156, 206), c: color(255, 216, 238)),
  "green": Palette(a: color(47, 122, 79), b: color(120, 204, 138), c: color(210, 245, 191)),
  "purple": Palette(a: color(81, 40, 130), b: color(150, 86, 214), c: color(223, 197, 255)),
  "teal": Palette(a: color(23, 118, 132), b: color(76, 198, 220), c: color(197, 244, 248)),
  "brown": Palette(a: color(114, 69, 39), b: color(178, 121, 60), c: color(243, 203, 148)),
  "slate": Palette(a: color(46, 56, 84), b: color(88, 120, 178), c: color(196, 215, 247)),
]

try drawHero(name: "hero-arcade.png")

try drawIcon(name: "icon-dredge.png", title: "D", palette: palettes["slate"]!)
try drawIcon(name: "icon-felicity.png", title: "F", palette: palettes["pink"]!)
try drawIcon(name: "icon-cult.png", title: "C", palette: palettes["orange"]!)
try drawIcon(name: "icon-oceanhorn.png", title: "O", palette: palettes["teal"]!)
try drawIcon(name: "icon-cozy.png", title: "C", palette: palettes["green"]!)
try drawIcon(name: "icon-spongebob.png", title: "S", palette: palettes["yellow"] ?? palettes["orange"]!)
try drawIcon(name: "icon-lego.png", title: "L", palette: palettes["red"] ?? palettes["orange"]!)
try drawIcon(name: "icon-bloons.png", title: "B", palette: palettes["blue"]!)
try drawIcon(name: "icon-pacman.png", title: "P", palette: palettes["orange"]!)
try drawIcon(name: "icon-naruto.png", title: "N", palette: palettes["orange"]!)
try drawIcon(name: "icon-tmnt.png", title: "T", palette: palettes["green"]!)
try drawIcon(name: "icon-dreamlight.png", title: "D", palette: palettes["purple"]!)
try drawIcon(name: "icon-hello-kitty.png", title: "H", palette: palettes["pink"]!)
try drawIcon(name: "icon-angry-birds.png", title: "A", palette: palettes["red"] ?? palettes["orange"]!)
try drawIcon(name: "icon-cooking.png", title: "C", palette: palettes["brown"]!)
try drawIcon(name: "icon-rural-life.png", title: "J", palette: palettes["brown"]!)
try drawIcon(name: "icon-sneaky.png", title: "S", palette: palettes["green"]!)

try drawPerk(name: "perk-overview.png", palette: palettes["orange"]!, title: "Overview")
try drawPerk(name: "perk-family.png", palette: palettes["yellow"] ?? palettes["orange"]!, title: "Family")
try drawPerk(name: "perk-no-ads.png", palette: palettes["pink"]!, title: "No Ads")
try drawPerk(name: "perk-new-games.png", palette: palettes["teal"]!, title: "New Games")

try drawEditorial(name: "develop-hero.png", palette: palettes["purple"]!, eyebrow: "DEVELOPER SPOTLIGHT", title: "Code faster with Xcode extensions")
try drawEditorial(name: "develop-spotlight.png", palette: palettes["blue"]!, eyebrow: "EDITORIAL", title: "Meet the team behind Mercury Weather")
try drawEditorial(name: "play-hero.png", palette: palettes["slate"]!, eyebrow: "APPLE ARCADE", title: "Can you build a lasting empire?")
try drawEditorial(name: "play-card-1.png", palette: palettes["orange"]!, eyebrow: "GAMES WE LOVE", title: "Warp reality in Control")
try drawEditorial(name: "play-card-2.png", palette: palettes["pink"]!, eyebrow: "LET'S PLAY", title: "Don't miss these amazing games")
try drawEditorial(name: "play-card-3.png", palette: palettes["teal"]!, eyebrow: "BEST NEW GAMES", title: "Draft your destiny in Blue Prince")

try drawLandscape(name: "rural-hero.png", palette: palettes["brown"]!, title: "Japanese Rural Life Adventure")
try drawLandscape(name: "rural-screen-1.png", palette: palettes["brown"]!, title: "Explore shrines")
try drawLandscape(name: "rural-screen-2.png", palette: palettes["green"]!, title: "Tend your garden")
try drawMetricsCard(name: "category-strategy.png", palette: palettes["slate"]!, label: "Strategy")
try drawMetricsCard(name: "category-family.png", palette: palettes["green"]!, label: "Family")
try drawMetricsCard(name: "category-puzzle.png", palette: palettes["teal"]!, label: "Puzzle")
try drawMetricsCard(name: "category-sim.png", palette: palettes["orange"]!, label: "Simulation")

print("Generated App Store assets in \(root.path)")
