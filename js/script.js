// Application Architecture State Variables
let audioCtx = null;
let masterGain = null;
let delayNode = null;
let activeOscillators = {};
let isMuted = false;
let isRecording = false;
let recordedNotes = [];
let recordStartTime = 0;
let isDemoPlaying = false;
let demoTimers = [];
let learningModeActive = false;
let learningTargetIndex = 0;
let learningScore = 0;

// Signal Output Metrics Visualizer Data Array Setup
let analyser = null;
let dataArray = [];

// Performance Diagnostics Variables
let fps = 0;
let lastFrameTime = performance.now();
let frameCount = 0;

// Traditional Poly-Phonic Equivalent Scaling Array Configurations
const scaleFrequencies = [
  329.63, 369.99, 415.3, 440.0, 493.88, 554.37, 622.25, 659.25,
]; // Approximating E4 - E5 Scale
const keyMap = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK"];

// Core Initializing Pipeline Hook on window loaded lifecycle
window.addEventListener("DOMContentLoaded", () => {
  // Delay handler simulation to exit Splash loading window screen
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    splash.style.opacity = "0";
    setTimeout(() => (splash.style.display = "none"), 500);
  }, 1200);

  initCanvas();
  setupKeyboardListeners();
  setupControlInterfaces();
  startDiagnosticEngine();
});

// App Router / Target Area Viewstate switcher
function switchSection(targetSectionId) {
  document
    .querySelectorAll(".app-section")
    .forEach((sec) => sec.classList.remove("active-section"));
  document
    .querySelectorAll("nav button")
    .forEach((btn) => btn.classList.remove("active"));

  document
    .getElementById(`section-${targetSectionId}`)
    .classList.add("active-section");
  const targetNav = document.getElementById(`nav-${targetSectionId}`);
  if (targetNav) targetNav.classList.add("active");

  // Automatically spins up Context when entering workspace layout
  if (targetSectionId === "play") {
    initAudioContext();
  }
}

// Web Audio API DSP Core Engine Synthesis Stack setup
function initAudioContext() {
  if (audioCtx) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(
    parseFloat(document.getElementById("slider-volume").value),
    audioCtx.currentTime,
  );

  // Echo Delay Node configuration loops
  delayNode = audioCtx.createDelay(1.0);
  let delayFeedback = audioCtx.createGain();

  delayNode.delayTime.setValueAtTime(0.3, audioCtx.currentTime);
  delayFeedback.gain.setValueAtTime(
    parseFloat(document.getElementById("slider-reverb").value) * 0.6,
    audioCtx.currentTime,
  );

  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);

  // Frequency Spectrum Analyser Mapping
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  let bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Audio node infrastructure routing map
  masterGain.connect(analyser);
  masterGain.connect(delayNode);
  delayNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  document.getElementById("stat-engine").innerText = "Synth Engine: Live";
  drawVisualizer();
}

