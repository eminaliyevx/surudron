[Setup]
AppName=SuruDron
AppVersion=1.0.0
AppPublisher=TIAM
DefaultDirName={autopf}\SuruDron
DefaultGroupName=SuruDron
OutputDir=.\Output
OutputBaseFilename=SuruDron-Windows-Setup
SetupIconFile=.\assets\icon.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 1. Copy the core Electrobun application files
Source: ".\build\stable-win-x64\SuruDron\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Copy your icon into the app directory so the shortcuts can use it
Source: ".\assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion createallsubdirs

[Icons]
; 3. Point the shortcuts to bin\launcher.exe, but skin them with the SuruDron icon
Name: "{group}\SuruDron"; Filename: "{app}\bin\launcher.exe"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\{cm:UninstallProgram,SuruDron}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\SuruDron"; Filename: "{app}\bin\launcher.exe"; IconFilename: "{app}\assets\icon.ico"; Tasks: desktopicon

[Run]
; 4. Launch the correct executable when the wizard finishes
Filename: "{app}\bin\launcher.exe"; Description: "{cm:LaunchProgram,SuruDron}"; Flags: nowait postinstall skipifsilent