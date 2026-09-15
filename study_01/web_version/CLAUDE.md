# Web Version - Handwritten Digit Recognition

Browser-based handwritten digit recognition using Flask + TensorFlow.js (or server-side scikit-learn).

## Project Overview
A web app served locally where users draw digits on an HTML canvas, click Predict, and see the result with confidence score — no installation needed beyond Python.

## Commands
- Run server: `python app.py`
- Open browser: `http://localhost:5000`

## Tech Stack
- Python 3.14
- Flask (web server)
- scikit-learn (SGDClassifier trained on MNIST)
- HTML5 Canvas (drawing input)
- JavaScript (fetch API for prediction requests)

## Architecture
- `app.py` — Flask server, loads model, exposes `/predict` POST endpoint
- `templates/index.html` — drawing canvas, Clear/Predict buttons, result display
- Model receives 28×28 pixel array as JSON, returns digit + confidence

## Files (planned)
- `app.py` — Flask application
- `templates/index.html` — frontend UI

## Code Style
- All code and comments in English
- snake_case for Python, camelCase for JavaScript
