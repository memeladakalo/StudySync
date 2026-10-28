// StudySync - Combined script.js (Auth, Profile, Tasks, Feed, Share, Live Video)
// NOTE: Save this whole file as script.js and overwrite previous file.

// ------------------------------
// Helpers
// ------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
function qs(id) { return document.getElementById(id); }
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }
function clamp(v, a, b){ return Math.max(a, Math.min(b,v)); }

// ------------------------------
// Persistent storage keys
// ------------------------------
const KEY_USER = 'studysync_user';
const KEY_TASKS = 'studysync_tasks';
const KEY_GROUPCODE = 'studysync_groupCode';

// ------------------------------
// Simple localStorage wrappers
// ------------------------------
function saveUser(user){ localStorage.setItem(KEY_USER, JSON.stringify(user)); }
function loadUser(){ return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); }
function saveTasks(tasks){ localStorage.setItem(KEY_TASKS, JSON.stringify(tasks)); }
function loadTasks(){ return JSON.parse(localStorage.getItem(KEY_TASKS) || '[]'); }
function ensureGroupCode(){
  let code = localStorage.getItem(KEY_GROUPCODE);
  if(!code){
    code = Math.random().toString(36).slice(2,8).toUpperCase();
    localStorage.setItem(KEY_GROUPCODE, code);
  }
  return code;
}
const GROUP_CODE = ensureGroupCode();

// ------------------------------
// DOM Elements
// ------------------------------
const loginForm = qs('loginForm');
const signupForm = qs('signupForm');
const logoutBtn = qs('logoutBtn');
const profileAvatar = qs('profileAvatar');
const avatarUpload = qs('avatarUpload');
const saveProfileBtn = qs('saveProfileBtn');

const organiseBtn = qs('organiseBtn');
const motivateBtn = qs('motivateBtn');
const newTaskBtn = qs('newTaskBtn');
const taskDialog = qs('taskDialog');
const taskForm = qs('taskForm');
const cancelTask = qs('cancelTask');
const taskListEl = qs('taskList');
const taskTemplate = qs('taskTemplate');
const feedEl = qs('feed');
const shareBtn = qs('shareBtn');
const shareDialog = qs('shareDialog');
const closeShare = qs('closeShare');
const groupCodeEl = qs('groupCode');
const progressBar = qs('progressBar');
const progressText = qs('progressText');

const startLiveBtn = qs('startLiveBtn');
const joinLiveBtn = qs('joinLiveBtn');
const endLiveBtn = qs('endLiveBtn');
const localVideo = qs('localVideo');
const remoteVideo = qs('remoteVideo');
const roomCodeInput = qs('roomCodeInput');

// ------------------------------
// AUTH: Signup/Login
// ------------------------------
if (signupForm) {
  signupForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = qs('signupEmail').value.trim();
    const password = qs('signupPassword').value;
    if(!email || !password){
      alert('Please enter email and password to sign up.');
      return;
    }
    const user = { name:'Student', email, password, avatar:null, bio:'', school:'' };
    saveUser(user);
    alert('Account created. Redirecting to Home.');
    window.location = 'index.html';
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = qs('loginEmail').value.trim();
    const password = qs('loginPassword').value;
    const user = loadUser();
    if(!user){
      alert('No account found. Please sign up first.');
      return;
    }
    if(user.email === email && user.password === password){
      alert('Login successful. Redirecting to Home.');
      window.location = 'index.html';
    } else {
      alert('Login failed. Check email and password.');
    }
  });
}

// ------------------------------
// LOGOUT
// ------------------------------
if (logoutBtn) {
  logoutBtn.addEventListener('click', ()=>{
    localStorage.removeItem(KEY_USER);
    window.location = 'login.html';
  });
}

