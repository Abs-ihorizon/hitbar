/* Spacebar Circle Pop — final JS
   - Random circle sizes & colors per hit
   - Multiple random sounds via WebAudio
   - Timer/countdown, Game Over modal, leaderboard (localStorage)
*/

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const saveScoreBtn = document.getElementById('saveScore');
const pressesEl = document.getElementById('presses');
const timeDisplay = document.getElementById('timeDisplay');
const cpsEl = document.getElementById('cps');
const durationSelect = document.getElementById('durationSelect');
const leaderList = document.getElementById('leaderList');
const playerNameInput = document.getElementById('playerName');
const glitterChk = document.getElementById('glitter');
const minSizeEl = document.getElementById('minSize');
const maxSizeEl = document.getElementById('maxSize');

// modal elements
const gameOverModal = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const modalName = document.getElementById('modalName');
const modalSave = document.getElementById('modalSave');
const modalClose = document.getElementById('modalClose');
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// state
let presses = 0;
let running = false;
let startTime = 0;
let elapsedBeforePause = 0;
let timerInterval = null;
let durationMs = parseInt(durationSelect.value) * 1000;
let circles = []; // {x,y,r,color,created,alpha}
let audioCtx = null;

// responsive canvas sizing (use CSS size and scale by devicePixelRatio)
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * devicePixelRatio);
  canvas.height = Math.round(rect.height * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// helpers
function rand(min,max){ return Math.random()*(max-min)+min; }
function palette(){ return ['#FF4D6D','#FF8A00','#FFD700','#4CD964','#32BFBF','#4DA6FF','#A36BFF','#FF5CCB','#FFB84D']; }
function randomColor(){ const p = palette(); return p[Math.floor(Math.random()*p.length)]; }
function formatTime(ms){
  const minutes = Math.floor(ms/60000);
  const seconds = Math.floor((ms%60000)/1000);
  const tenths = Math.floor((ms%1000)/100);
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${tenths}`;
}

// audio: small variety of synthesized pops
function ensureAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playRandomSound(){
  try{
    ensureAudio();
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = Math.random()>0.5 ? 'sine' : (Math.random()>0.5 ? 'square' : 'triangle');
    o.frequency.value = rand(200, 1000);
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(audioCtx.destination);
    g.gain.linearRampToValueAtTime(0.08, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + Math.random()*0.18);
    o.start(now);
    o.stop(now + 0.25 + Math.random()*0.12);
  }catch(e){
    // audio context blocked or not available
  }
}

// spawn circle (center coordinates optional)
function spawnCircle(clientX=null, clientY=null){
  const rect = canvas.getBoundingClientRect();
  const x = clientX ? clientX - rect.left : rand(30, rect.width-30);
  const y = clientY ? clientY - rect.top : rand(30, rect.height-30);
  const minS = parseInt(minSizeEl.value || 12);
  const maxS = parseInt(maxSizeEl.value || 110);
  const r = rand(minS, maxS);
  const color = randomColor();
  const created = performance.now();
  circles.push({ x, y, r, color, created });
  presses++;
  pressesEl.textContent = presses;
  playRandomSound();
  if(!running) startGame(); // auto-start on first hit
}

// draw loop
function drawLoop(){
  // clear canvas (transparent background)
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const now = performance.now();
  for(let i=0;i<circles.length;i++){
    const c = circles[i];
    const age = (now - c.created) / 1000; // seconds
    const life = 3.0; // fade duration
    const alpha = Math.max(0, 1 - age / life);
    if(alpha <= 0){
      // remove fully faded
      circles.splice(i,1); i--; continue;
    }
    ctx.save();
    ctx.globalAlpha = alpha * 0.95;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
    ctx.fillStyle = c.color;
    ctx.fill();

    // glitter speckles
    if(glitterChk.checked){
      const speckles = Math.max(5, Math.floor(c.r*0.18));
      for(let s=0;s<speckles;s++){
        const ang = Math.random()*Math.PI*2;
        const rad = Math.random()*c.r*0.65;
        const sx = c.x + Math.cos(ang)*rad;
        const sy = c.y + Math.sin(ang)*rad;
        ctx.fillStyle = Math.random()>0.6 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random()*1.6+0.25, 0, Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  requestAnimationFrame(drawLoop);
}
requestAnimationFrame(drawLoop);

// timer + game control
function startGame(){
  if(running) return;
  running = true;
  startTime = performance.now() - elapsedBeforePause;
  durationMs = parseInt(durationSelect.value) * 1000;
  timerInterval = setInterval(()=> {
    const elapsed = performance.now() - startTime;
    timeDisplay.textContent = formatTime(elapsed);
    const secs = elapsed/1000;
    const avg = secs>0 ? presses/secs : 0;
    cpsEl.textContent = avg.toFixed(2);
    if(elapsed >= durationMs){
      finishGame();
    }
  }, 80);
  startBtn.disabled = true;
  pauseBtn.classList.remove('ghost');
}
function pauseGame(){
  if(!running) return;
  running = false;
  clearInterval(timerInterval);
  elapsedBeforePause = performance.now() - startTime;
  startBtn.disabled = false;
  pauseBtn.classList.add('ghost');
}
function resetGame(){
  running = false;
  clearInterval(timerInterval);
  presses = 0;
  pressesEl.textContent = presses;
  elapsedBeforePause = 0;
  timeDisplay.textContent = "00:00.0";
  cpsEl.textContent = "0.00";
  circles = [];
  startBtn.disabled = false;
  pauseBtn.classList.add('ghost');
}

// finish -> show modal & prompt to save
function finishGame(){
  pauseGame();
  finalScoreEl.textContent = presses;
  modalName.value = playerNameInput.value || localStorage.getItem('lastPlayer') || '';
  gameOverModal.classList.remove('hidden');
  // prompt to save after short delay
  setTimeout(()=> {
    const suggested = localStorage.getItem('lastPlayer') || '';
    const name = prompt('Time up! Enter your name to save score:', suggested);
    if(name !== null && name.trim() !== ''){
      saveScore(name.trim(), presses, parseInt(durationSelect.value));
      localStorage.setItem('lastPlayer', name.trim());
    }
  }, 120);
}

// leaderboard localStorage per duration
function keyFor(sec){ return 'leader_' + sec; }
function loadScores(sec){ try{ return JSON.parse(localStorage.getItem(keyFor(sec))) || []; }catch(e){ return []; } }
function saveScores(sec, arr){ localStorage.setItem(keyFor(sec), JSON.stringify(arr)); }
function saveScore(name, score, sec){
  const list = loadScores(sec);
  list.push({ name, score, timestamp: new Date().toISOString() });
  list.sort((a,b)=> b.score - a.score || new Date(a.timestamp) - new Date(b.timestamp));
  const trimmed = list.slice(0, 50);
  saveScores(sec, trimmed);
  renderLeaderboard();
  alert('Saved! Your rank: #' + (trimmed.findIndex(s => s.name===name && s.score===score) + 1));
}
function renderLeaderboard(){
  const sec = parseInt(durationSelect.value);
  const arr = loadScores(sec);
  leaderList.innerHTML = '';
  if(arr.length === 0){
    leaderList.innerHTML = '<div class="small muted">No scores yet — be the first!</div>'; return;
  }
  arr.slice(0,5).forEach((e,idx)=>{
    const div = document.createElement('div'); div.className = 'lead-entry';
    const left = document.createElement('div'); left.textContent = (idx<3? '🏆 ':'') + e.name;
    const right = document.createElement('div'); right.textContent = e.score;
    div.appendChild(left); div.appendChild(right);
    leaderList.appendChild(div);
  });
}

// events
window.addEventListener('keydown', (ev)=>{
  if(ev.code === 'Space' || ev.key === ' '){
    ev.preventDefault(); // prevent page scroll
    spawnCircle();
  }
});
canvas.addEventListener('pointerdown', (ev)=> {
  spawnCircle(ev.clientX, ev.clientY);
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', ()=> { if(confirm('Clear splashes and reset?')) resetGame(); });
saveScoreBtn.addEventListener('click', ()=> {
  const name = playerNameInput.value.trim() || localStorage.getItem('lastPlayer') || prompt('Enter name to save:');
  if(name && name.trim()) {
    saveScore(name.trim(), presses, parseInt(durationSelect.value));
    localStorage.setItem('lastPlayer', name.trim());
  }
});

// modal buttons
modalSave.addEventListener('click', ()=> {
  const name = modalName.value.trim() || localStorage.getItem('lastPlayer') || prompt('Enter name:');
  if(name && name.trim()) {
    saveScore(name.trim(), presses, parseInt(durationSelect.value));
    localStorage.setItem('lastPlayer', name.trim());
  }
  gameOverModal.classList.add('hidden');
});
modalClose.addEventListener('click', ()=> gameOverModal.classList.add('hidden'));

// initial render
renderLeaderboard();

meri ye file ha isme add krdo chezain