// Complex String Harmonics Acoustic Model Generator Engine
function playTraditionalNote(frequency) {
  if (!audioCtx) initAudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (isMuted) return null;

  const pitchOffset = parseInt(document.getElementById("slider-pitch").value);
  const absoluteFreq = frequency * Math.pow(2, pitchOffset / 12);

  // Double Sawtooth & Triangle configurations map rustic textures perfectly
  let oscPrimary = audioCtx.createOscillator();
  let oscHarmonic1 = audioCtx.createOscillator();
  let oscHarmonic2 = audioCtx.createOscillator();
  let instGain = audioCtx.createGain();

  oscPrimary.type = "sawtooth";
  oscPrimary.frequency.setValueAtTime(absoluteFreq, audioCtx.currentTime);
  // Subtle vibrato simulation
  oscPrimary.frequency.linearRampToValueAtTime(
    absoluteFreq + 4,
    audioCtx.currentTime + 0.1,
  );
  oscPrimary.frequency.linearRampToValueAtTime(
    absoluteFreq - 2,
    audioCtx.currentTime + 0.2,
  );

  oscHarmonic1.type = "triangle";
  oscHarmonic1.frequency.setValueAtTime(absoluteFreq * 2, audioCtx.currentTime);

  oscHarmonic2.type = "sawtooth";
  oscHarmonic2.frequency.setValueAtTime(absoluteFreq * 3, audioCtx.currentTime);

  // Bowing Attack ADSR simulation envelope
  instGain.gain.setValueAtTime(0, audioCtx.currentTime);
  instGain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.08);
  instGain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.3);

  oscPrimary.connect(instGain);
  oscHarmonic1.connect(instGain);
  oscHarmonic2.connect(instGain);
  instGain.connect(masterGain);

  oscPrimary.start();
  oscHarmonic1.start();
  oscHarmonic2.start();

  // Session Internal Recording capture handler hook
  if (isRecording) {
    recordedNotes.push({
      time: performance.now() - recordStartTime,
      freq: frequency,
      duration: 0.4,
    });
  }

  return {
    stop: function () {
      try {
        instGain.gain.cancelScheduledValues(audioCtx.currentTime);
        instGain.gain.setValueAtTime(instGain.gain.value, audioCtx.currentTime);
        instGain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.15,
        ); // Release curve
        setTimeout(() => {
          oscPrimary.stop();
          oscHarmonic1.stop();
          oscHarmonic2.stop();
        }, 200);
      } catch (e) {}
    },
  };
}

// Interactive Play Performance Matrix Router Input Handlers
function setupKeyboardListeners() {
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const index = keyMap.indexOf(e.code);
    if (index !== -1) {
      triggerNoteByIndex(index);
    }
  });

  window.addEventListener("keyup", (e) => {
    const index = keyMap.indexOf(e.code);
    if (index !== -1) {
      releaseNoteIndex(index);
    }
  });
}

function triggerNoteByIndex(index) {
  const keys = ["A", "S", "D", "F", "G", "H", "J", "K"];
  const targetElement = document.getElementById(`key-${keys[index]}`);
  if (targetElement) targetElement.classList.add("active-key");

  if (!activeOscillators[index]) {
    activeOscillators[index] = playTraditionalNote(scaleFrequencies[index]);
    triggerStringVibration(30);
  }

  // Interactive Learn Evaluation validation logic check
  if (learningModeActive && index === learningTargetIndex) {
    learningScore += 10;
    document.getElementById("learn-score").innerText = learningScore;
    advanceLearningTarget();
  }
}

function releaseNoteIndex(index) {
  const keys = ["A", "S", "D", "F", "G", "H", "J", "K"];
  const targetElement = document.getElementById(`key-${keys[index]}`);
  if (targetElement) targetElement.classList.remove("active-key");

  if (activeOscillators[index]) {
    activeOscillators[index].stop();
    delete activeOscillators[index];
  }
}

// User Dashboard Slider Controller Bindings mappings
function setupControlInterfaces() {
  document.getElementById("slider-volume").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("val-volume").innerText =
      `${Math.round(val * 100)}%`;
    if (masterGain) masterGain.gain.setValueAtTime(val, audioCtx.currentTime);
  });

  document.getElementById("slider-pitch").addEventListener("input", (e) => {
    document.getElementById("val-pitch").innerText = e.target.value;
  });

  document.getElementById("slider-reverb").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("val-reverb").innerText =
      `${Math.round(val * 100)}%`;
  });
}

function resetAudioSettings() {
  document.getElementById("slider-volume").value = 0.7;
  document.getElementById("slider-pitch").value = 0;
  document.getElementById("slider-reverb").value = 0.35;
  document.getElementById("val-volume").innerText = "70%";
  document.getElementById("val-pitch").innerText = "0";
  document.getElementById("val-reverb").innerText = "35%";
  if (masterGain) masterGain.gain.setValueAtTime(0.7, audioCtx.currentTime);
}

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById("btn-mute");
  btn.innerText = isMuted ? "Unmute Synth" : "Mute Synth";
  btn.style.background = isMuted ? "var(--ethiopian-red)" : "#888";
}

// High-Performance Instrument Canvas Animation Engine Loops
let canvas, ctx;
let stringVibrationAmplitude = 0;
let bowOffsetPositionX = 0;
let isUserDraggingBow = false;

