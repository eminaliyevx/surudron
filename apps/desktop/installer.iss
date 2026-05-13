; apps/desktop/installer.iss

[Setup]
; Application metadata
AppName=SuruDron
AppVersion=1.0.0
AppPublisher=TIAM
DefaultDirName={autopf}\SuruDron
DefaultGroupName=SuruDron
; Output settings
OutputDir=.\Output
OutputBaseFilename=SuruDron-Windows-Setup
SetupIconFile=.\assets\icon.ico
Compression=lzma
SolidCompression=yes
; Require admin rights to install into Program Files
PrivilegesRequired=admin

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy everything from the Electrobun build directory into the installation directory
Source: ".\build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Create shortcuts pointing to your generated executable
; NOTE: Adjust "surudron.exe" if Electrobun names your main executable differently
Name: "{group}\SuruDron"; Filename: "{app}\surudron.exe"
Name: "{group}\{cm:UninstallProgram,SuruDron}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\SuruDron"; Filename: "{app}\surudron.exe"; Tasks: desktopicon

[Run]
; Option to launch the app immediately after the wizard finishes
Filename: "{app}\surudron.exe"; Description: "{cm:LaunchProgram,SuruDron}"; Flags: nowait postinstall skipifsilent