[Setup]
AppName=SuruDron
AppVersion=1.0.0
AppPublisher=Emin Aliyev
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
; 1. Copy everything EXCEPT the extensionless "launcher" file
Source: ".\build\stable-win-x64\SuruDron\*"; DestDir: "{app}"; Excludes: "bin\launcher"; Flags: ignoreversion recursesubdirs

; 2. Grab that specific launcher file, put it back in the bin folder, and rename it to an actual .exe!
Source: ".\build\stable-win-x64\SuruDron\bin\launcher"; DestDir: "{app}\bin"; DestName: "SuruDron.exe"; Flags: ignoreversion

; 3. Copy your custom icon
Source: ".\assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
; 4. Point the shortcuts to our newly renamed SuruDron.exe
Name: "{group}\SuruDron"; Filename: "{app}\bin\SuruDron.exe"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\{cm:UninstallProgram,SuruDron}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\SuruDron"; Filename: "{app}\bin\SuruDron.exe"; IconFilename: "{app}\assets\icon.ico"; Tasks: desktopicon

[Run]
; 5. Launch the renamed application when the wizard finishes
Filename: "{app}\bin\SuruDron.exe"; Description: "{cm:LaunchProgram,SuruDron}"; Flags: nowait postinstall skipifsilent