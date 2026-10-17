// ---------------------------------------------------------------------------
// game/riftlore.js — 0.9.0.10: what the villagers make of it.
//
// Nobody tells you the whole story. Before the rift, a few folk have noticed
// a figure at the edge of things, if you ask whether they've seen anything
// strange. Once it tears open, everyone has something to say, and what they
// say changes as the story moves on: shock when it opens, unease as the
// fragments come back and the boundary thins, dread at the end, and quiet
// (not quite settled) once it's sealed. Ask about it and each villager may
// let slip a detail you haven't heard: the farmer about the wheat, the
// librarian about the oldest books, the cartographer about the maps that
// show one village too many. When someone has nothing new they may point
// you toward someone who does. Their greetings and their news change too.
// ---------------------------------------------------------------------------

// t: the point in the story it belongs to (0 watched · 1 opened · 2 thinning · 3 paper-thin · 4 the gateway · 5 sealed)
const RIFT_LORE = [
  { id: 'w1', t: 0, jobs: ['farmer', 'shepherd', 'none'], text: 'Funny you should ask. There\'s a man stands at the edge of the north field some evenings. Doesn\'t move. When I wave, he isn\'t there.' },
  { id: 'w2', t: 0, jobs: ['guard'], text: 'Third time this month someone\'s seen a figure up on the ridge. White eyes, they say. I tell them it\'s the moon in a puddle.' },
  { id: 'w3', upto: 5, t: 0, jobs: ['librarian', 'elder'], text: 'There\'s a story older than the village: a builder who worked alone in the dark, before anyone came. Some say he still looks in on what he made.' },
  { id: 'w4', t: 0, jobs: ['any'], text: 'The dogs won\'t go past the old oak after dark. Won\'t even look at it.' },
  { id: 'w5', t: 0, jobs: ['cartographer', 'fisherman'], text: 'I mapped a little pillar of sand out on the shore. Next morning there was a torch on top of it. Nobody here makes torches like that.' },
  { id: 'r1', t: 1, upto: 1, jobs: ['any'], text: 'It opened with a sound like someone tearing a sheet, right in the square. Nothing came out. Nothing\'s come out yet.' },
  { id: 'r2', t: 1, jobs: ['farmer'], text: 'The wheat nearest the square all leans toward it now. Every stalk. Like it\'s listening.' },
  { id: 'r3', t: 1, jobs: ['cleric'], text: 'I lit candles around it, to bless it. The flames burned purple. And they leaned in.' },
  { id: 'r4', t: 1, jobs: ['guard'], text: 'I stood watch by it for an hour. Through it you see halls, all purple, going on and on. And very far off, something walking.' },
  { id: 'r5', t: 1, jobs: ['librarian'], text: 'I\'ve been through every book we have. One word keeps turning up in the oldest, beside drawings of a door in the air: incursion.' },
  { id: 'r6', t: 1, jobs: ['innkeeper', 'baker', 'merchant'], text: 'Trade\'s dried up. Folk from the other villages won\'t come within sight of it. Can\'t say I blame them.' },
  { id: 'r7', t: 1, jobs: ['elder', 'librarian', 'cartographer'], text: 'It opened the very week you first came to {v}. I\'m not saying it\'s your doing. I\'m saying it noticed you.' },
  { id: 'r8', t: 1, jobs: ['mason', 'toolsmith'], text: 'The paving round it\'s gone warm. Not hot. Warm, like something\'s been sitting on it.' },
  { id: 'f1', t: 2, jobs: ['any'], text: 'Someone keeps opening doors at night. Not breaking in. Just opening them, and leaving them open.' },
  { id: 'f2', t: 2, jobs: ['innkeeper', 'merchant', 'none'], text: 'I saw you up on the hill last night, standing very still. Except you were here, by my fire, the whole night. Weren\'t you?' },
  { id: 'f3', t: 2, jobs: ['librarian'], text: 'The keepers in the deep places weren\'t guarding treasure. The oldest pages say they were put there to hold something shut. And you\'ve been… well.' },
  { id: 'f4', t: 2, jobs: ['cartographer'], text: 'Look at this map. That\'s {v}. And that, just beside it, is {v} again. I didn\'t draw the second one.' },
  { id: 'f5', t: 2, jobs: ['cleric', 'elder'], text: 'He never hurts anyone. Have you noticed? He only watches. That frightens me more than claws would.' },
  { id: 'f6', t: 2, jobs: ['guard', 'weaponsmith'], text: 'Put your ear near the rift. Not too near. You\'ll hear footsteps, a long way off. They stop when you stop.' },
  { id: 'f7', t: 2, jobs: ['mason', 'toolsmith', 'armorer'], text: 'His side looks like ours. The stone, the trees. But wrong. Like a copy made by someone who\'d only ever been told about the world.' },
  { id: 'f8', t: 2, jobs: ['shepherd', 'fisherman', 'fletcher'], text: 'Every time you bring one of those shards back, the rift goes quieter. And everything else gets louder.' },
  { id: 'd1', t: 3, jobs: ['any'], text: 'I counted the houses this morning. Then again at noon. There was one more at noon.' },
  { id: 'd2', t: 3, jobs: ['farmer', 'shepherd'], text: 'The sheep all face the square at night now. Every one. And they don\'t blink.' },
  { id: 'd3', upto: 5, t: 3, jobs: ['librarian', 'elder'], text: 'There\'s a name worn into the stone under the old bridge, almost smooth. It begins with an H. My grandfather would never say the rest.' },
  { id: 'd4', t: 3, jobs: ['cleric', 'baker'], text: 'Time stopped for me yesterday. Just for a breath. A man stood right where you\'re standing. His eyes had nothing in them. Then the bread fell off the table and he was gone.' },
  { id: 'd5', upto: 5, t: 3, jobs: ['jeweller', 'librarian'], text: 'In the old tongue, "brine" is the bitter sea. Salt that stings the eyes. I\'ve wondered why anyone would choose that for a name.' },
  { id: 'd6', t: 3, jobs: ['guard', 'elder', 'weaponsmith'], text: 'He isn\'t trying to get out. Think about it. Every door he opens, he leaves open. He wants someone to come in.' },
  { id: 'd7', t: 3, jobs: ['cartographer', 'merchant'], text: 'My compass points at the square now. Not north. The square.' },
  { id: 'g1', t: 4, jobs: ['any'], text: 'The gate hums like a held breath. The children dream about it. They all dream the same hallway.' },
  { id: 'g2', upto: 5, t: 4, jobs: ['librarian', 'elder'], text: 'If the old pages are right, the realm beyond is his own world, the first one he built alone. Grown huge. Gone wrong. Like a garden nobody has tended for a thousand years.' },
  { id: 'g3', t: 4, jobs: ['guard', 'weaponsmith', 'armorer'], text: 'Take your best steel. Take your friends. And don\'t look him in the eye any longer than you have to.' },
  { id: 'g4', t: 4, jobs: ['cleric', 'innkeeper', 'baker'], text: 'Take something warm in with you. Food. A light. They say time runs wrong in there, and the cold gets in.' },
  { id: 's1', t: 5, jobs: ['any'], text: 'The nights are quiet again. My wife says too quiet. I think she misses being afraid.' },
  { id: 's2', t: 5, jobs: ['librarian', 'elder'], text: 'I keep wondering whether he was ever wicked. Or only alone for far too long, watching other people build.' },
  { id: 's3', t: 5, jobs: ['cartographer'], text: 'The second {v} is gone from my maps. Mostly. Sometimes, at the very edge of the paper, there\'s a smudge I didn\'t make.' },
  { id: 's4', t: 5, jobs: ['farmer', 'shepherd', 'none', 'cleric'], text: 'I still dream of the purple halls. Do you? I walk them, and at the end there\'s a chair. Empty. Still warm.' },
];
const RIFT_REACT = {
  0: ['Strange? No more than usual. Why — what have you seen?', 'Keep a lamp lit and you\'ll be fine. That\'s what my mother said.', 'Strange? Only the weather.'],
  1: ['I don\'t go near the square any more.', 'The elder knows more than I do.', 'Stay away from it. That\'s all I know.', 'Don\'t stare at it. It feels like it stares back.'],
  2: ['I\'ve told you what I know. I\'d rather not think about it.', 'Every time you come back from the deep places, the air gets heavier. Have you noticed?', 'Please. Just make it stop.'],
  3: ['Don\'t ask me again. He might be listening.', '…', 'Did you hear that? No. Never mind.', 'Not here. Not out loud.'],
  4: ['Go, if you\'re going. Waiting makes it worse.', 'We\'ll keep a light in the window for you.', 'Come back. Promise me you\'ll come back.'],
  5: ['It\'s over. Let\'s leave it over.', 'Thank you. Truly. I sleep again.', 'Some nights I still check the square. Habit.'],
};
// how they greet you, and what passes for news, as it goes on
const RIFT_GREET = {
  1: ['Oh — it\'s you. Have you been to the square?', 'Stay near the lamps tonight.', 'Did you hear it, when it opened?'],
  2: ['You look tired. We all are.', 'Back from the deep places? Was it worth it?', 'Shut the door behind you. Please.'],
  3: ['Is that really you?', 'Quickly, in. Before it gets dark.', 'Don\'t look at the square. Just don\'t.'],
  4: ['So it\'s a door now.', 'You\'re going in, aren\'t you.'],
  5: ['There\'s our hero!', 'The square\'s just a square again. Can you believe it?'],
};
const RIFT_NEWS = {
  1: ['The miller\'s boy swears the rift whispered his name.', 'Nobody\'s drawn water from the square well since it opened.', 'The guards drew lots for who watches it at night.'],
  2: ['Old Hattie left her door open last night. She says she didn\'t.', 'The candles in the chapel keep going out, all at once.', 'Someone saw lights in the empty house by the field.'],
  3: ['Three people saw the same man in three places, at the same moment.', 'The bell rang last night. Nobody rang it.', 'The cats are gone. All of them.'],
  4: ['They say the gate hums louder at night.', 'Half the village slept in the hall last night, all together.'],
  5: ['They\'re talking about a feast. For you.', 'The square well is sweet again.', 'The children don\'t dream of the hallway any more. Mostly.'],
};
// a clue still rings true now? (what was said while it was open sounds wrong once it's sealed)
function riftClueFits(c, tier) { return c.t <= tier && tier <= (c.upto ?? (c.t === 5 ? 5 : 4)); }
function riftTier(g) {
  const R = typeof riftOf === 'function' ? riftOf(g) : (g.meta && g.meta.rift) || {};
  if (R.sealed) return 5;
  if (R.stage >= 3) return 4;
  if (R.stage >= 1) { const f = R.frags || 0; return f >= 3 ? 3 : f >= 1 ? 2 : 1; }
  return (g.meta && g.meta.flags && g.meta.flags.watcherSeen) ? 0 : -1;
}
{
  const jobsIn = (v) => { const s = new Set(['guard']); if (v && v.folk) for (const f of v.folk) s.add(f.job); return s; };
  NpcTalk.prototype.riftAsk = function () {
    const g = this.g, lp = this.lp, tier = riftTier(g), S = lp.player.stats || (lp.player.stats = {}), heard = S.riftClues || (S.riftClues = {});
    const job = this.job;
    // something new from this one? the latest part of the story first
    const mine = RIFT_LORE.filter(c => riftClueFits(c, tier) && !heard[c.id] && (c.jobs.includes(job) || c.jobs.includes('any'))).sort((a, b) => b.t - a.t || (b.jobs.includes(job) ? 1 : 0) - (a.jobs.includes(job) ? 1 : 0));
    // (an old clue only once you've caught up on the new ones, and never more than one each time you ask)
    const c = mine.find(x => x.t === tier) || mine[0];
    if (c) {
      heard[c.id] = 1; S.riftCluesN = Object.keys(heard).length;
      this.home(c.text);
      lp.toast(tier >= 1 ? 'You learn something about the rift…' : 'You hear something strange…', 'rare');
      g.sfx.play(tier >= 2 ? 'rift_whisper' : 'click');
      return;
    }
    // nothing new: a feeling, and perhaps someone else to ask
    const here = jobsIn(this.v);
    const others = RIFT_LORE.filter(x => riftClueFits(x, tier) && !heard[x.id] && !x.jobs.includes('any') && x.jobs.some(j => j !== job && here.has(j)));
    const list = RIFT_REACT[Math.max(0, tier)] || RIFT_REACT[1];
    let line = list[Math.floor(Math.random() * list.length)];
    if (others.length && Math.random() < 0.7) {
      const o = others[Math.floor(Math.random() * others.length)], j = o.jobs.find(x => x !== job && here.has(x)), title = (NPC_JOBS[j] || NPC_JOBS.none).title.toLowerCase();
      line += ` ${['You could ask the', 'Talk to the', 'The'][Math.floor(Math.random() * 3)]} ${title}${[' — they\'ve been muttering about it.', '. They saw more than I did.', ' won\'t stop talking about it.'][Math.floor(Math.random() * 3)]}`;
    }
    this.home(line);
  };
  const baseHome = NpcTalk.prototype.home;
  NpcTalk.prototype.home = function (text) {
    const g = this.g, tier = riftTier(g);
    // their greeting carries it
    let greet = false;
    if (!text && tier >= 1 && Math.random() < 0.45 && this.stand().k > 0) { const L = RIFT_GREET[tier]; if (L) { text = L[Math.floor(Math.random() * L.length)]; greet = true; } }
    this._greetLine = greet;
    try { baseHome.call(this, text); } finally { this._greetLine = false; }
    if (tier < 0) return;
    const o = this.el.querySelector('.nt-opts'); if (!o) return;
    const label = tier === 0 ? 'Seen anything strange lately?' : tier >= 5 ? 'About what happened…' : 'What do you make of the rift?';
    const b = document.createElement('button'); b.className = 'btn nt-opt';
    b.innerHTML = `<i>?</i>${label}`;
    b.onclick = () => { g.sfx.play('click'); this.riftAsk(); };
    o.insertBefore(b, o.lastChild);
    // the number keys follow the buttons as they now stand
    o.querySelectorAll('.nt-opt').forEach((x, i) => { const n = x.querySelector('i'); if (n && /^\d+$/.test(n.textContent)) n.textContent = i + 1; });
    if (this.mark) this.mark();
  };
  // the news, too
  const baseNews = NpcTalk.prototype.news;
  NpcTalk.prototype.news = function () {
    const tier = riftTier(this.g), L = RIFT_NEWS[tier];
    if (L && Math.random() < 0.55) { this.home(L[Math.floor(Math.random() * L.length)]); return; }
    return baseNews.call(this);
  };
}

