// --- Helper Functions ---
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function setText(id, text) { document.getElementById(id).textContent = text; }

// --- Auth Functions ---
async function login(usernameOrEmail, password) {
  const credentials = btoa(`${usernameOrEmail}:${password}`);
  const response = await fetch('https://learn.zone01kisumu.ke/api/auth/signin', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}` }
  });
  let token;
  try {
    const data = await response.json();
    console.log('Login response:', data); // Log the response for debugging
    if (typeof data === 'string') {
      token = data;
    } else if (data.token) {
      token = data.token;
    } else if (data.jwt) {
      token = data.jwt;
    } else if (data.access_token) {
      token = data.access_token;
    } else {
      throw new Error('No JWT found in response');
    }
  } catch (e) {
    throw new Error('Invalid response from server');
  }
  if (!token || token.split('.').length !== 3) {
    throw new Error('Invalid JWT received');
  }
  localStorage.setItem('jwt', token);
  return token;
}
function logout() {
  localStorage.removeItem('jwt');
  location.reload();
}
function getJWT() {
  return localStorage.getItem('jwt');
}

// --- GraphQL Query Function ---
async function graphqlQuery(query, variables = {}) {
  const token = getJWT();
  const response = await fetch('https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

// --- UI Logic ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  setText('login-error', '');
  try {
    await login(username, password);
    await loadStats();
  } catch (err) {
    setText('login-error', err.message);
  }
});
document.getElementById('logout-btn').addEventListener('click', logout);

async function loadStats() {
  hide('login-section');
  show('stats-section');
  try {
    // 1. Get user info (id, login)
    const userData = await graphqlQuery(`{
      user { id login }
    }`);
    const user = userData.user[0];
    const userId = user.id;
    // 2. Get total XP and audits done for this user only
    const statsData = await graphqlQuery(`{
      xp: transaction_aggregate(where: {userId: {_eq: ${userId}}, type: {_eq: "xp"}}) { aggregate { sum { amount } } }
      audits_done: transaction_aggregate(where: {userId: {_eq: ${userId}}, type: {_eq: "up"}}) { aggregate { count } }
    }`);
    // Set profile info
    setText('profile-login', user.login);
    // Convert XP to MB
    const totalXP = statsData.xp.aggregate.sum.amount || 0;
    const totalXP_MB = (totalXP / 1000000).toFixed(1);
    setText('profile-xp', `${totalXP_MB} MB`);
    setText('profile-audits', statsData.audits_done.aggregate.count || 0);
    // 3. XP over time
    await drawXPGraph(userId);
    // 4. XP by project
    await drawXPByProjectGraph(userId);
    // 5. Audit ratio
    await drawAuditGraph(userId);
  } catch (err) {
    alert('Error loading stats: ' + err.message);
    logout();
  }
}

// --- SVG Graphs ---
// 1. XP over time
async function drawXPGraph(userId) {
  const xpData = await graphqlQuery(`{
    transaction(where: {userId: {_eq: ${userId}}, type: {_eq: "xp"}}, order_by: {createdAt: asc}) {
      amount
      createdAt
    }
  }`);
  const txs = xpData.transaction;
  const xpByDate = {};
  txs.forEach(tx => {
    const date = tx.createdAt.slice(0, 10);
    xpByDate[date] = (xpByDate[date] || 0) + tx.amount;
  });
  let cumXP = 0;
  const points = Object.entries(xpByDate).map(([date, amt]) => {
    cumXP += amt;
    return { date, xp: cumXP };
  });
  const w = 500, h = 180, pad = 40;
  const svg = document.getElementById('xp-graph');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  if (points.length < 2) {
    svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#888" font-size="18">Not enough data</text>';
    return;
  }
  const maxXP = Math.max(...points.map(p => p.xp));
  const xStep = (w - 2*pad) / (points.length - 1);
  svg.innerHTML += `<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#bbb" />`;
  svg.innerHTML += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" stroke="#bbb" />`;
  let path = '';
  points.forEach((p, i) => {
    const x = pad + i * xStep;
    const y = h - pad - (p.xp / maxXP) * (h - 2*pad);
    path += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
  });
  svg.innerHTML += `<path d="${path}" fill="none" stroke="#0077ff" stroke-width="3" />`;
  points.forEach((p, i) => {
    const x = pad + i * xStep;
    const y = h - pad - (p.xp / maxXP) * (h - 2*pad);
    svg.innerHTML += `<circle cx="${x}" cy="${y}" r="4" fill="#0077ff" />`;
  });
  svg.innerHTML += `<text x="${pad}" y="${pad-10}" font-size="12">XP</text>`;
  svg.innerHTML += `<text x="${w-pad}" y="${h-10}" font-size="12" text-anchor="end">Date</text>`;
}

