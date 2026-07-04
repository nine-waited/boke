; Block installation on non-x64 Windows (32-bit systems).
!macro NSIS_HOOK_PREINSTALL
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "Chestnut Editor requires 64-bit Windows and cannot be installed on this system." /SD IDOK
    Abort
  ${EndIf}
!macroend