// ------------------------------
// PROFILE Save/Load
// ------------------------------
if (saveProfileBtn) {
  const existing = loadUser();
  if(existing){
    if(qs('profileName')) qs('profileName').value = existing.name || '';
    if(qs('profileBio')) qs('profileBio').value = existing.bio || '';
    if(qs('profileAvatar') && existing.avatar) qs('profileAvatar').src = existing.avatar;
  }

  saveProfileBtn.addEventListener('click', ()=>{
    const user = loadUser() || { name:'Student' };
    if(qs('profileName')) user.name = qs('profileName').value.trim();
    if(qs('profileBio')) user.bio = qs('profileBio').value.trim();
    if(avatarUpload && avatarUpload.files[0]){
      const reader = new FileReader();
      reader.onload = function(e){
        user.avatar = e.target.result;
        saveUser(user);
        if(profileAvatar) profileAvatar.src = user.avatar;
        alert('Profile updated.');
      };
      reader.readAsDataURL(avatarUpload.files[0]);
    } else {
      saveUser(user);
      alert('Profile updated.');
    }
  });
}

// ------------------------------
// TASKS
// ------------------------------
let tasks = loadTasks();

function renderTasks(){
  if(!taskListEl) return;
  taskListEl.innerHTML = '';
  if(!tasks.length){
    taskListEl.innerHTML = '<li class="muted">No tasks yet. Add a task to begin.</li>';
    updateProgress();
    return;
  }

  tasks.forEach((t, idx)=>{
    const tmpl = taskTemplate?.content.cloneNode(true);
    if(tmpl){
      tmpl.querySelector('.task-title').textContent = t.title;
      tmpl.querySelector('.task-due').textContent = t.due ? new Date(t.due).toLocaleDateString() : 'No due date';
      
      const statusBtn = tmpl.querySelector('.complete-btn'); // clickable status button
      const celebrateBtn = tmpl.querySelector('.celebrate-btn');

      // initialize button
      statusBtn.textContent = t.status || 'Not Started';
      statusBtn.classList.remove('not-started','in-progress','done');
      statusBtn.classList.add((t.status||'Not Started').toLowerCase().replace(' ','-'));

      // cycle status on click
      statusBtn.addEventListener('click', ()=>{
        if(!t.status || t.status==='Not Started') t.status='In Progress';
        else if(t.status==='In Progress') t.status='Done';
        else if(t.status==='Done') t.status='Not Started';
        saveAndRender();
      });

      celebrateBtn.addEventListener('click', ()=>{
        t.likes = (t.likes||0)+1;
        saveAndRender();
        addFeed(`👏 Someone celebrated "${t.title}"`);
      });

      taskListEl.appendChild(tmpl);
    }
  });

  updateProgress();
}

function saveAndRender(){ saveTasks(tasks); renderTasks(); }
function addTaskObj(t){ tasks.unshift(t); saveAndRender(); addFeed(`📝 New task added: ${t.title}`); }

function updateProgress(){
  if(!progressBar || !progressText) return;
  const total = tasks.length;
  const done = tasks.filter(x=>x.status==='Done').length;
  const pct = total ? Math.round((done/total)*100) : 0;
  progressBar.value = pct;
  progressText.textContent = `${pct}% complete`;
}

renderTasks();

// Task dialog
if (newTaskBtn && taskDialog && taskForm && cancelTask) {
  newTaskBtn.addEventListener('click', ()=>{ taskForm.reset(); taskDialog.setAttribute('aria-hidden','false'); });
  cancelTask.addEventListener('click', ()=>{ taskDialog.setAttribute('aria-hidden','true'); });
  taskForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const title = qs('taskTitle').value.trim();
    const due = qs('taskDue').value;
    if(!title){ alert('Please add a task title.'); return; }
    addTaskObj({ title, due, status:'Not Started', likes:0 });
    taskDialog.setAttribute('aria-hidden','true');
  });
}

