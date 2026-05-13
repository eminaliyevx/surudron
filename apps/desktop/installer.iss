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
; 1. Copy everything exactly as Electrobun built it (NO RENAMING)
Source: ".\build\stable-win-x64\SuruDron\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Copy your custom icon
Source: ".\assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
; 3. Point to launcher.exe, use your icon, AND strictly define the WorkingDir as the root folder
Name: "{group}\SuruDron"; Filename: "{app}\bin\launcher.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\{cm:UninstallProgram,SuruDron}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\SuruDron"; Filename: "{app}\bin\launcher.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"; Tasks: desktopicon

[Run]
; 4. Ensure the post-install launch also uses the correct WorkingDir
Filename: "{app}\bin\launcher.exe"; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,SuruDron}"; Flags: nowait postinstall skipifsilent