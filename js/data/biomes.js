'use strict';
// Биомы мира и измерений.
(function (E) {
  const D = E.D = E.D || {};
  // g — символ на карте мира, c — цвет; nk — тип имени; dg — надбавка опасности; cold — холод
  D.biomes = {
    ocean:    { n: 'Открытое море', g: '≈', c: '#3a6aa8', nk: 'ocean', dg: 2, water: 1 },
    coast:    { n: 'Побережье', g: '~', c: '#7ab0d8', nk: 'coast', dg: 0 },
    plains:   { n: 'Равнины', g: '.', c: '#7da24c', nk: 'plains', dg: 0 },
    forest:   { n: 'Лес', g: '♣', c: '#3e8b34', nk: 'forest', dg: 1 },
    ancient:  { n: 'Исполинский лес', g: '♣', c: '#7a5a2a', nk: 'ancient', dg: 3 },
    swamp:    { n: 'Болота', g: '░', c: '#5a7a45', nk: 'swamp', dg: 2 },
    desert:   { n: 'Древняя пустыня', g: ':', c: '#d6b86a', nk: 'desert', dg: 2 },
    tundra:   { n: 'Тундра', g: '.', c: '#a8b8b0', nk: 'tundra', dg: 1, cold: 1 },
    ice:      { n: 'Ледяной материк', g: '*', c: '#e0f0ff', nk: 'ice', dg: 3, cold: 2 },
    mountain: { n: 'Горы', g: '^', c: '#9a9a96', nk: 'mountain', dg: 2 },
    living:   { n: 'Живые горы', g: '^', c: '#b07a6a', nk: 'living', dg: 4 },
    volcanic: { n: 'Вулканические острова', g: '▲', c: '#ff6a2a', nk: 'volcanic', dg: 4 },
    ash:      { n: 'Руины цивилизации', g: ';', c: '#8a8070', nk: 'ash', dg: 3 },
    sky:      { n: 'Небесный архипелаг', g: '○', c: '#c8e0ff', nk: 'sky', dg: 5 },
    // измерения
    dream:    { n: 'Мир снов', g: '·', c: '#9a8ac0', dg: 6, dim: 1 },
    spirit:   { n: 'Мир духов', g: '·', c: '#8ad0c0', dg: 6, dim: 1 },
    time:     { n: 'Измерение времени', g: '·', c: '#c0a060', dg: 8, dim: 1 },
    void:     { n: 'Пустота', g: ' ', c: '#3a3a50', dg: 10, dim: 1 },
    mirror:   { n: 'Зеркало мира', g: '·', c: '#d8e4f0', dg: 5, dim: 1 },
    moon:     { n: 'Луна', g: '·', c: '#b8b8c0', dg: 9, dim: 1, cold: 1 },
    flesh:    { n: 'Нутро исполина', g: '░', c: '#9a4a5a', dg: 8, dim: 1 },
    undersea: { n: 'Город под водой', g: '≈', c: '#4a7a9a', dg: 5, dim: 1 },
    depths:   { n: 'Недра', g: '#', c: '#c08040', dg: 7, dim: 1 },
  };
  D.biomeIds = Object.keys(D.biomes);

  // Измерения: размер сетки и биом
  D.dims = {
    dream:  { n: 'Мир снов', size: 3, biome: 'dream', dark: 0 },
    spirit: { n: 'Мир духов', size: 3, biome: 'spirit', dark: 1 },
    time:   { n: 'Измерение времени', size: 3, biome: 'time', dark: 0 },
    void:   { n: 'Пустота', size: 3, biome: 'void', dark: 1 },
    mirror: { n: 'Зеркало мира', size: 25, biome: 'mirror', dark: 0 },
    moon:   { n: 'Луна', size: 3, biome: 'moon', dark: 0 },
    flesh:  { n: 'Нутро исполина', size: 3, biome: 'flesh', dark: 1 },
    sea:    { n: 'Подводный город', size: 1, biome: 'undersea', dark: 1 },
    depths: { n: 'Недра', size: 1, biome: 'depths', dark: 1 },
  };

  D.months = ['Проталень', 'Ручейник', 'Цветень', 'Травень', 'Липень', 'Серпень', 'Жатвень', 'Листопад', 'Грязник', 'Студень', 'Сечень', 'Лютень'];
  D.monthsGen = ['Проталеня', 'Ручейника', 'Цветеня', 'Травеня', 'Липеня', 'Серпеня', 'Жатвеня', 'Листопада', 'Грязника', 'Студеня', 'Сеченя', 'Лютеня'];
  D.seasons = ['весна', 'лето', 'осень', 'зима'];
  D.weathers = {
    clear:  { n: 'ясно', fov: 1 },
    cloudy: { n: 'пасмурно', fov: 0.9 },
    rain:   { n: 'дождь', fov: 0.7 },
    storm:  { n: 'гроза', fov: 0.55 },
    fog:    { n: 'туман', fov: 0.35 },
    snow:   { n: 'снег', fov: 0.7 },
    blizzard: { n: 'метель', fov: 0.35 },
    sandstorm: { n: 'песчаная буря', fov: 0.35 },
    blacksnow: { n: 'чёрный снег', fov: 0.6 },
    ashrain: { n: 'пепельный дождь', fov: 0.5 },
    none:   { n: '—', fov: 1 },
  };
})(window.EOF);
