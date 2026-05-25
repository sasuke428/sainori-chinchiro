const DICE_VALUES = [4, 5, 6];
const OUTCOMES = [
  { type: 'triple', label: 'ゾロ目', count: 3 },
  { type: '456', label: '456', count: 6 },
  { type: '6', label: '6の目', count: 6 },
  { type: '5', label: '5の目', count: 6 },
  { type: '4', label: '4の目', count: 6 },
];
const TOTAL_PATTERNS = 27;

const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const nameAInput = document.getElementById('nameA');
const nameBInput = document.getElementById('nameB');
const labelA = document.getElementById('labelA');
const labelB = document.getElementById('labelB');
const diceEls = [document.getElementById('die1'), document.getElementById('die2'), document.getElementById('die3')];
const rollA = document.getElementById('rollA');
const rollB = document.getElementById('rollB');
const rankA = document.getElementById('rankA');
const rankB = document.getElementById('rankB');
const winnerText = document.getElementById('winnerText');
const ratioText = document.getElementById('ratioText');
const noteText = document.getElementById('noteText');
const cardA = document.getElementById('cardA');
const cardB = document.getElementById('cardB');
const oddsBox = document.getElementById('oddsBox');
const oddsGrid = document.getElementById('oddsGrid');
const oddsSummary = document.getElementById('oddsSummary');
const oddsTitle = document.getElementById('oddsTitle');
const oddsNote = document.getElementById('oddsNote');

let firstDice = null;
let firstEval = null;
let isRolling = false;

function playerAName() { return (nameAInput.value.trim() || '先攻'); }
function playerBName() { return (nameBInput.value.trim() || '後攻'); }

function syncNames() {
  labelA.textContent = playerAName();
  labelB.textContent = playerBName();
}

function randomDie() {
  return DICE_VALUES[Math.floor(Math.random() * DICE_VALUES.length)];
}

function rollDice() {
  return [randomDie(), randomDie(), randomDie()];
}

function evaluate(diceOrType) {
  if (typeof diceOrType === 'string') {
    const map = {
      triple: { power: 5, type: 'triple', label: 'ゾロ目' },
      '456': { power: 4, type: '456', label: '456' },
      '6': { power: 3, type: '6', label: '6の目' },
      '5': { power: 2, type: '5', label: '5の目' },
      '4': { power: 1, type: '4', label: '4の目' },
    };
    return map[diceOrType];
  }

  const dice = diceOrType;
  const sorted = [...dice].sort((a, b) => a - b);
  const counts = dice.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {});
  const isTriple = Object.values(counts).some(v => v === 3);
  const is456 = sorted.join('') === '456';

  if (isTriple) return { power: 5, type: 'triple', label: `ゾロ目${dice[0]}` };
  if (is456) return { power: 4, type: '456', label: '456' };

  const pairNumber = Number(Object.keys(counts).find(k => counts[k] === 2));
  const singleNumber = Number(Object.keys(counts).find(k => counts[k] === 1));
  if (pairNumber && singleNumber) {
    return { power: singleNumber - 3, type: String(singleNumber), label: `${singleNumber}の目` };
  }
  return { power: 0, type: 'none', label: '無効' };
}

function getRatio(winnerEval, loserEval) {
  if (winnerEval.power === loserEval.power) return '1:1';
  if (winnerEval.type === 'triple' && loserEval.type === '456') return '2:1';
  if (winnerEval.type === 'triple') return '99:1';
  if (winnerEval.type === '456') return '3:1';
  return '2:1';
}

function ratioForPlayers(aEval, bEval) {
  if (aEval.power === bEval.power) return { text: `${playerAName()} 1 : 1 ${playerBName()}`, winner: 'draw' };
  const aWins = aEval.power > bEval.power;
  const ratio = getRatio(aWins ? aEval : bEval, aWins ? bEval : aEval);
  const [winShare, loseShare] = ratio.split(':');
  return {
    text: `${playerAName()} ${aWins ? winShare : loseShare} : ${aWins ? loseShare : winShare} ${playerBName()}`,
    winner: aWins ? 'A' : 'B',
  };
}

function renderPips(el, value) {
  const positions = {
    4: ['p1', 'p3', 'p7', 'p9'],
    5: ['p1', 'p3', 'p5', 'p7', 'p9'],
    6: ['p1', 'p3', 'p4', 'p6', 'p7', 'p9'],
  };
  el.dataset.face = value;
  el.innerHTML = `<div class="face">${positions[value].map(pos => `<span class="pip ${pos}"></span>`).join('')}</div>`;
}

function setDiceFaces(values) {
  diceEls.forEach((el, i) => renderPips(el, values[i]));
}

function animateRoll(finalDice, label) {
  return new Promise(resolve => {
    isRolling = true;
    noteText.textContent = `${label} がサイコロを投げています…`;
    diceEls.forEach((el, i) => {
      el.classList.remove('throwing');
      void el.offsetWidth;
      el.classList.add('throwing', 'rolling');
      el.style.animationDelay = `${i * 0.08}s`;
    });

    const interval = setInterval(() => setDiceFaces(rollDice()), 90);
    setTimeout(() => {
      clearInterval(interval);
      setDiceFaces(finalDice);
      diceEls.forEach(el => {
        el.classList.remove('rolling');
        el.style.animationDelay = '0s';
      });
      isRolling = false;
      resolve();
    }, 1250);
  });
}

function formatPercent(count) {
  return `${count}/${TOTAL_PATTERNS}（${(count / TOTAL_PATTERNS * 100).toFixed(1)}%）`;
}

