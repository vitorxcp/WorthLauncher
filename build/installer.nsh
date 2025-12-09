!macro customInstall
  CreateDirectory "$APPDATA\.worthlauncher"
  
  FileOpen $0 "$APPDATA\.worthlauncher\.first_run" w
  FileWrite $0 "1"
  FileClose $0
!macroend