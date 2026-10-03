'use strict';

// The reaction tray and the Font Awesome icon list every environment starts with (GitHub #169: Thomas's curated
// sets), and the lists that were the defaults before them, kept so Store#load can tell an environment still on them
// (and move it to these once) from one whose owner changed them. server/store.js uses these; nothing else should.

// The reaction tray: { id, glyph, label }, in order. The first six are the 1-6 shortcuts in the call.
const DEFAULT_REACTION_LIST = [
  { id: 'heart', glyph: '❤️', label: 'Heart' },
  { id: 'black-heart', glyph: '🖤', label: 'Black Heart' },
  { id: '100', glyph: '💯', label: '100%' },
  { id: 'hi', glyph: '👋', label: 'Hi' },
  { id: 'up', glyph: '👍', label: 'Thumbs up' },
  { id: 'down', glyph: '👎', label: 'Thumbs down' },
  { id: 'laugh', glyph: '😂', label: 'Laugh' },
  { id: 'eyeroll', glyph: '🙄', label: 'Eyeroll' },
  { id: 'love', glyph: '🥰', label: 'Love' },
  { id: 'smile', glyph: '😀', label: 'Smile' },
  { id: 'jazz-hands', glyph: '🤗', label: 'Jazz Hands' },
  { id: 'defeated', glyph: '😩', label: 'Defeated' },
  { id: 'yikes', glyph: '😬', label: 'Yikes' },
  { id: 'derp', glyph: '🤪', label: 'Derp' },
  { id: 'angry', glyph: '🤬', label: 'Angry' },
  { id: 'shocked', glyph: '😳', label: 'Shocked' },
  { id: 'mind-blown', glyph: '🤯', label: 'Mind Blown' },
  { id: 'watermelon', glyph: '🍉', label: 'Watermelon' },
  { id: 'orange', glyph: '🍊', label: 'Orange' },
  { id: 'lemon', glyph: '🍋', label: 'Lemon' },
  { id: 'banana', glyph: '🍌', label: 'Banana' },
  { id: 'apple', glyph: '🍎', label: 'Apple' },
  { id: 'pear', glyph: '🍐', label: 'Pear' },
  { id: 'peach', glyph: '🍑', label: 'Peach' },
  { id: 'cherries', glyph: '🍒', label: 'Cherries' },
  { id: 'tomato', glyph: '🍅', label: 'Tomato' },
  { id: 'olive', glyph: '🫒', label: 'Olive' },
  { id: 'chicken', glyph: '🍗', label: 'Chicken' },
  { id: 'steak', glyph: '🥩', label: 'Steak' },
  { id: 'bacon', glyph: '🥓', label: 'Bacon' },
  { id: 'hamburger', glyph: '🍔', label: 'Hamburger' },
  { id: 'fries', glyph: '🍟', label: 'Fries' },
  { id: 'pizza', glyph: '🍕', label: 'Pizza' },
  { id: 'hotdog', glyph: '🌭', label: 'Hotdog' },
  { id: 'taco', glyph: '🌮', label: 'Taco' },
  { id: 'eggroll', glyph: '🫔', label: 'Eggroll' },
  { id: 'burrito', glyph: '🌯', label: 'Burrito' },
  { id: 'popcorn', glyph: '🍿', label: 'Popcorn' },
  { id: 'avocado', glyph: '🥑', label: 'Avocado' },
  { id: 'eggplant', glyph: '🍆', label: 'Eggplant' },
  { id: 'potato', glyph: '🥔', label: 'Potato' },
  { id: 'carrot', glyph: '🥕', label: 'Carrot' },
  { id: 'corn', glyph: '🌽', label: 'Corn' },
  { id: 'pepper', glyph: '🌶️', label: 'Pepper' },
  { id: 'cucumber', glyph: '🥒', label: 'Cucumber' },
  { id: 'peanut', glyph: '🥜', label: 'Peanut' },
  { id: 'mushroom', glyph: '🍄‍🟫', label: 'Mushroom' },
  { id: 'bento', glyph: '🍱', label: 'Bento' },
  { id: 'ape', glyph: '🦧', label: 'Ape' },
  { id: 'puppy', glyph: '🐶', label: 'Puppy' },
  { id: 'fox', glyph: '🦊', label: 'Fox' },
  { id: 'cat', glyph: '🐱', label: 'Cat' },
  { id: 'cow', glyph: '🐮', label: 'Cow' },
  { id: 'pig', glyph: '🐷', label: 'Pig' },
  { id: 'mouse', glyph: '🐹', label: 'Mouse' },
  { id: 'bear', glyph: '🐻', label: 'Bear' },
  { id: 'hen', glyph: '🐔', label: 'Hen' },
  { id: 'chick', glyph: '🐤', label: 'Chick' },
  { id: 'rooster', glyph: '🐓', label: 'Rooster' },
  { id: 'duck', glyph: '🦆', label: 'Duck' },
  { id: 'turkey', glyph: '🦃', label: 'Turkey' },
  { id: 'alligator', glyph: '🐊', label: 'Alligator' },
  { id: 'turtle', glyph: '🐢', label: 'Turtle' },
  { id: 'lizard', glyph: '🦎', label: 'Lizard' },
  { id: 'snake', glyph: '🐍', label: 'Snake' },
  { id: 'dragon-face', glyph: '🐲', label: 'Dragon Face' },
  { id: 'dragon', glyph: '🐉', label: 'Dragon' },
  { id: 'dinosaur', glyph: '🦕', label: 'Dinosaur' },
  { id: 'trex', glyph: '🦖', label: 'Trex' },
  { id: 'dolphin', glyph: '🐬', label: 'Dolphin' },
  { id: 'fish', glyph: '🐠', label: 'Fish' },
  { id: 'puffer-fish', glyph: '🐡', label: 'Puffer Fish' },
  { id: 'shark', glyph: '🦈', label: 'Shark' },
  { id: 'octopus', glyph: '🐙', label: 'Octopus' },
  { id: 'crab', glyph: '🦀', label: 'Crab' },
  { id: 'butterfly', glyph: '🦋', label: 'Butterfly' },
  { id: 'bee', glyph: '🐝', label: 'Bee' },
  { id: 'ant', glyph: '🐜', label: 'Ant' },
  { id: 'spider', glyph: '🕷️', label: 'Spider' },
  { id: 'fly', glyph: '🪰', label: 'Fly' },
  { id: 'ladybug', glyph: '🐞', label: 'Ladybug' },
  { id: 'beetle', glyph: '🪲', label: 'Beetle' },
  { id: 'cockroach', glyph: '🪳', label: 'Cockroach' },
  { id: 'fire', glyph: '🔥', label: 'Fire' },
  { id: 'skull', glyph: '💀', label: 'Skull' },
  { id: 'swords', glyph: '⚔️', label: 'Swords' },
  { id: 'shield', glyph: '🛡️', label: 'Shield' },
  { id: 'wizard', glyph: '🧙‍♂️', label: 'Male Mage' },
  { id: 'female-mage', glyph: '🧙‍♀️', label: 'Female Mage' },
  { id: 'vampire', glyph: '🧛‍♂️', label: 'Male Vampire' },
  { id: 'female-vampire', glyph: '🧛‍♀️', label: 'Female Vampire' },
  { id: 'male-elf', glyph: '🧝‍♂️', label: 'Male Elf' },
  { id: 'female-elf', glyph: '🧝‍♀️', label: 'Female Elf' },
  { id: 'male-zombie', glyph: '🧟‍♂️', label: 'Male Zombie' },
  { id: 'female-zombie', glyph: '🧟‍♀️', label: 'Female Zombie' },
  { id: 'troll', glyph: '🧌', label: 'Troll' },
  { id: 'santa-claus', glyph: '🎅', label: 'Santa Claus' },
  { id: 'mrs-claus', glyph: '🧑‍🎄', label: 'Mrs. Claus' },
  { id: 'beer', glyph: '🍻', label: 'Beer' },
  { id: 'wine', glyph: '🍷', label: 'Wine' },
  { id: 'martini', glyph: '🍸', label: 'Martini' },
  { id: 'tropical-drink', glyph: '🍹', label: 'Tropical Drink' },
  { id: 'toast', glyph: '🥂', label: 'Toast' },
  { id: 'tumbler', glyph: '🥃', label: 'Tumbler' },
  { id: 'coffee', glyph: '☕', label: 'Coffee' },
];

