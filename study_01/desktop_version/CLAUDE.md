# Desktop Version - Handwritten Digit Recognition

Desktop GUI application for handwritten digit recognition using Tkinter.

## Project Overview
A standalone desktop app where users draw digits (0–9) on a black canvas with the mouse. The model predicts the digit and shows confidence.

## Commands
- Run: `python digit_recognition.py`
- Run via double-click: `run_digit_recognition.bat`

## Tech Stack
- Python 3.14
- scikit-learn (SGDClassifier trained on MNIST)
- Tkinter (built-in GUI)
- Pillow (canvas image capture)
- NumPy

## Architecture
- `DigitRecognizer` — loads MNIST, trains SGD model, runs predictions
- `DrawingCanvas` — Tkinter canvas with mouse drawing, exports 28×28 array
- `App` — main window, wires canvas + model together

## Files
- `digit_recognition.py` — main application
- `run_digit_recognition.bat` — Windows double-click launcher

## Code Style
- All code and comments in English
- snake_case for functions and variables