// ------------------------------
// FEED
// ------------------------------
function addFeed(msg){
  if(!feedEl) return;
  const post = document.createElement('div');
  post.className = 'feed-post';
  post.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong> — ${msg}
    <div class="feed-actions">
      <button class="feed-like">👍 Like</button>
      <button class="feed-comment">💬 Comment</button>
      <button class="feed-celebrate">🎉 Celebrate</button>
    </div>`;
  post.querySelector('.feed-like').addEventListener('click', function(){ this.textContent='❤️ Liked'; });
  post.querySelector('.feed-comment').addEventListener('click', function(){ const c=prompt('Write a comment:'); if(c) alert('Comment: '+c); });
  post.querySelector('.feed-celebrate').addEventListener('click', function(){ alert('You celebrated this update!'); });
  feedEl.prepend(post);
}

// ------------------------------
// SHARE
// ------------------------------
if (shareBtn && shareDialog && closeShare && groupCodeEl){
  shareBtn.addEventListener('click', ()=>{
    groupCodeEl.textContent = GROUP_CODE;
    const url = encodeURIComponent(location.href);
    const text = encodeURIComponent(`Join my StudySync group! Code: ${GROUP_CODE}`);
    qs('shareWhatsapp').href=`https://wa.me/?text=${text}%20${url}`;
    qs('shareFacebook').href=`https://www.facebook.com/sharer/sharer.php?u=${url}`;
    qs('shareX').href=`https://twitter.com/intent/tweet?text=${text}%20${url}`;
    shareDialog.setAttribute('aria-hidden','false');
  });
  closeShare.addEventListener('click', ()=>{ shareDialog.setAttribute('aria-hidden','true'); });
}

// ------------------------------
// Navigation Tabs
// ------------------------------
if (organiseBtn && motivateBtn){
  organiseBtn.addEventListener('click', ()=>{
    organiseBtn.classList.add('active');
    motivateBtn.classList.remove('active');
    qs('organiseSection')?.classList.add('active');
    qs('motivateSection')?.classList.remove('active');
  });
  motivateBtn.addEventListener('click', ()=>{
    motivateBtn.classList.add('active');
    organiseBtn.classList.remove('active');
    qs('motivateSection')?.classList.add('active');
    qs('organiseSection')?.classList.remove('active');
  });
}

// ------------------------------
// LIVE VIDEO (demo)
let localStream = null;
let pc = null;
const rtcConfig = { iceServers:[{urls:'stun:stun.l.google.com:19302'}] };

let stream;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(s => {
    stream = s;
    document.getElementById('vid').srcObject = stream;
  })
  .catch(err => alert('Camera test failed: ' + err.name));

document.getElementById('stopBtn').addEventListener('click', () => {
  if(stream){
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('vid').srcObject = null;
    if(stream) alert('Camera is active! You can see yourself in the video window.');

  }
});


async function startLiveDemo(){
  if(!localVideo) return alert('Live components not available.');
  try{
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    localVideo.srcObject = localStream;
    pc = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(track=>pc.addTrack(track,localStream));
    pc.ontrack = evt=>{ if(remoteVideo) remoteVideo.srcObject = evt.streams[0]; };
    if(endLiveBtn) endLiveBtn.style.display='inline-block';
    addFeed('🎥 Live session started (demo).');
  }catch(err){ console.error(err); alert('Unable to start live video.'); }
}

function endLiveDemo(){
  if(localStream) localStream.getTracks().forEach(t=>t.stop());
  if(pc){ try{ pc.close(); }catch(e){} pc=null; }
  if(localVideo) localVideo.srcObject=null;
  if(remoteVideo) remoteVideo.srcObject=null;
  if(endLiveBtn) endLiveBtn.style.display='none';
  addFeed('⏹️ Live session ended.');
}

if(startLiveBtn) startLiveBtn.addEventListener('click', startLiveDemo);
if(endLiveBtn) endLiveBtn.addEventListener('click', endLiveDemo);

// ------------------------------
// Keyboard: ESC closes dialogs
window.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){
    if(taskDialog) taskDialog.setAttribute('aria-hidden','true');
    if(shareDialog) shareDialog.setAttribute('aria-hidden','true');
  }
});

// ------------------------------
// AUTOLOAD current user
(function initHeaderUser(){
  const user = loadUser();
  const navAvatar = qs('navAvatar');
  const navUsername = qs('navUsername');
  if(user){
    if(navUsername) navUsername.textContent = user.name || user.email || 'Student';
    if(navAvatar && user.avatar) navAvatar.src = user.avatar;
  }
})();
