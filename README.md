# AirMath AI — Web Edition v4.1

AirMath AI turns finger gestures into handwritten maths on a transparent canvas over your **unmodified webcam feed**. Solve simple handwritten arithmetic, or count fingers and compute four arithmetic operations.

**Why a website instead of Python?** No repeated installers or Python dependencies. Open the same URL on Windows, Android, macOS, or another webcam-enabled device. All camera processing happens in your browser. GitHub Actions can deploy each commit automatically to GitHub Pages.

## GitHub Pages deployment

Repository: https://github.com/mreyadishere-bit/airmath-ai

1. Open **Settings → Pages** in this repository.
2. Choose **GitHub Actions** under **Build and deployment → Source**.
3. Open **Actions → Deploy AirMath AI to GitHub Pages** to check the latest run. Use **Run workflow** if needed.
4. When deployment succeeds, use **https://mreyadishere-bit.github.io/airmath-ai/** in your browser.
5. Every new commit to `main` triggers deployment. Refresh the website after the workflow completes.


## Finger Math v4.1 — positional digit entry

Switch to **Finger math**, enable your webcam, and raise both hands. MediaPipe supplies **21 anatomical landmarks per hand**, which AirMath draws on the live feed as a skeleton. Each digit is labeled **UP** or **DOWN**, along with the detected finger count.

The camera itself shows operand A, operand B, the current count, a gesture-hold progress bar, and the full arithmetic result. The drawing calculator remains in the separate **Air draw** mode.

**Gesture language — decimal place-value entry (not addition):**

1. **One digit from 0 to 9:** show the finger count and hold for **0.8 seconds**. The digit appears on the RIGHT of the current number. Example: **5 → 3 → 5 forms 535**, not 13.
2. **Next digit:** change the finger count and hold the next pose. To enter the **same digit again**, briefly remove both hands from view before repeating.
3. **Ten raised fingers:** a special two-character token `10`; ten then three forms `103`. Or enter ten as 1 followed by 0.
4. **Zero:** one closed fist held steady. Two closed fists are reserved for Equals.
5. **Two thumbs up 👍👍:** hold about a second to finish A and begin B.
6. **Two closed fists ✊✊:** hold about 1.2 seconds to display the four arithmetic results directly on the video.

Example: enter A as 5, 3, 5 → **535**, use 👍👍, enter B as 2, 4 → **24**, then ✊✊ to calculate.

Numbers are constructed as decimal strings and computed using **BigInt** for precise whole-number arithmetic (up to 100 digits per operand). Division is shown with up to 10 decimal places.

The fallback buttons **Add digit**, **Next**, **Calculate**, **Undo**, and **Reset** work even if you prefer not to use a command pose. Stable-pose detection helps prevent transient numbers from being accepted. Results are calculated locally without transmitting the camera feed. This is heuristic landmark-based finger counting, not a trained sign-language interpreter; actual accuracy depends on lighting, visibility of both hands, pose, and CPU/GPU speed.

## Camera troubleshooting (v3.1)

- **Enable camera** first requests permission and shows the raw video immediately, without waiting for the AI hand-tracking model.
- If access fails, the explanation and **Retry camera** appear inside the camera panel (not just in a box below the fold).
- **Permission denied:** click the camera/padlock icon next to the site's URL, allow camera access, and retry. Windows camera privacy settings may also need permission.
- **Camera in use:** close video calls and Windows Camera, then restart.
- **No matching camera:** try **Default camera** or the device selector under Camera & performance.
- **Camera visible but hand tracking unavailable:** the page remains usable with mouse/touch; press **Retry tracking** to reload MediaPipe.
- If the picture is physically obscured in your operating system's camera preview as well, remove the physical camera cover or check the selected webcam. Software cannot see through an obstructed lens.

## Usage

- `Enable camera`: allow permission. Your raw camera preview appears before the hand-tracking model downloads.
- **One index finger**: draw. **Index + middle**: pause / move to the next character. **Closed fist held for ~1 second**: solve.
- **Recognize & solve** or `S`: run the basic handwriting recognizer on the drawing, *only when requested*, then evaluate the detected expression.
- `U`: undo a stroke. `C`: clear. Save: exports the ink to PNG.
- You can edit any recognized expression before recalculating. This is important: the lightweight recognizer is **experimental**, and complex or untidy handwriting will often be misread.
- If gesture detection struggles, enable **Always draw with index** (drawing only when the index is raised, without needing to curl other fingers).
- The app supports mouse / touch drawing without camera. Choose “Try drawing with mouse / touch instead” to test it.
- **Finger math** appends each stable digit to the RIGHT (or a two-character token for 10), two-thumbs-up to separate A/B, and two-fists to calculate. All results and hand landmarks are overlaid on the original video.
- Camera selector chooses from available hardware devices. The browser preview does not place filters over the camera. If the picture is brown or blocked when viewed in the native Camera app too, check a physical shutter/obstruction and permissions. Software cannot see through a covered camera.

## Performance

- Camera video is displayed **directly by the browser**, at the device's normal refresh rate; not re-rendered by OpenCV, a Python GUI, or a 3D scene.
- The hand detector works on a **224-pixel copy** of the camera at a separately throttled 10/16/23 FPS target. The UI remains separate from detector workload; results depend on hardware. MediaPipe uses GPU if supported, CPU otherwise.
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