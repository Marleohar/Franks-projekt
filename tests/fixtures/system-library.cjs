'use strict';
const { propertyLibrary } = require('./property-library.cjs');
function systemLibrary() {
  const base = propertyLibrary();
  const attack = `<img data-payload="yes" src=x onerror="window.__payloads++">`;
  const text = `O'Brien " / % Unicode \u00c5\u00e4\u00f6 \ud83d\udc09 ${attack}`;
  const system = `System ${text}`, other = 'Other system', category = `Category ${text}`, property = `Property ${text}`;
  const library = base.library;
  library.systems[system] = { desc: ('Long '+text+' ').repeat(20), categories: [category, 'Ordinary category'], unknown: { keep: false } };
  library.systems[other] = { desc: 'Other', categories: [] };
  library.categories[category] = {subcategories: []};
  library.categories['Ordinary category'] = {subcategories: []};
  library.properties[property] = {category, summary: '', desc: '', related: []};
  library.studyObjects = [
    { id: `study/'%/\u00c5 ${attack}`, name: 'Study '+text, type: 'Type '+text, systems: [system, other], props: {}, desc: '', unknown: {keep: false} },
    { id: 'ordinary-study', name: 'Ordinary study', type: 'Ref', systems: [other], props: {}, desc: '' }
  ];
  library.sources = [
    { id: `source/'%/\u00c5 ${attack}`, title: 'Title '+text, author: 'Author '+text, year: 'Year '+text, tags: [{type:'system',id:system},{type:'system',id:other},{type:'property',id:property,pages:'12'}] },
    { id: 'ordinary-source', title: 'Ordinary source', author:'Ordinary',year:2024,tags:[{type:'system',id:other}] }
  ];
  return { library, system, other, category, property, text };
}
module.exports = { systemLibrary };
