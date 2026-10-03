"use strict";

/* ==========================================================
   Keyboard Piano: script.js
   The big idea: the page LISTENS for things the user does
   (keydown, keyup, clicks) and REACTS by lighting up a key
   and playing a note.

   Sections: 1 Data  2 Sound  3 Light-up helpers
             4 Keyboard listeners  5 Mouse listeners (bonus)
             6 Controls (bonus)  7 Song mode (bonus)dd
   ========================================================== */


/* ---------- 1. Data ---------- */

// The key map. The property name is the keyboard key (lowercase).
// Anything that is NOT in this object is ignored by the piano.
const NOTES = {
  // The 8 required keys: one full scale
  a: { note: "C",  solfege: "Do",  freq: 262 },
  s: { note: "D",  solfege: "Re",  freq: 294 },
  d: { note: "E",  solfege: "Mi",  freq: 330 },
  f: { note: "F",  solfege: "Fa",  freq: 349 },
  g: { note: "G",  solfege: "Sol", freq: 392 },
  h: { note: "A",  solfege: "La",  freq: 440 },
  j: { note: "B",  solfege: "Ti",  freq: 494 },
  k: { note: "C",  solfege: "Do",  freq: 523 },   // high Do

  // Bonus: black keys (sharps)
  w: { note: "C#", solfege: "Di",  freq: 277 },
  e: { note: "D#", solfege: "Ri",  freq: 311 },
  t: { note: "F#", solfege: "Fi",  freq: 370 },
  y: { note: "G#", solfege: "Si",  freq: 415 },
  u: { note: "A#", solfege: "Li",  freq: 466 }
};

// Bonus: songs written as the letters a student must press
const SONGS = {
  twinkle: {
    title: "Twinkle Twinkle Little Star",
    letters: "a a g g h h g  f f d d s s a".split(/\s+/)
  },
  mary: {
    title: "Mary Had a Little Lamb",
    letters: "d s a s d d d  s s s  d g g  d s a s d d d d  s s d s a".split(/\s+/)
  },
  ode: {
    title: "Ode to Joy",
    letters: "d d f g  g f d s  a a s d  d s s".split(/\s+/)
  }
};

let waveType = "sine";   // changed by the sound selector
let audioContext = null; // created on the first key press (see playNote)
let currentSong = null;  // the song object, or null for free play
let songIndex = 0;       // which letter of the song comes next


/* ---------- 2. Sound ---------- */

// Plays one note. freq is the frequency in Hz (e.g. 330 for Mi).
function playNote(freq) {
  try {
    // Browsers only allow sound after the user does something,
    // so we create the AudioContext here, on the first key press.
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const volume = audioContext.createGain();

    osc.type = waveType;
    osc.frequency.value = freq;

    // A quick fade in and a slow fade out removes the harsh "click"
    // and makes the note sound a bit like a real piano.
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(volume);
    volume.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  } catch (error) {
    console.warn("Sound is not available in this browser.", error);
  }
}


/* ---------- 3. Light-up helpers ---------- */

const lastNoteEl = document.querySelector("#last-note");
const statusEl = document.querySelector("#status");

// Finds the piano key on the page that belongs to a letter.
function getKeyElement(letter) {
  return document.querySelector('[data-key="' + letter + '"]');
}

// Shows the pressed note in big letters (bonus: "show last note").
function showLastNote(letter, info, keyElement) {
  lastNoteEl.textContent = info.solfege + "  (" + info.note + ")";
  lastNoteEl.style.setProperty("--now-hue", keyElement.style.getPropertyValue("--hue").trim());
  statusEl.textContent =
    letter.toUpperCase() + " is pressed: key lights up + plays " +
    info.solfege + " (" + info.freq + " Hz)";
}

// A small music note floats up from the key that was pressed.
function spawnFloatingNote(keyElement) {
  const box = keyElement.getBoundingClientRect();
  const hue = keyElement.style.getPropertyValue("--hue").trim();
  const floater = document.createElement("span");

  floater.className = "float-note";
  floater.textContent = Math.random() > 0.5 ? "♪" : "♫";
  floater.style.left = box.left + box.width / 2 + "px";
  floater.style.top = box.top - 10 + "px";
  floater.style.color = "hsl(" + hue + " 95% 70%)";

  document.body.appendChild(floater);
  floater.addEventListener("animationend", function () {
    floater.remove();
  });
}

