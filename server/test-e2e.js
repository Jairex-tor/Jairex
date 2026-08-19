const BASE = process.env.API_BASE || 'http://localhost:5001';

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`, extra ?? '');
  }
}

const uniq = () => `t${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function req(method, path, { body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function run() {
  const u1 = uniq();
  const u2 = uniq();

  // Register
  let r = await req('POST', '/api/auth/register', { body: { username: u1, email: `${u1}@test.com`, password: 'secret123' } });
  check('register user1', r.status === 201 && r.data.token);
  const token1 = r.data.token;

  r = await req('POST', '/api/auth/register', { body: { username: u2, email: `${u2}@test.com`, password: 'secret123' } });
  check('register user2', r.status === 201 && r.data.token);
  const token2 = r.data.token;

  // Login returns level + streak XP
  r = await req('POST', '/api/auth/login', { body: { email: `${u1}@test.com`, password: 'secret123' } });
  check('login user1 gains xp', r.data.user.level >= 1 && r.data.user.xp >= 5, r.data.user.xp);

  // Create couple
  r = await req('POST', '/api/auth/couple/create', { token: token1 });
  check('create couple', r.status === 201 && r.data.couple.inviteCode);
  const inviteCode = r.data.couple.inviteCode;

  // Join couple
  r = await req('POST', '/api/auth/couple/join', { token: token2, body: { inviteCode } });
  check('join couple', r.status === 200 && r.data.couple.partner2);

  // Get couple shows partner
  r = await req('GET', '/api/auth/couple', { token: token1 });
  check('couple partner exposed', r.data.couple.partner && r.data.couple.partner.username);

  // Create goal
  r = await req('POST', '/api/savings/goal', { token: token1, body: { goalName: 'Test Goal', targetAmount: 500, timesPerWeek: 2, amountPerDeposit: 50 } });
  check('create goal', r.status === 201 && r.data.goal._id);
  const goalId = r.data.goal._id;

  // Deposit
  r = await req('POST', `/api/savings/goal/${goalId}/deposit`, { token: token1, body: { amount: 100, note: 'first' } });
  check('deposit', r.status === 200 && r.data.goal.currentAmount === 100);
  check('goal completion date set', !!r.data.goal.estimatedCompletionDate);

  // Clear goal
  r = await req('POST', `/api/savings/goal/${goalId}/clear`, { token: token1 });
  check('clear goal', r.status === 200 && r.data.goal.currentAmount === 0);

  // Re-deposit
  r = await req('POST', `/api/savings/goal/${goalId}/deposit`, { token: token1, body: { amount: 100 } });
  check('re-deposit', r.data.goal.currentAmount === 100);

  // Create post
  const form = new FormData();
  form.append('text', 'We saved our first $100! 💎');
  const postRes = await fetch(BASE + '/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: form,
  });
  const postData = await postRes.json();
  check('create post', postRes.status === 201 && postData.post && postData.post._id, JSON.stringify({ status: postRes.status, body: postData }));
  if (!postData.post) process.exit(1);
  const postId = postData.post._id;

  // Get posts
  r = await req('GET', '/api/posts', { token: token1 });
  check('get posts', r.data.posts.length >= 1);

  // React to post
  r = await req('POST', `/api/posts/${postId}/react`, { token: token2, body: { type: 'diamond' } });
  check('react to post', r.status === 200 && r.data.reactions.length === 1);
  check('reaction user populated', r.data.reactions[0].user && r.data.reactions[0].user.username);

  // Comment
  r = await req('POST', `/api/posts/${postId}/comment`, { token: token2, body: { text: 'Nice work!' } });
  check('comment on post', r.status === 200 && r.data.comments.length === 1);

  // Chat via REST
  r = await req('GET', '/api/auth/couple', { token: token1 });
  const partner2Id = r.data.couple.partner._id;

  r = await req('POST', '/api/chat', { token: token1, body: { recipient: partner2Id, text: 'hello partner', type: 'text' } });
  check('chat message saved', r.status === 201 && r.data.message._id);

  r = await req('GET', `/api/chat/messages/${partner2Id}`, { token: token1 });
  check('chat history', r.data.messages.length >= 1);

  // Profile stats + achievements
  r = await req('GET', '/api/users/profile', { token: token1 });
  const prof = r.data.user;
  check('profile has stats', prof.stats && prof.stats.totalSaved === 100);
  check('profile totalDeposits', prof.stats.totalDeposits === 1);
  check('first_deposit achievement', prof.achievements.includes('first_deposit'));
  check('goal_setter achievement', prof.achievements.includes('goal_setter'));
  check('hundred_club achievement', prof.achievements.includes('hundred_club'));
  check('level in profile', prof.level >= 1);
  check('xp gained', prof.xp >= 5 + 15 + 20 + 10, prof.xp);

  // Notifications
  r = await req('GET', '/api/notifications', { token: token1 });
  check('notifications endpoint', r.status === 200 && Array.isArray(r.data.notifications));

  // Update profile
  r = await req('PUT', '/api/users/profile', { token: token1, body: { avatar: '🦊' } });
  check('update profile', r.data.user.avatar === '🦊');

  // Password change
  r = await req('PUT', '/api/users/password', { token: token1, body: { currentPassword: 'secret123', newPassword: 'newsecret456' } });
  check('change password', r.status === 200);

  // Old password rejected
  r = await req('POST', '/api/auth/login', { body: { email: `${u1}@test.com`, password: 'secret123' } });
  check('old password rejected', r.status === 400);

  // Export
  r = await req('GET', '/api/users/export', { token: token1 });
  check('export data', r.data.user && r.data.goals && r.data.posts);

  // Delete post
  r = await req('DELETE', `/api/posts/${postId}`, { token: token1 });
  check('delete post', r.status === 200);

  // Disconnect couple
  r = await req('POST', '/api/auth/couple/disconnect', { token: token1 });
  check('disconnect couple', r.status === 200);

  // Delete account
  r = await req('DELETE', '/api/users/account', { token: token2 });
  check('delete account', r.status === 200);

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('FATAL:', err.response?.data || err.message);
  process.exit(1);
});