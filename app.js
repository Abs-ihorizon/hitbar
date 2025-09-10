// ------------------ Firebase Config ------------------
const firebaseConfig = {
  apiKey: "AIzaSyAbE0uCP6HxZXdFdkX3usxZ3R_V0D2fAoQ",
  authDomain: "hitbar-cps.firebaseapp.com",
  projectId: "hitbar-cps",
  storageBucket: "hitbar-cps.firebasestorage.app",
  messagingSenderId: "384195926252",
  appId: "1:384195926252:web:7efc5f718c757eb6f96dc9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const leaderboardRef = db.collection("leaderboard");

// ------------------ Existing Variables ------------------
// (keep your current variables: presses, circles, timerInterval, etc.)

// ------------------ Firebase Leaderboard Functions ------------------
async function saveScoreFirebase(name, score) {
  if (!name) name = "Anonymous";
  try {
    await leaderboardRef.add({
      name: name,
      score: score,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    fetchLeaderboardFirebase(); // Refresh leaderboard
    alert("Score saved globally!");
  } catch (err) {
    console.error("Error saving score:", err);
  }
}

function fetchLeaderboardFirebase() {
  leaderboardRef
    .orderBy("score", "desc")
    .limit(5)
    .get()
    .then(snapshot => {
      leaderList.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        div.className = 'lead-entry';
        const left = document.createElement('div'); left.textContent = (snapshot.docs.indexOf(doc)<3?'🏆 ':'') + data.name;
        const right = document.createElement('div'); right.textContent = data.score;
        div.appendChild(left); div.appendChild(right);
        leaderList.appendChild(div);
      });
    });
}

// Realtime leaderboard update
leaderboardRef
  .orderBy("score", "desc")
  .limit(5)
  .onSnapshot(snapshot => {
    leaderList.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'lead-entry';
      const left = document.createElement('div'); left.textContent = (snapshot.docs.indexOf(doc)<3?'🏆 ':'') + data.name;
      const right = document.createElement('div'); right.textContent = data.score;
      div.appendChild(left); div.appendChild(right);
      leaderList.appendChild(div);
    });
  });

// ------------------ Overwrite your saveScore calls ------------------
function finishGame(){
  pauseGame();
  finalScoreEl.textContent = presses;
  modalName.value = playerNameInput.value || localStorage.getItem('lastPlayer') || '';
  gameOverModal.classList.remove('hidden');

  // Prompt to save (optional)
  setTimeout(()=> {
    const suggested = localStorage.getItem('lastPlayer') || '';
    const name = prompt('Time up! Enter your name to save score globally:', suggested);
    if(name !== null && name.trim() !== ''){
      saveScoreFirebase(name.trim(), presses);
      localStorage.setItem('lastPlayer', name.trim());
    }
  }, 120);
}

// Sidebar save button
saveScoreBtn.addEventListener('click', ()=> {
  const name = playerNameInput.value.trim() || localStorage.getItem('lastPlayer') || prompt('Enter name to save:');
  if(name && name.trim()) {
    saveScoreFirebase(name.trim(), presses);
    localStorage.setItem('lastPlayer', name.trim());
  }
});

// Modal save button
modalSave.addEventListener('click', ()=> {
  const name = modalName.value.trim() || localStorage.getItem('lastPlayer') || prompt('Enter name:');
  if(name && name.trim()) {
    saveScoreFirebase(name.trim(), presses);
    localStorage.setItem('lastPlayer', name.trim());
  }
  gameOverModal.classList.add('hidden');
});

// Initial fetch
fetchLeaderboardFirebase();