function initCanvas() {
  canvas = document.getElementById("mesenko-canvas");
  ctx = canvas.getContext("2d");

  // Pointer Interactivity Layer bindings setup
  canvas.addEventListener("mousedown", engageInstrumentBow);
  canvas.addEventListener("mousemove", dragInstrumentBow);
  window.addEventListener("mouseup", disengageInstrumentBow);

  // Mobile Dynamic Gesture Support mappings
  canvas.addEventListener("touchstart", (e) => {
    engageInstrumentBow(e.touches[0]);
  });
  canvas.addEventListener("touchmove", (e) => {
    dragInstrumentBow(e.touches[0]);
  });
  canvas.addEventListener("touchend", disengageInstrumentBow);

  renderFrameLoop();
}

function renderFrameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const neckTopX = 200,
    neckTopY = 30;
  const bodyTopY = 380,
    bodyBottomY = 550;

  // 1. Draw Wooden Long Neck
  ctx.strokeStyle = "#5a3d28";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(neckTopX, neckTopY);
  ctx.lineTo(neckTopX, bodyBottomY - 30);
  ctx.stroke();

  // 2. Draw Top Tuning Peg
  ctx.fillStyle = "#3d2314";
  ctx.fillRect(170, 60, 60, 15);

  // 3. Draw Traditional Diamond Soundbox Body
  ctx.fillStyle = "#d2b48c";
  ctx.strokeStyle = "#3d2314";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(neckTopX, bodyTopY);
  ctx.lineTo(100, (bodyTopY + bodyBottomY) / 2);
  ctx.lineTo(neckTopX, bodyBottomY);
  ctx.lineTo(300, (bodyTopY + bodyBottomY) / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Soundbox Accent lines
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(130, (bodyTopY + bodyBottomY) / 2);
  ctx.lineTo(270, (bodyTopY + bodyBottomY) / 2);
  ctx.stroke();

  // 4. Draw Single Vibrating Horsehair String
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(neckTopX, neckTopY + 40);

  if (stringVibrationAmplitude > 0.1) {
    ctx.quadraticCurveTo(
      neckTopX + Math.sin(performance.now() * 0.5) * stringVibrationAmplitude,
      (neckTopY + bodyBottomY) / 2,
      neckTopX,
      bodyBottomY - 10,
    );
    stringVibrationAmplitude *= 0.92; // Sound decay dampening
  } else {
    ctx.lineTo(neckTopX, bodyBottomY - 10);
  }
  ctx.stroke();

  // 5. Draw the Bow Stick Representation
  let bowY = 280 + bowOffsetPositionX;
  ctx.strokeStyle = "rgba(139, 90, 43, 0.9)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(80, bowY - 15);
  ctx.quadraticCurveTo(200, bowY - 45, 320, bowY - 15);
  ctx.stroke();

  // Bow Hair string filament
  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(85, bowY);
  ctx.lineTo(315, bowY);
  ctx.stroke();

  frameCount++;
  requestAnimationFrame(renderFrameLoop);
}

function triggerStringVibration(amount) {
  stringVibrationAmplitude = amount;
}

function engageInstrumentBow(e) {
  isUserDraggingBow = true;
  processBowInteractionSound(e);
}

function dragInstrumentBow(e) {
  if (!isUserDraggingBow) return;
  processBowInteractionSound(e);
}

function disengageInstrumentBow() {
  if (isUserDraggingBow) {
    isUserDraggingBow = false;
    releaseNoteIndex(3);
    releaseNoteIndex(4);
  }
}

function processBowInteractionSound(e) {
  const rect = canvas.getBoundingClientRect();
  const clientY = e.clientY || e.pageY;
  const relativeY = clientY - rect.top;

  bowOffsetPositionX = (relativeY - 300) * 0.5;

  if (relativeY < 200) {
    triggerNoteByIndex(1);
    setTimeout(() => releaseNoteIndex(1), 200);
  } else if (relativeY >= 200 && relativeY < 400) {
    triggerNoteByIndex(3);
  } else {
    triggerNoteByIndex(5);
    setTimeout(() => releaseNoteIndex(5), 200);
  }
}

