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
; 1. Copy the folder structure, but EXCLUDE the extensionless launcher so we don't copy it twice
Source: ".\build\stable-win-x64\SuruDron\*"; DestDir: "{app}"; Excludes: "bin\launcher"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Grab the extensionless launcher, put it in the bin folder, and explicitly add the .exe extension
Source: ".\build\stable-win-x64\SuruDron\bin\launcher"; DestDir: "{app}\bin"; DestName: "launcher.exe"; Flags: ignoreversion

; 3. Copy your custom icon
Source: ".\assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
; 4. Point to the newly renamed launcher.exe, use your icon, and define the WorkingDir
Name: "{group}\SuruDron"; Filename: "{app}\bin\launcher.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\{cm:UninstallProgram,SuruDron}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\SuruDron"; Filename: "{app}\bin\launcher.exe"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"; Tasks: desktopicon

[Run]
; 5. Ensure the post-install launch points to launcher.exe with the correct WorkingDir
Filename: "{app}\bin\launcher.exe"; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,SuruDron}"; Flags: nowait postinstall skipifsilent