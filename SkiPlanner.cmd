@echo off
rem Builds SkiPlanner and opens it at http://localhost:4173.
rem It stops by itself 10 minutes after the app is closed; closing this window stops it right away.
title SkiPlanner
cd /d "%~dp0"
call npm run release
if errorlevel 1 pause
