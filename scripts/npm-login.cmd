@echo off
rem Opens a NEW terminal window running npm login — the agent never types
rem credentials; the user completes login in this window, then closes it.
start "npm login - open-web" cmd /k "npm login && echo. && echo Login done - you can close this window && npm whoami"