// 2. XP by project
async function drawXPByProjectGraph(userId) {
  // Get all XP transactions with project info
  const xpData = await graphqlQuery(`{
    transaction(where: {userId: {_eq: ${userId}}, type: {_eq: "xp"}}) {
      amount
      objectId
      path
    }
    object { id name type }
  }`);
  const txs = xpData.transaction;
  const objects = xpData.object;
  // Group by project (objectId or path)
  const xpByProject = {};
  txs.forEach(tx => {
    // Try to get project name from object table
    let projectName = tx.path;
    if (tx.objectId && objects) {
      const obj = objects.find(o => o.id === tx.objectId);
      if (obj && obj.name) projectName = obj.name;
    }
    xpByProject[projectName] = (xpByProject[projectName] || 0) + tx.amount;
  });
  // Sort by XP descending, take top 10
  const sorted = Object.entries(xpByProject).sort((a,b) => b[1]-a[1]).slice(0,10);
  const w = 500, h = 220, pad = 60, barW = 30;
  const svg = document.getElementById('xp-project-graph');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  if (sorted.length === 0) {
    svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#888" font-size="18">No data</text>';
    return;
  }
  const maxXP = Math.max(...sorted.map(x => x[1]));
  sorted.forEach(([name, xp], i) => {
    const x = pad + i * (barW + 20);
    const barH = (xp / maxXP) * (h - 2*pad);
    // XP in KB
    const xpKB = (xp / 1000).toFixed(1);
    svg.innerHTML += `<rect x="${x}" y="${h-pad-barH}" width="${barW}" height="${barH}" fill="#0077ff" />`;
    svg.innerHTML += `<text x="${x+barW/2}" y="${h-pad-barH-8}" text-anchor="middle" font-size="11">${xpKB} KB</text>`;
    svg.innerHTML += `<text x="${x+barW/2}" y="${h-pad+15}" text-anchor="middle" font-size="10" transform="rotate(30,${x+barW/2},${h-pad+15})">${name.split('/').pop().slice(0,12)}</text>`;
  });
  svg.innerHTML += `<text x="${pad-30}" y="${pad-20}" font-size="12">XP (KB)</text>`;
}

// 3. Audit ratio
async function drawAuditGraph(userId) {
  // up = audits done, down = audits received
  const auditData = await graphqlQuery(`{
    audits_done: transaction_aggregate(where: {userId: {_eq: ${userId}}, type: {_eq: "up"}}) { aggregate { count } }
    audits_received: transaction_aggregate(where: {userId: {_eq: ${userId}}, type: {_eq: "down"}}) { aggregate { count } }
  }`);
  const done = auditData.audits_done.aggregate.count;
  const received = auditData.audits_received.aggregate.count;
  // Pie chart
  const w = 300, h = 180, r = 70, cx = w/2, cy = h/2;
  const svg = document.getElementById('audit-graph');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const total = done + received;
  if (total === 0) {
    svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#888" font-size="18">No data</text>';
    return;
  }
  const doneAngle = (done / total) * 2 * Math.PI;
  const receivedAngle = (received / total) * 2 * Math.PI;
  // Pie slices
  function describeArc(cx, cy, r, startAngle, endAngle) {
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
  }
  svg.innerHTML += `<path d="${describeArc(cx, cy, r, 0, doneAngle)}" fill="#4caf50" />`;
  svg.innerHTML += `<path d="${describeArc(cx, cy, r, doneAngle, doneAngle+receivedAngle)}" fill="#ff9800" />`;
  // Labels
  svg.innerHTML += `<rect x="${cx-40}" y="${h-30}" width="12" height="12" fill="#4caf50" /><text x="${cx-24}" y="${h-20}" font-size="12">Done: ${done}</text>`;
  svg.innerHTML += `<rect x="${cx+30}" y="${h-30}" width="12" height="12" fill="#ff9800" /><text x="${cx+46}" y="${h-20}" font-size="12">Received: ${received}</text>`;
}

// --- On Load ---
(async function() {
  if (getJWT()) {
    try {
      await loadStats();
    } catch {
      logout();
    }
  }
})(); 