// Frequency Spectrum Diagnostic Web Audio Visualizer Rendering
function drawVisualizer() {
  if (!analyser) return;
  requestAnimationFrame(drawVisualizer);

  const vCanvas = document.getElementById("visualizer-canvas");
  const vCtx = vCanvas.getContext("2d");
  const W = vCanvas.width;
  const H = vCanvas.height;

  analyser.getByteFrequencyData(dataArray);
  vCtx.fillStyle = "rgba(0,0,0,0.06)";
  vCtx.fillRect(0, 0, W, H);

  const barWidth = (W / dataArray.length) * 1.5;
  let barHeight;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    barHeight = dataArray[i] * 0.25;
    vCtx.fillStyle = `rgb(${barHeight + 100}, 137, 59)`;
    vCtx.fillRect(x, H - barHeight, barWidth - 2, barHeight);
    x += barWidth;
  }
}

// System Performance Metrics diagnostic tracker loops
function startDiagnosticEngine() {
  setInterval(() => {
    const now = performance.now();
    fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
    document.getElementById("stat-fps").innerText =
      `FPS: ${fps} / Performance Fluid`;
    frameCount = 0;
    lastFrameTime = now;
  }, 1000);
}

// Session Native Vector Timeline Data Recorder Matrix functions
function startRecording() {
  isRecording = true;
  recordedNotes = [];
  recordStartTime = performance.now();
  document.getElementById("rec-start").disabled = true;
  document.getElementById("rec-stop").disabled = false;
  document.getElementById("stat-engine").innerText =
    "Synth Engine: RECORDING SESSION";
}

function stopRecording() {
  isRecording = false;
  document.getElementById("rec-start").disabled = false;
  document.getElementById("rec-stop").disabled = true;
  document.getElementById("rec-play").disabled = recordedNotes.length === 0;
  document.getElementById("rec-dl").disabled = recordedNotes.length === 0;
  document.getElementById("stat-engine").innerText =
    "Synth Engine: Audio Buffered";
}

function playRecording() {
  if (recordedNotes.length === 0) return;
  recordedNotes.forEach((noteEvent) => {
    setTimeout(() => {
      let osc = playTraditionalNote(noteEvent.freq);
      if (osc) setTimeout(() => osc.stop(), noteEvent.duration * 1000);
    }, noteEvent.time);
  });
}

function downloadRecording() {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(recordedNotes));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "mesenko_session_recording.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Interactive Guided Learning Modes
function toggleLearningMode() {
  learningModeActive = !learningModeActive;
  const container = document.getElementById("learning-status");
  container.style.display = learningModeActive ? "block" : "none";
  if (learningModeActive) {
    learningScore = 0;
    document.getElementById("learn-score").innerText = "0";
    advanceLearningTarget();
  }
}

function advanceLearningTarget() {
  learningTargetIndex = Math.floor(Math.random() * scaleFrequencies.length);
  const keysArr = ["A", "S", "D", "F", "G", "H", "J", "K"];
  document.getElementById("learn-target").innerText =
    keysArr[learningTargetIndex];
}

// Track Play demonstration Array sequence playbacks
function playDemoSong() {
  stopDemoSong();
  isDemoPlaying = true;
  const demoMelody = [0, 2, 4, 3, 4, 2, 0, 1, 0, 0];
  const phrasingInterval = 450;

  demoMelody.forEach((noteIdx, loopPosition) => {
    let timerId = setTimeout(() => {
      if (!isDemoPlaying) return;
      triggerNoteByIndex(noteIdx);
      setTimeout(() => releaseNoteIndex(noteIdx), 350);
    }, loopPosition * phrasingInterval);
    demoTimers.push(timerId);
  });
}

function stopDemoSong() {
  isDemoPlaying = false;
  demoTimers.forEach((id) => clearTimeout(id));
  demoTimers = [];
  for (let i = 0; i < 8; i++) releaseNoteIndex(i);
}

// System UI Personalization Theme management mappings
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const targetTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", targetTheme);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}
