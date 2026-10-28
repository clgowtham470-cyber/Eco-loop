// Shared learning content (used by the Learn page and the landing page).

export const CODES = [
  { n: 1, code: 'PET', uses: 'Water and soda bottles, food trays', level: 3, note: 'Widely recycled. Rinse, remove the cap, crush.' },
  { n: 2, code: 'HDPE', uses: 'Milk pouches, detergent and shampoo bottles', level: 3, note: 'Widely recycled. Scrap dealers buy it.' },
  { n: 3, code: 'PVC', uses: 'Pipes, cables, some blister packs', level: 1, note: 'Rarely recycled. Never burn it: releases toxic gases.' },
  { n: 4, code: 'LDPE', uses: 'Carry bags, cling film, bread bags', level: 1, note: 'Hard to recycle. Reuse, or drop at a collection point.' },
  { n: 5, code: 'PP', uses: 'Food containers, bottle caps, straws', level: 2, note: 'Recyclable where collected. Clean it first.' },
  { n: 6, code: 'PS', uses: 'Thermocol plates, cups, packing foam', level: 1, note: 'Rarely recycled. Avoid it where you can.' },
  { n: 7, code: 'Other', uses: 'Chip packets, multilayer pouches, mixed plastics', level: 1, note: 'Mostly not recycled. Buy in bulk to avoid it.' },
]

export const BINS = [
  {
    key: 'biodegradable', name: 'Wet bin', color: '#4ADE80', sub: 'Biodegradable',
    yes: ['Fruit and vegetable peels', 'Leftover food, tea leaves, coffee grounds', 'Egg shells, flowers, garden leaves'],
    no: ['Plastic wrappers around food', 'Diapers and sanitary waste'],
    tip: 'Turns into compost in about six weeks if kept separate and dry waste stays out.',
  },
  {
    key: 'recyclable', name: 'Dry bin', color: '#60A5FA', sub: 'Recyclable',
    yes: ['Clean PET bottles and HDPE containers', 'Paper, cardboard, newspaper', 'Metal cans, foil, glass bottles'],
    no: ['Anything with food still on it', 'Wet or greasy paper'],
    tip: 'Clean and dry is worth money. Scrap dealers pay for paper, PET, metal and glass.',
  },
  {
    key: 'hazardous', name: 'Hazardous drop-off', color: '#F87171', sub: 'Hazardous',
    yes: ['Batteries, phones, chargers, cables', 'CFL and tube lights, bulbs', 'Expired medicines, paint, aerosol cans'],
    no: ['Your wet or dry bin, ever', 'Burning or burying them'],
    tip: 'Keep a small box at home and take it to an authorised e-waste or hazardous collector.',
  },
  {
    key: 'reusable', name: 'Keep or donate', color: '#A78BFA', sub: 'Reusable',
    yes: ['Glass jars and steel containers', 'Clothes, shoes, bags', 'Books, toys, working electronics'],
    no: ['Broken items nobody can repair'],
    tip: 'The greenest item is the one that gets a second life before it becomes waste.',
  },
]

export const MYTHS = [
  { claim: 'If it has the recycling triangle, it is recyclable.', fact: false, why: 'The number in the triangle is a resin code. It tells you the type of plastic, not that anyone will actually recycle it.' },
  { claim: 'Batteries can go in the dry bin.', fact: false, why: 'Batteries leak toxic metals and can start fires in trucks and sorting centres. They belong at an e-waste or battery drop-off.' },
  { claim: 'A quick rinse makes recycling work better.', fact: true, why: 'Food residue contaminates whole batches of paper and plastic. A quick rinse with leftover water keeps your dry waste worth recycling.' },
  { claim: '"Biodegradable" plastic breaks down in a home compost pit.', fact: false, why: 'Most compostable plastics need the heat of an industrial composting plant. In a home pit or landfill they can last for years.' },
  { claim: 'Burning plastic is a safe way to get rid of it.', fact: false, why: 'Open burning releases toxic fumes and black carbon that harm the lungs of everyone nearby.' },
  { claim: 'Separating wet and dry waste is required by law in India.', fact: true, why: 'The Solid Waste Management Rules, 2016 require households to segregate waste at source into wet, dry and domestic hazardous waste.' },
]

export const QUIZ = [
  { item: 'Banana peel', answer: 'biodegradable', why: 'Food waste goes in the wet bin, where it can become compost.' },
  { item: 'AA battery', answer: 'hazardous', why: 'Batteries contain toxic metals. Take them to a battery or e-waste drop-off.' },
  { item: 'Clean plastic water bottle', answer: 'recyclable', why: 'PET (code 1) is widely recycled. Remove the cap and crush it first.' },
  { item: 'Empty glass jam jar', answer: 'reusable', why: 'Wash it and reuse it for storage. Glass jars have a long second life.' },
  { item: 'Expired medicines', answer: 'hazardous', why: 'Return them to a pharmacy take-back or hazardous collection. Never flush them.' },
  { item: 'Old cotton T-shirt', answer: 'reusable', why: 'Donate it, or cut it into cleaning rags before it becomes waste.' },
  { item: 'Newspaper', answer: 'recyclable', why: 'Keep it dry and bundle it. Scrap dealers buy old newspaper.' },
  { item: 'CFL bulb', answer: 'hazardous', why: 'CFLs contain mercury. They need a hazardous collection point.' },
]
