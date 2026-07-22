/* ============================================================
   MISE AI — VOICE REDESIGN  |  voice_redesign.js
   Full speech recognition + TTS + Anthropic AI
   ============================================================ */
'use strict';

/* ── STATE ───────────────────────────────────────────────── */
const state = {
  isRecording:  false,
  isTyping:     false,
  isAIThinking: false,
  chatMessages: [],
  recognition:  null,
  toastTimer:   null,
};

/* ── DOM: DESKTOP ────────────────────────────────────────── */
const D = {
  btnBack:     document.getElementById('dBtnBack'),
  btnMenu:     document.getElementById('dBtnMenu'),
  btnMic:      document.getElementById('dBtnMic'),
  btnKeyboard: document.getElementById('dBtnKeyboard'),
  btnClear:    document.getElementById('dBtnClear'),
  voiceUI:     document.getElementById('dVoiceUI'),
  orb:         document.getElementById('dOrb'),
  orbRings:    document.querySelectorAll('.d-orb-ring'),
  wave:        document.getElementById('dWave'),
  voiceLabel:  document.getElementById('dVoiceLabel'),
  voiceInterim:document.getElementById('dVoiceInterim'),
  chatArea:    document.getElementById('dChatArea'),
  empty:       document.getElementById('dEmpty'),
  typeBar:     document.getElementById('dTypeBar'),
  typeInput:   document.getElementById('dTypeInput'),
  typeSend:    document.getElementById('dTypeSend'),
  status:      document.getElementById('dStatus'),
  noSupport:   document.getElementById('dNoSupport'),
  suggestions: document.querySelectorAll('.d-sug'),
};

/* ── DOM: MOBILE ─────────────────────────────────────────── */
const M = {
  btnBack:     document.getElementById('mBtnBack'),
  btnMenu:     document.getElementById('mBtnMenu'),
  btnMic:      document.getElementById('mBtnMic'),
  btnKeyboard: document.getElementById('mBtnKeyboard'),
  btnClear:    document.getElementById('mBtnClear'),
  hero:        document.getElementById('mHero'),
  orb:         document.getElementById('mOrb'),
  orbRings:    document.querySelectorAll('.m-orb-ring'),
  chatArea:    document.getElementById('mChatArea'),
  voiceUI:     document.getElementById('mVoiceUI'),
  wave:        document.getElementById('mWave'),
  voiceLabel:  document.getElementById('mVoiceLabel'),
  voiceInterim:document.getElementById('mVoiceInterim'),
  typeBar:     document.getElementById('mTypeBar'),
  typeInput:   document.getElementById('mTypeInput'),
  typeSend:    document.getElementById('mTypeSend'),
  status:      document.getElementById('mStatus'),
  noSupport:   document.getElementById('mNoSupport'),
  suggestions: document.querySelectorAll('.m-sug'),
};

/* ── SPEECH RECOGNITION ──────────────────────────────────── */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function initRecognition() {
  if (!SpeechRecognition) {
    D.noSupport.style.display = 'block';
    M.noSupport.style.display = 'block';
    D.btnMic.style.opacity = '0.35';
    M.btnMic.style.opacity = '0.35';
    D.btnMic.style.cursor  = 'not-allowed';
    M.btnMic.style.cursor  = 'not-allowed';
    return;
  }

  state.recognition = new SpeechRecognition();
  const r = state.recognition;
  r.continuous      = false;
  r.interimResults  = true;
  r.lang            = 'en-US';
  r.maxAlternatives = 1;

  r.onstart = () => {
    state.isRecording = true;
    setListeningUI(true);
    setStatus('Microphone active — speak now');
  };

  r.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final   += e.results[i][0].transcript;
      else                      interim += e.results[i][0].transcript;
    }
    const spoken = final || interim;
    D.voiceInterim.textContent = spoken;
    M.voiceInterim.textContent = spoken;
    if (final) { stopVoice(); sendMessage(final.trim()); }
  };

  r.onerror = (e) => {
    stopVoice();
    const msgs = {
      'not-allowed':  'Microphone access denied. Please allow it in your browser.',
      'no-speech':    'No speech detected — please try again.',
      'network':      'Network error during voice capture.',
      'aborted':      '',
    };
    setStatus(msgs[e.error] || 'Voice error: ' + e.error);
  };

  r.onend = () => { if (state.isRecording) stopVoice(); };
}

/* ── VOICE CONTROLS ──────────────────────────────────────── */
function toggleVoice() {
  if (!SpeechRecognition) return;
  if (state.isRecording) { stopVoice(); return; }
  if (state.isAIThinking) { setStatus('Please wait for Mise AI to finish…'); return; }
  if (state.isTyping) toggleKeyboard();

  try {
    state.recognition.start();
  } catch(e) {
    setStatus('Could not access microphone');
  }
}

function stopVoice() {
  state.isRecording = false;
  setListeningUI(false);
  D.voiceInterim.textContent = '';
  M.voiceInterim.textContent = '';
  try { state.recognition.stop(); } catch(e) {}
  setStatus('');
}

function setListeningUI(on) {
  // Mic button
  D.btnMic.classList.toggle('recording', on);
  M.btnMic.classList.toggle('recording', on);
  // Orb
  D.orb.classList.toggle('listening', on);
  M.orb.classList.toggle('listening', on);
  // Rings
  D.orbRings.forEach(r => r.classList.toggle('active', on));
  M.orbRings.forEach(r => r.classList.toggle('active', on));
  // Wave bars
  D.wave.classList.toggle('active', on);
  // Voice UI panel (mobile)
  M.voiceUI.classList.toggle('active', on);
  // Label
  D.voiceLabel.textContent = on ? 'Listening…' : 'Tap mic to speak';
  D.voiceLabel.classList.toggle('active', on);
  M.voiceLabel.textContent = on ? 'Listening…' : 'Tap to speak';
}