// PRESS: light up the key + play its note.
function pressKey(letter) {
  const info = NOTES[letter];
  const keyElement = getKeyElement(letter);
  if (!info || !keyElement) return;      // not a piano key: do nothing

  keyElement.classList.add("active");    // light on
  playNote(info.freq);                   // sound
  showLastNote(letter, info, keyElement);
  spawnFloatingNote(keyElement);
  checkSong(letter);
}

// RELEASE: turn the light off.
function releaseKey(letter) {
  const keyElement = getKeyElement(letter);
  if (!keyElement) return;
  keyElement.classList.remove("active"); // light off
}

// Safety net: turn every light off (used when the window loses focus).
function releaseAllKeys() {
  document.querySelectorAll(".key.active, .black-key.active").forEach(function (el) {
    el.classList.remove("active");
  });
}


/* ---------- 4. Keyboard listeners (the main requirement) ---------- */

// keydown fires when a key goes DOWN.
document.addEventListener("keydown", function (e) {
  // Holding a key makes keydown fire again and again.
  // e.repeat is true for those extra events, so we skip them.
  if (e.repeat) return;

  // Let shortcuts like Ctrl+A or Cmd+S keep working normally.
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // toLowerCase() makes "A" (Caps Lock on) and "a" behave the same.
  const letter = e.key.toLowerCase();

  // Keys that are not in the map (Q, 1, Space, Shift...) stop here.
  if (!Object.prototype.hasOwnProperty.call(NOTES, letter)) return;

  e.preventDefault();   // stops a focused dropdown from jumping to "s..." etc.
  pressKey(letter);
});

// keyup fires when a key comes UP: we need it to turn the light off.
document.addEventListener("keyup", function (e) {
  const letter = e.key.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(NOTES, letter)) return;

  releaseKey(letter);
  statusEl.textContent = letter.toUpperCase() + " released: the light is off.";
});

// If the user switches tab while holding a key, keyup never arrives.
window.addEventListener("blur", releaseAllKeys);


/* ---------- 5. Mouse and touch listeners (bonus: click to play) ---------- */

// querySelectorAll finds ALL keys, forEach gives each one its own listeners.
document.querySelectorAll(".key, .black-key").forEach(function (keyElement) {
  const letter = keyElement.dataset.key;   // reads data-key="..."

  // pointerdown works for mouse AND touch screens.
  keyElement.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;            // left button / touch only
    e.preventDefault();
    pressKey(letter);
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach(function (eventName) {
    keyElement.addEventListener(eventName, function () {
      releaseKey(letter);
    });
  });
});


/* ---------- 6. Controls (bonus: sound selector) ---------- */

const waveSelect = document.querySelector("#wave-select");

// A "change" event fires when the user picks a new option.
waveSelect.addEventListener("change", function () {
  waveType = waveSelect.value;   // sine, triangle, square or sawtooth
  waveSelect.blur();             // give the keyboard back to the piano
  playNote(NOTES.d.freq);        // short preview of the new sound
});


/* ---------- 7. Song mode (bonus) ---------- */

const songSelect = document.querySelector("#song-select");
const songSheet = document.querySelector("#song-sheet");

songSelect.addEventListener("change", function () {
  songSelect.blur();
  startSong(songSelect.value);
});

// Starts a song (or goes back to free play if id is empty).
function startSong(id) {
  currentSong = SONGS[id] || null;
  songIndex = 0;
  drawSong();
}

// Redraws the letters and highlights the next key to press.
function drawSong() {
  document.querySelectorAll(".hint").forEach(function (el) {
    el.classList.remove("hint");
  });

  if (!currentSong) {
    songSheet.hidden = true;
    return;
  }

  songSheet.hidden = false;
  songSheet.textContent = "";

  currentSong.letters.forEach(function (letter, index) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = letter.toUpperCase();
    if (index < songIndex) chip.classList.add("done");
    if (index === songIndex) chip.classList.add("current");
    songSheet.appendChild(chip);
  });

  const next = getKeyElement(currentSong.letters[songIndex]);
  if (next) next.classList.add("hint");
}

// Called on every key press: moves the song forward if the key is right.
function checkSong(letter) {
  if (!currentSong) return;
  if (letter !== currentSong.letters[songIndex]) return;  // wrong key: try again

  songIndex++;

  if (songIndex >= currentSong.letters.length) {
    const title = currentSong.title;
    drawSong();
    songSheet.textContent = "";
    const message = document.createElement("p");
    message.className = "song-message";
    message.textContent = "You played " + title + "! Pick a song to play again.";
    songSheet.appendChild(message);
    document.querySelectorAll(".hint").forEach(function (el) {
      el.classList.remove("hint");
    });
    currentSong = null;
    songSelect.value = "";
    return;
  }

  drawSong();
}