// The icon list, by name, in order: a plain name is `fa-solid fa-<name>`, `brands:<name>` is `fa-brands fa-<name>`.
// Every one ships in Font Awesome Free (tools/check-defaults.mjs checks each against the bundled svgs/).
const DEFAULT_ICON_NAMES = [
  'link', 'globe', 'gamepad', 'dice-d20', 'dice-d6', 'scroll', 'book', 'book-open', 'map', 'compass', 'music',
  'headphones', 'video', 'tv', 'comments', 'wand-magic-sparkles', 'chess', 'users', 'house', 'star', 'couch', 'dice',
  'mug-hot', 'martini-glass', 'lemon', 'flask', 'fish', 'mug-saucer', 'seedling', 'wine-bottle', 'apple-whole',
  'bone', 'bottle-droplet', 'bowl-food', 'carrot', 'champagne-glasses', 'burger', 'cheese', 'cloud-meatball',
  'glass-water-droplet', 'ice-cream', 'hotdog', 'martini-glass-citrus', 'martini-glass-empty', 'pepper-hot',
  'pizza-slice', 'whiskey-glass', 'wine-glass', 'wine-glass-empty', 'circle-user', 'image', 'thumbs-up', 'user',
  'heart', 'location-dot', 'thumbs-down', 'thumbtack', 'message', 'share-nodes', 'brands:bluesky', 'user-group',
  'shield-halved', 'ghost', 'diamond', 'dragon', 'ring', 'headset', 'chess-bishop', 'chess-king', 'chess-knight',
  'chess-pawn', 'chess-queen', 'chess-rook', 'puzzle-piece', 'dungeon', 'dice-one', 'dice-two', 'dice-three',
  'dice-four', 'dice-five', 'dice-six', 'wand-sparkles', 'brands:xbox', 'alarm-clock', 'suitcase', 'car', 'plane',
  'key', 'briefcase', 'bath', 'snowflake', 'earth-americas', 'cable-car', 'passport', 'door-open', 'hotel',
  'umbrella-beach', 'archway', 'bed', 'bell-concierge', 'book-atlas', 'bus', 'caravan', 'map-location', 'monument',
  'mountain-city', 'person-swimming', 'person-walking-luggage', 'plane-circle-check', 'plane-circle-exclamation',
  'plane-circle-xmark', 'plane-lock', 'screwdriver-wrench',
];
// { id, classes, label }: the shape cleanIcons keeps. The label is the name with its dashes as spaces.
function iconEntry(spec) {
  const [style, name] = spec.startsWith('brands:') ? ['brands', spec.slice(7)] : ['solid', spec];
  return { id: name, classes: `fa-${style} fa-${name}`, label: name.replace(/-/g, ' ') };
}
const DEFAULT_ICON_LIST = DEFAULT_ICON_NAMES.map(iconEntry);