/* ── KEYBOARD TOGGLE ─────────────────────────────────────── */
function toggleKeyboard() {
  state.isTyping = !state.isTyping;

  D.typeBar.classList.toggle('active', state.isTyping);
  D.btnKeyboard.classList.toggle('active', state.isTyping);
  M.typeBar.classList.toggle('active', state.isTyping);
  M.btnKeyboard.classList.toggle('active', state.isTyping);

  if (state.isTyping) {
    if (state.isRecording) stopVoice();
    // Focus whichever input is visible
    setTimeout(() => {
      const isMobile = window.innerWidth < 900;
      (isMobile ? M.typeInput : D.typeInput).focus();
    }, 120);
  }
}

function submitTyped(isMob) {
  const input = isMob ? M.typeInput : D.typeInput;
  const text  = input.value.trim();
  if (!text || state.isAIThinking) return;
  input.value = '';
  sendMessage(text);
}

/* ── CHAT ────────────────────────────────────────────────── */
function sendMessage(text) {
  if (!text) return;
  addMsg('user', text);
  state.chatMessages.push({ role: 'user', content: text });
  askAI();
}

function addMsg(role, content) {
  // Hide hero / empty state
  D.empty.classList.add('hidden');
  M.hero.classList.add('hidden');
  M.chatArea.classList.add('active');

  [D.chatArea, M.chatArea].forEach(area => {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = content;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  });
}

function addTypingIndicator() {
  const indicators = [];
  [D.chatArea, M.chatArea].forEach(area => {
    const div = document.createElement('div');
    div.className = 'msg ai typing';
    div.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
    indicators.push(div);
  });
  return indicators;
}

/* ── ANTHROPIC API ───────────────────────────────────────── */
async function askAI() {
  state.isAIThinking = true;
  setStatus('Mise AI is thinking...');
  const indicators = addTypingIndicator();

  try {
    const reply = await fetchAIResponse(state.chatMessages[state.chatMessages.length - 1].content);
    indicators.forEach(el => el.remove());
    addMsg('ai', reply);
    speakReply(reply); // TTS is already in your file
  } catch (err) {
    indicators.forEach(el => el.remove());
    addMsg('ai', "I couldn't reach the AI. Check your connection.");
  }
  state.isAIThinking = false;
}

/* ── TEXT TO SPEECH ──────────────────────────────────────── */
function speakReply(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter  = new SpeechSynthesisUtterance(text);
  utter.rate   = 1.0;
  utter.pitch  = 1.05;
  utter.volume = 0.9;

  const loadVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const pref   = voices.find(v => /Google.*en/i.test(v.name))
                || voices.find(v => v.lang.startsWith('en') && !v.localService)
                || voices.find(v => v.lang.startsWith('en'));
    if (pref) utter.voice = pref;
    window.speechSynthesis.speak(utter);
  };

  if (window.speechSynthesis.getVoices().length) loadVoice();
  else window.speechSynthesis.onvoiceschanged = loadVoice;
}

/* ── CLEAR CHAT ──────────────────────────────────────────── */
function clearChat() {
  D.chatArea.innerHTML   = '';
  M.chatArea.innerHTML   = '';
  M.chatArea.classList.remove('active');
  D.empty.classList.remove('hidden');
  M.hero.classList.remove('hidden');
  state.chatMessages     = [];

  if (state.isRecording) stopVoice();
  if (state.isTyping)    toggleKeyboard();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  setStatus('');
}

/* ── STATUS ──────────────────────────────────────────────── */
function setStatus(msg) {
  D.status.textContent = msg;
  M.status.textContent = msg;
}

/* ── EVENT WIRING ────────────────────────────────────────── */
function bindEvents() {
  // Desktop
  D.btnMic.addEventListener('click',      () => toggleVoice());
  D.btnKeyboard.addEventListener('click', () => toggleKeyboard());
  D.btnClear.addEventListener('click',    () => clearChat());
  D.btnBack.addEventListener('click',     () => clearChat());
  D.typeSend.addEventListener('click',    () => submitTyped(false));
  D.typeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTyped(false); }
  });
  D.suggestions.forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.text));
  });

  // Mobile
  M.btnMic.addEventListener('click',      () => toggleVoice());
  M.btnKeyboard.addEventListener('click', () => toggleKeyboard());
  M.btnClear.addEventListener('click',    () => clearChat());
  M.btnBack.addEventListener('click',     () => clearChat());
  M.typeSend.addEventListener('click',    () => submitTyped(true));
  M.typeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTyped(true); }
  });
  M.suggestions.forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.text));
  });

  // Global shortcuts
  document.addEventListener('keydown', e => {
    // Space bar: toggle mic (when no input focused)
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault(); toggleVoice();
    }
    // Escape: stop voice / close keyboard
    if (e.key === 'Escape') {
      if (state.isRecording) stopVoice();
      else if (state.isTyping) toggleKeyboard();
    }
  });
}

/* ── INIT ────────────────────────────────────────────────── */
function init() {
  initRecognition();
  bindEvents();

  // Preload TTS voices
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