function renderOdds() {
  const bName = playerBName();
  oddsTitle.textContent = `${bName} が振る前の出現率・報酬比率`;

  let winCount = 0;
  let drawCount = 0;
  let loseCount = 0;

  const rows = OUTCOMES.map(outcome => {
    const bEval = evaluate(outcome.type);
    const ratio = ratioForPlayers(firstEval, bEval);
    if (bEval.power > firstEval.power) winCount += outcome.count;
    else if (bEval.power === firstEval.power) drawCount += outcome.count;
    else loseCount += outcome.count;

    const prob = formatPercent(outcome.count);
    const resultLabel = ratio.winner === 'draw' ? '引き分け' : `${ratio.winner === 'A' ? playerAName() : playerBName()}勝ち`;
    return `
      <div class="odds-item">
        <div class="odds-name">${outcome.label}</div>
        <div class="odds-prob">${prob}</div>
        <div class="odds-ratio">${resultLabel}<br>${ratio.text}</div>
      </div>
    `;
  }).join('');

  oddsSummary.innerHTML = `
    <div class="summary-item">
      <div class="summary-label">${bName}の勝つ確率</div>
      <div class="summary-value">${formatPercent(winCount)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">引き分け率</div>
      <div class="summary-value">${formatPercent(drawCount)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">${bName}の負け確率</div>
      <div class="summary-value">${formatPercent(loseCount)}</div>
    </div>
  `;
  oddsGrid.innerHTML = rows;
  oddsNote.textContent = `先攻の目は「${firstEval.label}」。勝敗確率は後攻目線、下の比率は後攻がその目を出した場合の最終的な報酬比率です。`;
  oddsBox.classList.remove('hidden');
}

async function rollFirst() {
  if (isRolling) return;
  syncNames();
  firstDice = null;
  firstEval = null;
  startBtn.disabled = true;
  nextBtn.disabled = true;
  nameAInput.disabled = true;
  nameBInput.disabled = true;
  oddsBox.classList.add('hidden');
  cardA.classList.add('active');
  cardB.classList.remove('active', 'win', 'lose');
  cardA.classList.remove('win', 'lose');
  winnerText.textContent = '先攻の勝負中…';
  ratioText.textContent = '報酬比率：-';
  rollA.textContent = '-';
  rollB.textContent = '-';
  rankA.textContent = '待機中';
  rankB.textContent = '待機中';

  firstDice = rollDice();
  await animateRoll(firstDice, playerAName());
  firstEval = evaluate(firstDice);
  rollA.textContent = firstDice.join('・');
  rankA.textContent = firstEval.label;
  winnerText.textContent = `${playerAName()} の目が確定`;
  ratioText.textContent = `先攻：${firstEval.label}`;
  noteText.textContent = `プレイヤーチェンジ後、${playerBName()} が振ります。`;
  cardA.classList.remove('active');
  cardB.classList.add('active');
  renderOdds();
  nextBtn.disabled = false;
}

async function rollSecond() {
  if (isRolling || !firstDice) return;
  nextBtn.disabled = true;
  const secondDice = rollDice();
  await animateRoll(secondDice, playerBName());
  renderResult(firstDice, secondDice);
  startBtn.textContent = 'もう一度、先攻から振る';
  startBtn.disabled = false;
}

function renderResult(aDice, bDice) {
  const aEval = evaluate(aDice);
  const bEval = evaluate(bDice);
  rollA.textContent = aDice.join('・');
  rollB.textContent = bDice.join('・');
  rankA.textContent = aEval.label;
  rankB.textContent = bEval.label;

  cardA.classList.remove('active', 'win', 'lose');
  cardB.classList.remove('active', 'win', 'lose');

  const ratio = ratioForPlayers(aEval, bEval);
  if (ratio.winner === 'draw') {
    winnerText.textContent = '引き分け';
    ratioText.textContent = `報酬比率：${ratio.text}`;
    noteText.textContent = '同じ強さの目なので1:1です。';
    return;
  }

  const aWins = ratio.winner === 'A';
  winnerText.textContent = `${aWins ? playerAName() : playerBName()} の勝ち`;
  ratioText.textContent = `報酬比率：${ratio.text}`;
  noteText.textContent = `${aWins ? aEval.label : bEval.label} が ${aWins ? bEval.label : aEval.label} に勝利。`;
  (aWins ? cardA : cardB).classList.add('win');
  (aWins ? cardB : cardA).classList.add('lose');
}

function reset() {
  firstDice = null;
  firstEval = null;
  isRolling = false;
  syncNames();
  setDiceFaces([4, 5, 6]);
  rollA.textContent = '-';
  rollB.textContent = '-';
  rankA.textContent = '待機中';
  rankB.textContent = '待機中';
  winnerText.textContent = '名前を確認して、先攻から振ってください';
  ratioText.textContent = '報酬比率：-';
  noteText.textContent = '456サイは4・5・6だけが出るサイコロです。';
  cardA.classList.add('active');
  cardB.classList.remove('active', 'win', 'lose');
  cardA.classList.remove('win', 'lose');
  oddsBox.classList.add('hidden');
  startBtn.textContent = '先攻が振る';
  startBtn.disabled = false;
  nextBtn.disabled = true;
  nameAInput.disabled = false;
  nameBInput.disabled = false;
}

nameAInput.addEventListener('input', syncNames);
nameBInput.addEventListener('input', syncNames);
startBtn.addEventListener('click', rollFirst);
nextBtn.addEventListener('click', rollSecond);
resetBtn.addEventListener('click', reset);
setDiceFaces([4, 5, 6]);
syncNames();