// The defaults before #169, exactly as an environment stored them.
const OLD_DEFAULT_REACTIONS = [
  { id: 'heart', glyph: '❤️', label: 'Heart' },
  { id: 'up', glyph: '👍', label: 'Thumbs up' },
  { id: 'down', glyph: '👎', label: 'Thumbs down' },
  { id: 'laugh', glyph: '😂', label: 'Laugh' },
  { id: 'question', glyph: '❓', label: 'Question' },
  { id: 'nat20', glyph: '🎲', label: 'Nat 20!' },
];
const OLD_STARTER_ICONS = [
  'link', 'globe', 'gamepad', 'dice-d20', 'dice-d6', 'scroll', 'book',
  'book-open', 'map', 'compass', 'music', 'headphones', 'video', 'tv',
  'comments', 'wand-magic-sparkles', 'chess', 'users', 'house', 'star', 'couch',
];
const OLD_DEFAULT_ICONS = OLD_STARTER_ICONS.map(iconEntry);

// Whether a stored list is exactly `old`: the same entries, field for field, in the same order (and nothing else on them).
function sameList(stored, old) {
  if (!Array.isArray(stored) || stored.length !== old.length) return false;
  return stored.every((entry, i) => entry && typeof entry === 'object' && !Array.isArray(entry)
    && Object.keys(entry).length === Object.keys(old[i]).length
    && Object.keys(old[i]).every((k) => entry[k] === old[i][k]));
}

module.exports = { DEFAULT_REACTION_LIST, DEFAULT_ICON_NAMES, DEFAULT_ICON_LIST, OLD_DEFAULT_REACTIONS, OLD_STARTER_ICONS, OLD_DEFAULT_ICONS, sameList };
