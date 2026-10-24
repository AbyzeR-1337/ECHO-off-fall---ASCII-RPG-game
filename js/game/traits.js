'use strict';
// Мелочи, из которых складывается человек: какой рукой держит оружие, какого цвета кожа,
// что любит есть и чего не выносит. Любимое насыщает сильнее и греет душу,
// нелюбимое лезет с трудом, а иногда и обратно.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm;
  const TASTE = ['bread', 'fish_cooked', 'meat_cooked', 'berries', 'mushrooms', 'apple', 'cheese', 'stew', 'honey', 'pie', 'milk', 'kvass', 'ale'];
  Gm.giveTraits = function (P, r) {
    r = r || Math.random;
    if (P.hand == null) P.hand = r() < 0.12 ? 'L' : 'R';
    if (P.skin == null) P.skin = Math.floor(r() * 6);
    if (!P.taste) {
      const a = TASTE[Math.floor(r() * TASTE.length)];
      let b = a;
      while (b === a) b = TASTE[Math.floor(r() * TASTE.length)];
      P.taste = { love: a, hate: b };
    }
  };
  const foodName = (id) => (D.items[id] ? D.items[id].n.toLowerCase() : id);
  Gm.tasteLine = (P) => (P.taste ? 'Любимая еда: ' + foodName(P.taste.love) + '. Не выносишь: ' + foodName(P.taste.hate) + '.' : '');
  Gm.handLine = (P) => (P.hand === 'L' ? 'Левша' : 'Правша');

  const newPlayer0 = Gm.newPlayer;
  Gm.newPlayer = function () { const P = newPlayer0.apply(this, arguments); Gm.giveTraits(P); return P; };
  const load0 = E.Save.load;
  E.Save.load = function () { const r = load0.apply(this, arguments); if (r && G.P) Gm.giveTraits(G.P); return r; };

  // вкус еды
  function tasted(it, before) {
    const P = G.P, t = P.taste, b = D.items[it.b];
    if (!t || !b || !b.food) return;
    if (it.b === t.love) {
      P.hunger = Math.min(100, P.hunger + b.food * 0.5);
      Gm.fx('content', 180);
      Gm.msg('Любимое! Ешь медленно, чтобы растянуть.', '#f0d080');
      Gm.cnt('fav_food');
    } else if (it.b === t.hate) {
      P.hunger = Math.max(0, P.hunger - b.food * 0.4);
      if (Math.random() < 0.35) { Gm.fx('nausea', 90); Gm.msg('Ты с детства это не выносишь. Мутит.', '#a0c080'); }
      else Gm.msg('Еле лезет. Ты это никогда не любил[|а].', '#a0b090');
    }
  }
  for (const k of ['eat', 'drink']) {
    const f0 = Gm[k];
    if (!f0) continue;
    Gm[k] = function (it) { const b = it && it.b, h = G.P.hunger; const r = f0.apply(this, arguments); if (b) tasted({ b }, h); return r; };
  }
})(window.EOF);
