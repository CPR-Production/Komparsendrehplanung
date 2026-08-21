; Inno-Setup-Skript für den Windows-Installer.
; Aufruf: iscc /DAppVersion=1.2.3 infra\installer\windows\komparsen.iss
;
; Bewusst eine Installation ins Benutzerprofil (PrivilegesRequired=lowest):
; die App braucht keine Systemrechte, und das spätere Selbst-Update muss ohne
; UAC-Nachfrage in dasselbe Verzeichnis schreiben können.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{8F3B21C4-7A62-4D19-9E4A-6C1D0B5E2A77}
AppName=Komparsendrehplanung
AppVersion={#AppVersion}
AppPublisher=CPR Production
DefaultDirName={autopf}\Komparsendrehplanung
DefaultGroupName=Komparsendrehplanung
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\..\build\release\dist
OutputBaseFilename=Komparsendrehplanung-{#AppVersion}-windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Komparsendrehplanung {#AppVersion}
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\komparsen.ico

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Files]
; Die ganze Nutzlast flach ins Programmverzeichnis — die App findet ihre
; Dateien über den Programmpfad (siehe apps/server/src/paths.ts).
Source: "..\..\..\build\release\payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Die Verknüpfungen holen ihr Icon aus dieser Datei, nicht aus der Binary: in
; der komparsen.exe steckt das SEA-Bündel als PE-Ressource, und ein Werkzeug
; wie rcedit, das nachträglich ein Icon einträgt, schreibt genau dort hinein.
; Ein separates .ico kostet 120 KB und lässt die Binary in Ruhe.
Source: "..\assets\icon.ico"; DestDir: "{app}"; DestName: "komparsen.ico"; Flags: ignoreversion

[Icons]
Name: "{group}\Komparsendrehplanung"; Filename: "{app}\komparsen.exe"; IconFilename: "{app}\komparsen.ico"
Name: "{autodesktop}\Komparsendrehplanung"; Filename: "{app}\komparsen.exe"; IconFilename: "{app}\komparsen.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Verknüpfung auf dem Desktop anlegen"; GroupDescription: "Zusätzliche Verknüpfungen:"

[Run]
Filename: "{app}\komparsen.exe"; Description: "Komparsendrehplanung jetzt starten"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Die Datenbank liegt unter %LOCALAPPDATA%\Komparsendrehplanung und wird
; absichtlich nicht mitgelöscht — sie ist die Arbeit des Nutzers.
Type: filesandordirs; Name: "{app}\web"
Type: filesandordirs; Name: "{app}\migrations"
