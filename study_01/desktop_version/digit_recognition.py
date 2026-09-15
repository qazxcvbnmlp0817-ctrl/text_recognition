# Handwritten Digit Recognition Program
# Uses MNIST dataset with scikit-learn (SGD Classifier)
# GUI: Tkinter canvas for drawing, shows prediction and confidence

import tkinter as tk
from tkinter import ttk
import numpy as np
from PIL import Image, ImageDraw
from sklearn.linear_model import SGDClassifier
from sklearn.datasets import fetch_openml
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import threading
import warnings
warnings.filterwarnings('ignore')


class DigitRecognizer:
    """Trains and runs the MNIST digit recognition model."""

    def __init__(self):
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('clf', SGDClassifier(loss='modified_huber', max_iter=20,
                                  random_state=42, n_jobs=-1))
        ])
        self.trained = False

    def train(self, progress_callback=None):
        """Download MNIST data and train the model."""
        if progress_callback:
            progress_callback("Downloading MNIST dataset...")

        mnist = fetch_openml('mnist_784', version=1, as_frame=False,
                             parser='liac-arff')
        X, y = mnist.data, mnist.target.astype(int)

        # Use 60,000 training samples
        X_train, y_train = X[:60000], y[:60000]

        if progress_callback:
            progress_callback("Training model... (this takes ~30 seconds)")

        self.model.fit(X_train, y_train)
        self.trained = True

        if progress_callback:
            progress_callback("Ready!")

    def predict(self, image_array):
        """Return (predicted_digit, confidence_percent) for a 28x28 array."""
        flat = image_array.flatten().reshape(1, -1)
        proba = self.model.predict_proba(flat)[0]
        digit = int(np.argmax(proba))
        confidence = float(proba[digit]) * 100
        return digit, confidence


class DrawingCanvas:
    """Black canvas where the user draws with the mouse."""

    CANVAS_SIZE = 280   # pixels shown to user
    MODEL_SIZE = 28     # pixels fed to model

    def __init__(self, parent):
        self.canvas = tk.Canvas(parent, width=self.CANVAS_SIZE,
                                height=self.CANVAS_SIZE,
                                bg='black', cursor='crosshair')
        self.canvas.pack()

        # Off-screen PIL image for pixel-accurate capture
        self.image = Image.new('L', (self.CANVAS_SIZE, self.CANVAS_SIZE),
                               color=0)
        self.draw = ImageDraw.Draw(self.image)

        self._last_x = None
        self._last_y = None
        self.canvas.bind('<B1-Motion>', self._on_drag)
        self.canvas.bind('<ButtonRelease-1>', self._on_release)

    def _on_drag(self, event):
        brush = 14  # brush radius in pixels
        x, y = event.x, event.y
        self.canvas.create_oval(x - brush, y - brush,
                                x + brush, y + brush,
                                fill='white', outline='white')
        self.draw.ellipse([x - brush, y - brush,
                           x + brush, y + brush], fill=255)
        self._last_x, self._last_y = x, y

    def _on_release(self, event):
        self._last_x = None
        self._last_y = None

    def clear(self):
        """Erase everything on the canvas."""
        self.canvas.delete('all')
        self.draw.rectangle([0, 0, self.CANVAS_SIZE, self.CANVAS_SIZE],
                            fill=0)

    def get_array(self):
        """Return a 28x28 numpy array (0-255) of the current drawing."""
        small = self.image.resize((self.MODEL_SIZE, self.MODEL_SIZE),
                                  Image.LANCZOS)
        return np.array(small)


class App:
    """Main application window."""

    def __init__(self, root):
        self.root = root
        self.root.title("Handwritten Digit Recognition")
        self.root.resizable(False, False)

        self.recognizer = DigitRecognizer()
        self._build_ui()
        self._start_training()

    def _build_ui(self):
        """Create all widgets."""
        # Title
        tk.Label(self.root, text="Handwritten Digit Recognition",
                 font=('Arial', 14, 'bold')).pack(pady=(12, 4))
        tk.Label(self.root,
                 text="Draw a digit (0-9) in the box below",
                 font=('Arial', 10)).pack()

        # Drawing area
        frame = tk.Frame(self.root, bd=2, relief='sunken')
        frame.pack(padx=16, pady=8)
        self.canvas = DrawingCanvas(frame)

        # Buttons
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=4)
        tk.Button(btn_frame, text="Clear", width=10,
                  command=self._clear).pack(side='left', padx=6)
        self.recognize_btn = tk.Button(btn_frame, text="Recognize",
                                       width=10, state='disabled',
                                       command=self._recognize)
        self.recognize_btn.pack(side='left', padx=6)

        # Status / result label
        self.status_var = tk.StringVar(value="Loading model...")
        self.status_label = tk.Label(self.root, textvariable=self.status_var,
                                     font=('Arial', 11))
        self.status_label.pack(pady=4)

        # Prediction display
        self.prediction_var = tk.StringVar(value="")
        tk.Label(self.root, textvariable=self.prediction_var,
                 font=('Arial', 26, 'bold'), fg='#1a73e8').pack()

        self.confidence_var = tk.StringVar(value="")
        tk.Label(self.root, textvariable=self.confidence_var,
                 font=('Arial', 12), fg='#555').pack(pady=(0, 16))

    def _start_training(self):
        """Train the model in a background thread so the UI stays responsive."""
        def train():
            self.recognizer.train(progress_callback=self._set_status)
            self.root.after(0, self._on_ready)

        thread = threading.Thread(target=train, daemon=True)
        thread.start()

    def _on_ready(self):
        self.status_var.set("Draw a digit and click 'Recognize'")
        self.recognize_btn.config(state='normal')

    def _set_status(self, msg):
        self.root.after(0, lambda: self.status_var.set(msg))

    def _clear(self):
        self.canvas.clear()
        self.prediction_var.set("")
        self.confidence_var.set("")
        if self.recognizer.trained:
            self.status_var.set("Draw a digit and click 'Recognize'")

    def _recognize(self):
        """Run prediction on the current drawing."""
        arr = self.canvas.get_array()
        if arr.max() == 0:
            self.status_var.set("Please draw a digit first.")
            return

        digit, confidence = self.recognizer.predict(arr)
        self.prediction_var.set(f"Predicted Digit: {digit}")
        self.confidence_var.set(f"Confidence: {confidence:.2f}%")
        self.status_var.set("Recognized!")


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == '__main__':
    main()
