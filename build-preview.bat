@echo off
REM ============================================================
REM  EAS preview build  -  Android APK (internal distribution)
REM  Uses the "preview" profile from eas.json
REM  (bakes in EXPO_PUBLIC_API_BASE for the server).
REM ============================================================
setlocal
cd /d "%~dp0"

REM Prefer a globally-installed eas-cli; otherwise fall back to npx.
where eas >nul 2>nul
if %errorlevel%==0 (
  set "EAS_CMD=eas"
) else (
  set "EAS_CMD=npx --yes eas-cli"
)

echo ============================================
echo  EAS Build - profile: preview (Android APK)
echo ============================================
echo Using command: %EAS_CMD%
echo.

call %EAS_CMD% build --platform android --profile preview %*
set "EXITCODE=%errorlevel%"

echo.
echo --------------------------------------------
echo  Build command exited with code %EXITCODE%
echo --------------------------------------------
pause
exit /b %EXITCODE%
