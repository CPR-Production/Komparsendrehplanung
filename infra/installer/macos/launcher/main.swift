// Fenster für die macOS-App.
//
// Ohne das hier ist die Anwendung ein reiner Node-Prozess: er zeichnet kein
// Fenster, meldet sich also nie beim WindowServer, und damit zeigt das Dock
// keinen Laufindikator und der Programmwechsler die App gar nicht. Wer sie
// loswerden wollte, musste in die Aktivitätsanzeige — für Laien eine Sackgasse.
//
// Dieses Programm ist deshalb das, was macOS startet. Es führt den Server als
// Kindprozess und nimmt ihn beim Beenden mit. Solange das Fenster offen ist,
// läuft die Anwendung; schließt man es, ist sie weg.
//
// Übersetzt wird es von infra/installer/macos/package.sh. Es liegt bewusst
// nicht in der Nutzlast: das Selbst-Update tauscht nur die aus, und die
// Signatur des Bundles hängt am Hauptprogramm. Bleibt es unangetastet, bleibt
// sie nach einem Update gültig. Eine Änderung hier erreicht Nutzer dafür erst
// mit einer Neuinstallation.
import AppKit

// Beendet sich der Server mit diesem Code, hat er gerade ein Update eingespielt
// und will neu gestartet werden — siehe restart() in
// apps/server/src/services/updater.ts. Unter dem Fenster startet er sich nicht
// selbst neu, sondern wir starten ihn: ein selbst gestarteter Nachfolger hinge
// nicht mehr am Fenster und liefe nach dem Schließen weiter.
let restartExitCode: Int32 = 75

func label(_ text: String, size: CGFloat, bold: Bool = false, gray: Bool = false) -> NSTextField {
    let field = NSTextField(labelWithString: text)
    field.font = bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
    if gray { field.textColor = .secondaryLabelColor }
    // Umbrechen statt abschneiden: In die Statuszeile kann eine Fehlermeldung
    // beliebiger Länge geraten, und abgeschnitten nützt die niemandem.
    field.lineBreakMode = .byWordWrapping
    field.maximumNumberOfLines = 0
    field.translatesAutoresizingMaskIntoConstraints = false
    return field
}

final class Launcher: NSObject, NSApplicationDelegate {
    private let port = ProcessInfo.processInfo.environment["PORT"] ?? "3001"
    private var address: String { "http://localhost:\(port)" }

    private var server: Process?
    // Ohne das hielte der Endehandler das planmäßige Beenden für einen Absturz.
    private var stopping = false
    private var lastMessage = ""
    private var readyTimer: Timer?

