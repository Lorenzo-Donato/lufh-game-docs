/**
 * UI Diagnostics, Event Logger & Sequence Studio Manager
 */

function updateHsmUi(superState, subState) {
  const currentTag = document.getElementById('currentStateTag');
  if (currentTag) currentTag.innerText = `${superState} :: ${subState}`;

  ['GROUNDED', 'AIRBORNE', 'WALL_SLIDE', 'HURT', 'DEATH'].forEach(s => {
    const el = document.getElementById(`super_${s}`);
    if (el) el.classList.toggle('active', s === superState);
  });

  const allPills = document.querySelectorAll('.state-pill');
  allPills.forEach(p => {
    p.classList.toggle('active', p.id === `state_${subState}`);
  });
}

function updateStatsUi(player) {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setTxt('stat_vx', player.vx.toFixed(2));
  setTxt('stat_vy', player.vy.toFixed(2));
  setTxt('stat_ground', player.isGrounded ? 'TRUE' : 'FALSE');
  setTxt('stat_wall', player.wallSide ? player.wallSide.toUpperCase() : 'NONE');
  setTxt('stat_dash', `${Math.max(0, player.dashTimer).toFixed(2)}s`);
  setTxt('stat_charge', `${Math.min(100, (player.chargeTime / 1.5 * 100)).toFixed(0)}%`);
  
  const hpEl = document.getElementById('stat_hp');
  if (hpEl) {
    hpEl.innerText = `${player.hp}/${PHYS.MAX_HP}`;
    hpEl.style.color = player.hp > 1 ? '#00ffaa' : '#ff2a5f';
  }

  setTxt('stat_invincible', player.isInvincible ? 'YES' : 'NO');

  const standEl = document.getElementById('stat_standup');
  if (standEl) {
    standEl.innerText = player.canStandUp ? 'TRUE' : 'FALSE';
    standEl.style.color = player.canStandUp ? '#00ffaa' : '#f59e0b';
  }

  const chargeInd = document.getElementById('ui-charge-indicator');
  const chargeTitle = document.getElementById('ui-charge-title');
  if (chargeInd && chargeTitle) {
    chargeInd.classList.remove('idle', 'charging', 'ready');
    if (player.chargeTime === 0) {
      chargeInd.classList.add('idle');
      chargeTitle.innerText = 'CHARGE (Segurar J/X) — Inativo';
    } else if (player.chargeTime < 0.8) {
      chargeInd.classList.add('charging');
      chargeTitle.innerText = 'CARREGANDO... (Ortogonal)';
    } else {
      chargeInd.classList.add('ready');
      chargeTitle.innerText = 'CARREGADO! (Solte para Atacar)';
    }
  }

  const roomEl = document.getElementById('stat_room');
  if (roomEl) {
    roomEl.innerText = player.getCurrentRoom().split(' ')[0] + ' ' + player.getCurrentRoom().split(' ')[1];
  }
}

function logEvent(msg, type = '') {
  const log = document.getElementById('eventLog');
  if (!log) return;
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const time = new Date().toLocaleTimeString().split(' ')[0];
  entry.innerHTML = `<span>${msg}</span><span style="color:#64748b;">${time}</span>`;
  log.prepend(entry);

  while (log.children.length > 30) {
    log.removeChild(log.lastChild);
  }
}

let currentFilter = 'all';

function renderSequenceStudio() {
  const grid = document.getElementById('sequencesGrid');
  if (!grid || typeof SPRITE_CATALOG === 'undefined') return;
  grid.innerHTML = '';

  const filtered = SPRITE_CATALOG.filter(s => {
    if (currentFilter === 'all') return true;
    return s.cat === currentFilter;
  });

  filtered.forEach(seq => {
    const card = document.createElement('div');
    card.className = `seq-card ${(typeof player !== 'undefined' && player.currentSeqId === seq.id) ? 'active-preview' : ''}`;
    card.id = `card_${seq.id}`;

    card.innerHTML = `
      <div class="seq-header">
        <span class="seq-id">${seq.id}</span>
        <span class="seq-cat">${seq.cat}</span>
      </div>
      <div class="seq-title">${seq.label}</div>
      <div class="seq-preview-row">
        <img src="${seq.gif}" alt="${seq.label}" />
      </div>
      <div class="seq-footer">
        <span>${seq.frames.length} frames (${seq.fps} FPS)</span>
        <button class="btn-test-seq" onclick="testSequence('${seq.id}', event)">Testar no Zero</button>
      </div>
    `;

    card.onclick = () => testSequence(seq.id);
    grid.appendChild(card);
  });
}

function testSequence(seqId, e) {
  if (e) e.stopPropagation();
  if (typeof player !== 'undefined') player.playSequence(seqId);
  logEvent(`Testando sequência: ${seqId}`, 'state-trans');

  document.querySelectorAll('.seq-card').forEach(c => c.classList.remove('active-preview'));
  const activeCard = document.getElementById(`card_${seqId}`);
  if (activeCard) activeCard.classList.add('active-preview');
}

function filterSequences(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.innerText.includes(cat) || (cat === 'all' && b.innerText.includes('Todas')));
  });
  renderSequenceStudio();
}

function switchView(tab) {
  document.getElementById('btnTabSandbox').classList.toggle('active', tab === 'sandbox');
  document.getElementById('btnTabStudio').classList.toggle('active', tab === 'studio');

  if (tab === 'sandbox') {
    document.getElementById('panelSandbox').scrollIntoView({ behavior: 'smooth' });
  } else {
    document.getElementById('panelStudio').scrollIntoView({ behavior: 'smooth' });
  }
}

if (typeof module !== 'undefined') {
  module.exports = { updateHsmUi, updateStatsUi, logEvent, renderSequenceStudio, testSequence, filterSequences, switchView };
}
