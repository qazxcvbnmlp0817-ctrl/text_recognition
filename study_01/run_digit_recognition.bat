@echo off
echo Starting Handwritten Digit Recognition Program...
echo Please wait while the model loads (this may take 1-2 minutes on first run)
cd /d "%~dp0"
python digit_recognition.py
pause
