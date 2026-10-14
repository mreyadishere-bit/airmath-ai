# AirMath AI — Camera Edition v5

A minimal, browser-based finger-gesture calculator with a live, unfiltered webcam.

**Live app:** https://mreyadishere-bit.github.io/airmath-ai/

## Experience

- **Camera first:** no sidebar, oversized status cards, or instructions obscuring the camera. The video uses its native aspect ratio.
- **Discreet tracking:** MediaPipe detects 21 landmarks per hand; thin connecting lines and small fingertip markers may be toggled off in Settings. No floating finger labels.
- **Positional digits:** hold five fingers, then three, then five; the input becomes **535**, not 13. Hold each pose for about 0.8 seconds. To repeat the same digit, move hands out of view briefly first.
- **One fist = 0.** Ten fingers together append the two-character token 10.
- **Two thumbs up = Next:** hold for about one second to switch from operand A to B.
- **Two fists = Equals:** hold for about 1.2 seconds to calculate.
- **Results stay OUTSIDE the camera:** a restrained result dock appears **below** the video with addition, subtraction, multiplication and division. It never covers your hands or face.
- **Compact controls:** Undo, Next, Equals and Reset beneath the video. Other camera controls are inside the gear icon.
- Accurate large integer operations use BigInt. Division is rounded to 10 decimal places.
- Camera footage remains on your device.

## Setup and troubleshooting

Open the URL over HTTPS, click **Enable camera**, and allow the webcam in browser permissions. Settings (gear icon) contain camera selection, mirror control, performance settings, restart and hand landmark visibility.

The camera preview starts independently of the hand-tracking model. If a model load fails, a small retry notice appears **below** the camera, not over your face. If access is denied, allow camera access through your browser's site settings and retry. If the lens is physically covered, the software cannot recover its image.

The detection runs on a reduced-resolution camera copy to reduce main-thread work. Actual accuracy and FPS vary by device, camera lighting, and internet access when the model is first loaded.

## Development and deployment

This is a static, client-side JavaScript web app. No server, accounts, Python installation or API key needed.

To run locally:

```bash
python -m http.server 8080
# Browse to http://localhost:8080
node tests/math.test.mjs
node tests/gesture-math.test.mjs
node tests/ui-contract.test.mjs
```

GitHub Actions runs the tests and deploys to GitHub Pages automatically after pushes to `main`:

https://github.com/mreyadishere-bit/airmath-ai/actions

The interface is deliberately limited to **Finger Math**. The previous air-drawing source may remain in the repository for future development, but the main camera interface doesn't load it.
