'use strict';
// Умения. k — примитив (исполняется в game/skills.js):
// strike cleave bolt blast chain heal buff debuff blink stealth summon reveal drain fear shield timestop travel transmute shadowstep execute sate
(function (E) {
  const D = E.D;
  const A = D.ab = {};
  D.mkAb = function (id, n, k, o) {
    A[id] = Object.assign({ id, n, k, p: 1, cost: 5, cd: 5, stat: 'str', d: '' }, o || {});
    return A[id];
  };
  const mk = D.mkAb;

  // Воин
  mk('w_power', 'Мощный удар', 'strike', { p: 2.0, cost: 4, cd: 3, d: 'Удар со всей силы.' });
  mk('w_cleave', 'Круговой удар', 'cleave', { p: 1.2, cost: 6, cd: 5, d: 'Бьёт всех вокруг.' });
  mk('w_cry', 'Боевой клич', 'buff', { e: 'warcry', dur: 20, cost: 6, cd: 40, d: 'Сила удара растёт.' });
  mk('w_iron', 'Несокрушимость', 'shield', { p: 3, stat: 'con', cost: 8, cd: 40, d: 'Поглощает урон.' });
  mk('w_crush', 'Сокрушение', 'strike', { p: 3.5, x: { stun: 2 }, cost: 12, cd: 12, d: 'Оглушает.' });
  // Следопыт
  mk('r_shot', 'Меткий выстрел', 'bolt', { p: 1.6, r: 8, stat: 'dex', cost: 3, cd: 2, d: 'Выстрел издалека.' });
  mk('r_sense', 'Звериное чутьё', 'reveal', { x: { mons: 1 }, r: 40, cost: 4, cd: 50, d: 'Чуешь всех живых рядом.' });
  mk('r_volley', 'Град стрел', 'blast', { p: 1.0, r: 2, range: 8, stat: 'dex', cost: 8, cd: 8, d: 'Ливень стрел.' });
  mk('r_wild', 'Дикий шаг', 'buff', { e: 'haste', dur: 25, cost: 6, cd: 50, d: 'Быстрее ветра.' });
  mk('r_wolf', 'Зов зверя', 'summon', { x: { mon: 'ally_wolf', n: 1 }, dur: 60, cost: 12, cd: 120, d: 'Зверь приходит на помощь.' });
  // Ассасин
  mk('s_back', 'Удар в спину', 'strike', { p: 2.5, stat: 'dex', x: { sneak: 2 }, cost: 4, cd: 3, d: 'Особенно смертелен, если враг не видит.' });
  mk('s_shadow', 'Тень', 'stealth', { dur: 15, cost: 6, cd: 30, d: 'Стать незаметным.' });
  mk('s_poison', 'Ядовитый клинок', 'buff', { e: 'poisonblade', dur: 30, cost: 5, cd: 40, d: 'Удары отравляют.' });
  mk('s_throw', 'Бросок ножа', 'bolt', { p: 1.8, r: 6, stat: 'dex', cost: 4, cd: 3, d: 'Нож летит точно.' });
  mk('s_step', 'Шаг сквозь тень', 'shadowstep', { p: 2.2, stat: 'dex', r: 8, cost: 10, cd: 12, d: 'Появиться за спиной врага.' });
  // Маг
  mk('m_spark', 'Искра', 'bolt', { p: 1.4, r: 8, stat: 'int', el: 'fire', cost: 3, cd: 1, d: 'Огненная искра.' });
  mk('m_frost', 'Ледяная стрела', 'bolt', { p: 1.6, r: 8, stat: 'int', el: 'ice', x: { slow: 4 }, cost: 5, cd: 3, d: 'Замедляет.' });
  mk('m_blink', 'Мерцание', 'blink', { r: 6, cost: 6, cd: 10, d: 'Мгновенный перенос.' });
  mk('m_fireball', 'Огненный шар', 'blast', { p: 2.0, r: 2, range: 8, stat: 'int', el: 'fire', cost: 12, cd: 8, d: 'Взрыв пламени.' });
  mk('m_chain', 'Цепная молния', 'chain', { p: 1.5, r: 8, n: 4, stat: 'int', el: 'storm', cost: 15, cd: 10, d: 'Молния прыгает от врага к врагу.' });
  // Жрец
  mk('p_heal', 'Исцеление', 'heal', { p: 3, stat: 'fai', flat: 10, cost: 6, cd: 5, d: 'Затягивает раны.' });
  mk('p_light', 'Свет', 'blast', { p: 1.5, r: 3, self: 1, stat: 'fai', el: 'holy', cost: 8, cd: 8, d: 'Жжёт нежить.' });
  mk('p_bless', 'Благословение', 'buff', { e: 'blessed', dur: 100, cost: 8, cd: 80, d: 'Покой и защита.' });
  mk('p_banish', 'Изгнание', 'fear', { r: 6, x: { undeadDie: 1 }, stat: 'fai', cost: 10, cd: 20, d: 'Нежить бежит или рассыпается.' });
  mk('p_ward', 'Заступничество', 'buff', { e: 'deathward', dur: 300, cost: 20, cd: 600, d: 'Отводит смерть один раз.' });
  // Алхимик
  mk('a_flask', 'Бросок колбы', 'blast', { p: 1.3, r: 1, range: 6, stat: 'int', el: 'acid', cost: 4, cd: 3, d: 'Колба разлетается брызгами.' });
  mk('a_smoke', 'Дымовая завеса', 'stealth', { dur: 10, x: { fear: 1 }, cost: 5, cd: 25, d: 'Густой дым.' });
  mk('a_trans', 'Трансмутация', 'transmute', { p: 2, cost: 10, cd: 100, d: 'Превращает вещь в золото.' });
  mk('a_elixir', 'Эликсир ярости', 'buff', { e: 'fury', dur: 25, cost: 8, cd: 60, d: 'Сила ценой защиты.' });
  mk('a_great', 'Великий опыт', 'blast', { p: 2.5, r: 3, range: 6, stat: 'int', el: 'random', cost: 16, cd: 15, d: 'Никто не знает, что получится.' });
  // Странник
  mk('t_breath', 'Второе дыхание', 'heal', { p: 0.2, pct: 1, cost: 5, cd: 30, d: 'Силы возвращаются.' });
  mk('t_luck', 'Удача путника', 'buff', { e: 'luckbuff', dur: 120, cost: 5, cd: 120, d: 'Дорога благосклонна.' });
  mk('t_flee', 'Бегство', 'blink', { r: 8, x: { away: 1 }, cost: 4, cd: 15, d: 'Прочь от опасности.' });
  mk('t_roads', 'Знание дорог', 'travel', { cost: 20, cd: 300, d: 'Путь к знакомому поселению.' });
  mk('t_other', 'Чужая тропа', 'timestop', { p: 3, cost: 15, cd: 100, d: 'Мир замирает на несколько мгновений.' });

  // Скрытые способности уровней (после 250)
  mk('x_echo', 'Эхо удара', 'strike', { p: 1.5, x: { echo: 1 }, cost: 0, cd: 7, d: 'Удар повторяется.' });
  mk('x_fore', 'Предчувствие', 'buff', { e: 'haste', dur: 10, cost: 0, cd: 60, d: 'Ты знаешь, куда ударят.' });
  mk('x_fall', 'Падение', 'blast', { p: 4, r: 4, self: 1, cost: 30, cd: 200, d: 'Мир вспоминает, как падал.' });
  mk('x_quiet', 'Тишина мира', 'timestop', { p: 5, cost: 40, cd: 500, d: 'Всё замолкает.' });
})(window.EOF);
