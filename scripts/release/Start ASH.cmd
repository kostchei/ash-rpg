@echo off
title ASH Table Companion
cd /d "%~dp0"
"%~dp0runtime\node.exe" "%~dp0launch.cjs"
if errorlevel 1 pause