// When you first walk into the village after the story has moved on, someone calls out to you.
const RIFT_CALL = {
  1: ['Thank goodness — you\'re back! Have you seen what\'s in the square?', 'You! It opened! Right there, in the square!', 'Did you hear it? It sounded like the sky tearing.'],
  2: ['You\'re back from the deep places. Something followed you home. I can feel it.', 'Don\'t go to the square tonight. Please.'],
  3: ['It\'s worse. Every night it\'s worse.', 'Is it really you? Say something. Say my name.'],
  4: ['The gate! It\'s a gate now! You did that, didn\'t you?'],
  5: ['It\'s gone quiet! The rift — it\'s really gone!', 'Hooray! Hooray for {p}!'],
};
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp), g = this.g;
    if ((this._rcallT = (this._rcallT || 0) - dt) > 0 || g.dim !== 0 || this.mode !== 'play') return r;
    this._rcallT = 2;
    const tier = riftTier(g); if (tier < 1) return r;
    const p = this.player, S = p.stats || (p.stats = {}), done = S.riftCalls || (S.riftCalls = {});
    const v = villageAtPos(g, p.x, p.z, 4); if (!v) return r;
    const key = v.id + ':' + tier; if (done[key]) return r;
    let best = null, bd = 13;
    for (const e of g.entities) if (e.npc && e.alive && e.npc.v === v.id && e.npc.j !== 'golem') { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } }
    if (!best) return r;
    done[key] = 1;
    const L = RIFT_CALL[tier], line = L[Math.floor(Math.random() * L.length)].replace('{p}', this.name || 'friend');
    this.toast(`${best.npc.n}: “${line}”`, tier >= 5 ? 'good' : tier >= 3 ? 'warn' : '');
    if (typeof babble === 'function') babble(g.sfx, line, npcVoice(best.npc.s), { vol: 0.5, max: 14 });
    return r;
  };
}