    private let window = NSWindow(
        contentRect: NSRect(x: 0, y: 0, width: 440, height: 208),
        styleMask: [.titled, .closable, .miniaturizable],
        backing: .buffered,
        defer: false)
    private let statusLabel = label("Startet …", size: 14, bold: true)
    private let addressLabel = label("", size: 12, gray: true)
    private let hintLabel = label(
        "Solange dieses Fenster offen ist, ist die Anwendung erreichbar. "
            + "Schließen beendet sie.",
        size: 11,
        gray: true)
    private let openButton = NSButton(title: "Im Browser öffnen", target: nil, action: nil)
    private let quitButton = NSButton(title: "Beenden", target: nil, action: nil)

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        buildWindow()
        startServer()
    }

    // Ohne eigenes Menü gäbe es kein ⌘Q — AppKit legt für ein Programm ohne
    // Nib keines an.
    private func buildMenu() {
        let appMenu = NSMenu()
        appMenu.addItem(
            withTitle: "Über Komparsendrehplanung",
            action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
            keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(
            withTitle: "Komparsendrehplanung beenden",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q")
        let appItem = NSMenuItem()
        appItem.submenu = appMenu
        let mainMenu = NSMenu()
        mainMenu.addItem(appItem)
        NSApp.mainMenu = mainMenu
    }

    private func buildWindow() {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        window.title = version.map { "Komparsendrehplanung \($0)" } ?? "Komparsendrehplanung"
        window.isReleasedWhenClosed = false
        window.center()

        addressLabel.stringValue = address
        openButton.target = self
        openButton.action = #selector(openInBrowser)
        openButton.bezelStyle = .rounded
        openButton.keyEquivalent = "\r"
        quitButton.target = self
        quitButton.action = #selector(quit)
        quitButton.bezelStyle = .rounded

        // Gestellt statt ausgemessen: Die Systemschrift ist einstellbar, und
        // feste Koordinaten würden bei einer größeren Einstellung Text
        // abschneiden. Die Höhe des Fensters ergibt sich hinterher aus dem,
        // was tatsächlich hineinpasst.
        let content = window.contentView!
        quitButton.translatesAutoresizingMaskIntoConstraints = false
        openButton.translatesAutoresizingMaskIntoConstraints = false
        for view in [statusLabel, addressLabel, hintLabel, quitButton, openButton] as [NSView] {
            content.addSubview(view)
        }
        NSLayoutConstraint.activate([
            statusLabel.topAnchor.constraint(equalTo: content.topAnchor, constant: 22),
            statusLabel.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 24),
            statusLabel.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -24),

            addressLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 6),
            addressLabel.leadingAnchor.constraint(equalTo: statusLabel.leadingAnchor),
            addressLabel.trailingAnchor.constraint(equalTo: statusLabel.trailingAnchor),

            hintLabel.topAnchor.constraint(equalTo: addressLabel.bottomAnchor, constant: 18),
            hintLabel.leadingAnchor.constraint(equalTo: statusLabel.leadingAnchor),
            hintLabel.trailingAnchor.constraint(equalTo: statusLabel.trailingAnchor),

            quitButton.topAnchor.constraint(equalTo: hintLabel.bottomAnchor, constant: 20),
            quitButton.leadingAnchor.constraint(equalTo: statusLabel.leadingAnchor),
            quitButton.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -20),

            openButton.trailingAnchor.constraint(equalTo: statusLabel.trailingAnchor),
            openButton.firstBaselineAnchor.constraint(equalTo: quitButton.firstBaselineAnchor),
            openButton.leadingAnchor.constraint(
                greaterThanOrEqualTo: quitButton.trailingAnchor, constant: 16),
        ])
        fitWindowToContent()

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // --- Server -------------------------------------------------------------

    private func startServer() {
        let executable = Bundle.main.executableURL!
            .deletingLastPathComponent()
            .appendingPathComponent("komparsen")
        guard FileManager.default.isExecutableFile(atPath: executable.path) else {
            statusLabel.stringValue = "Der Programmteil komparsen fehlt"
            addressLabel.stringValue = executable.path
            fitWindowToContent()
            return
        }

        let process = Process()
        process.executableURL = executable
        process.currentDirectoryURL = executable.deletingLastPathComponent()
        var environment = ProcessInfo.processInfo.environment
        environment["PORT"] = port
        // Sagt dem Updater, dass hier jemand den Neustart übernimmt.
        environment["KOMPARSEN_SUPERVISED"] = "1"
        process.environment = environment

        // Ausgabe wird mitgelesen, damit ein Fehlstart im Fenster steht statt
        // in einem Log, das niemand findet.
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let text = String(decoding: handle.availableData, as: UTF8.self)
            let lines = text.split(whereSeparator: \.isNewline)
            guard let last = lines.last else { return }
            DispatchQueue.main.async { self?.lastMessage = String(last) }
        }

        process.terminationHandler = { [weak self] finished in
            DispatchQueue.main.async { self?.serverEnded(status: finished.terminationStatus) }
        }

        do {
            try process.run()
        } catch {
            statusLabel.stringValue = "Start fehlgeschlagen"
            addressLabel.stringValue = error.localizedDescription
            fitWindowToContent()
            return
        }
        server = process
        waitForReady()
    }

    // Gefragt wird der Server selbst, nicht seine Ausgabe: an einem Logtext zu
    // hängen hieße, ihn nicht mehr ändern zu dürfen.
    private func waitForReady() {
        statusLabel.stringValue = "Startet …"
        readyTimer?.invalidate()
        readyTimer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] timer in
            guard let self else { return timer.invalidate() }
            var request = URLRequest(url: URL(string: "\(self.address)/api/health")!)
            request.timeoutInterval = 2
            URLSession.shared.dataTask(with: request) { _, response, _ in
                guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
                DispatchQueue.main.async {
                    timer.invalidate()
                    self.statusLabel.stringValue = "Die Anwendung läuft"
                    self.fitWindowToContent()
                }
            }.resume()
        }
    }

    private func serverEnded(status: Int32) {
        readyTimer?.invalidate()
        if stopping { return }
        if status == restartExitCode {
            statusLabel.stringValue = "Update wird abgeschlossen …"
            startServer()
            return
        }
        server = nil
        statusLabel.stringValue = "Die Anwendung wurde beendet"
        addressLabel.stringValue = lastMessage.isEmpty ? "Beendet mit Code \(status)" : lastMessage
        openButton.isEnabled = false
        fitWindowToContent()
    }

    private func stopServer() {
        guard let server, server.isRunning else { return }
        stopping = true
        server.terminate()
        // Erst höflich fragen, dann darauf bestehen: ein hängender Server darf
        // das Beenden nicht blockieren, aber er soll seine Datenbank noch
        // ordentlich zumachen dürfen.
        let deadline = Date().addingTimeInterval(3)
        while server.isRunning && Date() < deadline { usleep(50_000) }
        if server.isRunning { kill(server.processIdentifier, SIGKILL) }
    }

    // Die Breite steht fest, die Höhe folgt dem Inhalt. Wird nach jeder
    // Textänderung gerufen, weil aus einer Zeile Status zwei werden können.
    private func fitWindowToContent() {
        let content = window.contentView!
        // Ohne feste Umbruchbreite rechnet AppKit die Höhe eines umbrechenden
        // Labels für eine einzige lange Zeile aus — das Fenster bliebe zu flach.
        let textWidth = content.frame.width - 48
        for field in [statusLabel, addressLabel, hintLabel] {
            field.preferredMaxLayoutWidth = textWidth
        }
        content.layoutSubtreeIfNeeded()

        let top = window.frame.maxY
        window.setContentSize(NSSize(width: content.frame.width, height: content.fittingSize.height))
        // AppKit misst von unten: Ohne das rutschte die Titelleiste nach oben,
        // sobald das Fenster wächst.
        window.setFrameTopLeftPoint(NSPoint(x: window.frame.minX, y: top))
    }

    // --- Bedienung ----------------------------------------------------------

    @objc private func openInBrowser() {
        NSWorkspace.shared.open(URL(string: address)!)
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        stopServer()
    }
}

let application = NSApplication.shared
let launcher = Launcher()
application.delegate = launcher
application.setActivationPolicy(.regular)
application.run()
