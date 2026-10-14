/**
 * Webcam and hand tracking are independent.
 * A valid camera preview stays visible even if MediaPipe is offline, slow, or unsupported.
 */
export function createTracker(video, events) {
  const work = document.createElement('canvas');
  const context = work.getContext('2d', { alpha: false });
  let camera = null;
  let detector = null;
  let runId = 0;
  let mode = 'draw';
  let detecting = false;
  let reconfiguring = false;
  let lastAnalysis = 0;
  let previousVideoTime = -1;
  let frames = 0;
  let fpsStarted = 0;
  let adaptiveDelay = 0;
  let lastFailure = '';
  const $ = id => document.getElementById(id);
  const stillCurrent = id => id === runId;

  function stop() {
    runId++;
    detecting = false;
    reconfiguring = false;
    const oldCamera = camera;
    camera = null;
    if (oldCamera) oldCamera.getTracks().forEach(track => track.stop());
    video.pause();
    video.srcObject = null;
    const oldDetector = detector;
    detector = null;
    if (oldDetector) {
      try { oldDetector.close(); } catch (error) { console.debug(error); }
    }
  }

  function describeCameraError(error) {
    const name = error && error.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return 'Camera permission was denied or blocked. In your browser, click the padlock/camera icon beside the URL, allow camera access, then click Retry camera.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No webcam was found. Plug in or enable a camera, or select a different device.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'The webcam could not start. Close Zoom, Teams, Windows Camera or other apps using it, then retry. Also check the webcam privacy shutter.';
    }
    if (name === 'OverconstrainedError') return 'The camera could not meet the requested settings. Try Default camera.';
    if (name === 'AbortError') return 'The camera was interrupted while starting. Please try again.';
    if (!navigator.mediaDevices?.getUserMedia) return 'Camera access is not available in this browser or connection. Open the HTTPS website in Chrome, Edge, or Firefox.';
    return 'Could not open the camera: ' + (error?.message || name || 'Unknown error') + '. You can still draw with your mouse/touch.';
  }

  async function openCamera(deviceId) {
    const basic = { audio: false, video: true };
    const preferred = {
      audio: false,
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      }
    };
    try {
      return await navigator.mediaDevices.getUserMedia(preferred);
    } catch (e) {
      // Do not re-prompt after permission denial; only relax constraints.
      if (!['OverconstrainedError', 'NotFoundError', 'TypeError'].includes(e?.name) || deviceId) throw e;
      return await navigator.mediaDevices.getUserMedia(basic);
    }
  }

  async function start(deviceId = '') {
    stop();
    const id = runId;
    if (!navigator.mediaDevices?.getUserMedia) {
      const error = new Error('getUserMedia unavailable');
      events.onError(describeCameraError(error));
      events.onStatus('Camera unavailable', 'error');
      throw error;
    }
    events.onStatus('Waiting for camera permission…');
    try {
      const stream = await openCamera(deviceId);
      if (!stillCurrent(id)) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      camera = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      // The preview must not wait for play() or a remote ML download.
      events.onCameraReady?.();
      events.onStatus('Camera live · preparing hand tracking…', 'live');
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(error => {
          if (stillCurrent(id)) {
            events.onTrackingError?.('Camera connected but playback is paused: ' + error.message + '. Tap the camera preview or Retry camera.');
          }
        });
      }
      // Load ML independently. A CDN/model/network failure cannot hide the live webcam.
      void loadTracker(id);
      return true;
    } catch (error) {
      if (stillCurrent(id)) {
        events.onError(describeCameraError(error));
        events.onStatus('Camera unavailable', 'error');
      }
      throw error;
    }
  }

  async function loadTracker(id) {
    try {
      const packageUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
      events.onStatus('Camera live · loading hand tracking…', 'live');
      const { HandLandmarker, FilesetResolver } = await import(packageUrl + '/vision_bundle.mjs');
      if (!stillCurrent(id)) return;
      const vision = await FilesetResolver.forVisionTasks(packageUrl + '/wasm');
      if (!stillCurrent(id)) return;
      const options = {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: mode === 'count' ? 2 : 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        minHandPresenceConfidence: 0.5
      };
      let newDetector;
      try {
        newDetector = await HandLandmarker.createFromOptions(vision, options);
      } catch (gpuError) {
        console.info('GPU hand tracking unavailable; switching to CPU:', gpuError);
        if (!stillCurrent(id)) return;
        options.baseOptions.delegate = 'CPU';
        newDetector = await HandLandmarker.createFromOptions(vision, options);
      }
      if (!stillCurrent(id)) {
        newDetector.close();
        return;
      }
      detector = newDetector;
      detecting = true;
      lastAnalysis = 0;
      previousVideoTime = -1;
      frames = 0;
      adaptiveDelay = 0;
      fpsStarted = performance.now();
      events.onTrackingReady?.();
      events.onStatus('Camera live · hand tracking ready', 'live');
      requestAnimationFrame(frame);
    } catch (error) {
      if (!stillCurrent(id)) return;
      const message = 'Camera is working, but hand detection could not load: ' + (error.message || String(error)) +
        '. Check your connection or browser extensions, then use Retry tracking. Mouse/touch drawing still works.';
      console.error('Hand tracking initialization:', error);
      events.onTrackingError?.(message);
      events.onStatus('Camera live · tracking unavailable', 'live');
    }
  }

  function frame(now) {
    if (!detecting || !detector) return;
    requestAnimationFrame(frame);
    if (reconfiguring || video.readyState < 2 || !video.videoWidth) return;
    const desired = { fast: 100, balanced: 65, high: 45 }[$('quality')?.value] || 100;
    if (now - lastAnalysis < Math.max(desired, adaptiveDelay) || video.currentTime === previousVideoTime) return;
    lastAnalysis = now;
    previousVideoTime = video.currentTime;
    try {
      const width = 224;
      const height = Math.max(126, Math.round(width * video.videoHeight / video.videoWidth));
      if (work.width !== width || work.height !== height) {
        work.width = width;
        work.height = height;
      }
      context.drawImage(video, 0, 0, width, height);
      const started = performance.now();
      const found = detector.detectForVideo(work, now);
      const elapsed = performance.now() - started;
      // Back off automatically on slow hardware to avoid freezing the main UI.
      adaptiveDelay = elapsed > 90 ? Math.min(230, Math.ceil(elapsed * 1.65)) : 0;
      events.onHands(found.landmarks || [], now);
      frames++;
      if (now - fpsStarted > 1000) {
        events.onFPS(Math.round(frames * 1000 / (now - fpsStarted)), found.landmarks?.length || 0);
        fpsStarted = now;
        frames = 0;
      }
    } catch (error) {
      detecting = false;
      lastFailure = error?.message || String(error);
      console.error('Hand detection error', error);
      events.onTrackingError?.('Camera is live, but hand detection stopped: ' + lastFailure + '. Try Retry tracking or switch to Fast mode.');
      events.onStatus('Camera live · tracking paused', 'live');
    }
  }

  async function setMode(nextMode) {
    mode = nextMode;
    if (!detector || reconfiguring) return;
    reconfiguring = true;
    try {
      await detector.setOptions({ numHands: mode === 'count' ? 2 : 1 });
    } catch (error) {
      console.warn('Could not change hand tracker settings', error);
    } finally {
      reconfiguring = false;
    }
  }

  async function retryTracking() {
    if (!camera) throw Error('Enable the camera first.');
    if (detecting) return;
    const id = runId;
    void loadTracker(id);
  }

  return { start, stop, setMode, retryTracking, hasCamera: () => !!camera };
}
