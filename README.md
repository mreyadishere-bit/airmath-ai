# AirMath AI — Web Edition v3

AirMath AI turns finger gestures into handwritten maths on a transparent canvas over your **unmodified webcam feed**. Solve simple handwritten arithmetic, or count fingers and compute four arithmetic operations.

**Why a website instead of Python?** No repeated installers or Python dependencies. Open the same URL on Windows, Android, macOS, or another webcam-enabled device. All camera processing happens in your browser. GitHub Actions can deploy each commit automatically to GitHub Pages.

## First-time publishing on GitHub

1. Create a **public** repository named `airmath-ai` on your own account, with **Add a README file** checked (this initializes the `main` branch).
2. Upload all the files from this project (including `.github/workflows/deploy.yml`) to branch `main`, or let ChatGPT upload them through the connected GitHub tool after you create the repository.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. The **Deploy AirMath AI to GitHub Pages** workflow will publish your website. Its URL will be `https://YOUR_GITHUB_USERNAME.github.io/airmath-ai/`.
5. Future pushes to `main` automatically redeploy the website. Refresh the page to use the new build (allow for deployment and CDN cache propagation).

## Usage

- `Enable camera`: allow permission. Your raw camera preview appears before the hand-tracking model downloads.
- **One index finger**: draw. **Index + middle**: pause / move to the next character. **Closed fist held for ~1 second**: solve.
- **Recognize & solve** or `S`: run the basic handwriting recognizer on the drawing, *only when requested*, then evaluate the detected expression.
- `U`: undo a stroke. `C`: clear. Save: exports the ink to PNG.
- You can edit any recognized expression before recalculating. This is important: the lightweight recognizer is **experimental**, and complex or untidy handwriting will often be misread.
- If gesture detection struggles, enable **Always draw with index** (drawing only when the index is raised, without needing to curl other fingers).
- The app supports mouse / touch drawing without camera. Choose “Try drawing with mouse / touch instead” to test it.
- **Finger math** mode detects up to two hands / ten fingers. Capture A and B, then press Calculate to show addition, subtraction, multiplication and division. It can also auto-capture a different stable number; with two closed fists the calculation is triggered.
- Camera selector chooses from available hardware devices. The browser preview does not place filters over the camera. If the picture is brown or blocked when viewed in the native Camera app too, check a physical shutter/obstruction and permissions. Software cannot see through a covered camera.

## Performance

- Camera video is displayed **directly by the browser**, at the device's normal refresh rate; not re-rendered by OpenCV, a Python GUI, or a 3D scene.
- The hand detector works on a **320-pixel copy** of the camera at a separately throttled 12/18/24 FPS target. The UI remains separate from detector workload; results depend on hardware. MediaPipe uses GPU if supported, CPU otherwise.
- The OCR recognizer is a lightweight, local, **approximate** template/stroke recognizer. It does not continuously run. If high accuracy with complex equations is required, a heavier dedicated handwriting model or a server-side OCR endpoint will be necessary.
- First use needs a network connection to load the MediaPipe JavaScript/WASM hand detector and model; later visits may reuse the browser cache, depending on its caching policies.

## Safety and privacy

No video is uploaded by the app, and the site has no analytics, remote database, sign-in or API key. The camera feed is requested after a click. MediaPipe's files download from their external hosting providers; camera pixels stay local to your browser. Pages is a static site and HTTPS supports camera access.

## Local dev / tests

```
python -m http.server 8080
# open http://localhost:8080
node tests/math.test.mjs
```

No npm install is required. ES modules must be served over HTTP(S); opening `index.html` through `file://` is not sufficient.