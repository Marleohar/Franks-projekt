// Entirely synthetic JSON-compatible data. Literal keys originate in JSON.parse.
function propertyRenameLibrary(name = 'P') {
  return JSON.parse(JSON.stringify({
    objects: [0, false, null, 'original text', [0, false, { keep: 1 }], { dose: 99, metadata: { keep: [false, null] } }].map((value, i) => ({
      id: 'herb_'+i, name: i < 2 ? 'Duplicate Å' : 'Herb '+i, desc: 'preserve '+name,
      props: { Before: false, [name]: value, After: null }, taxonomies: { custom: name }, categoryLinks: ['Empty'], metadata: { order: i }
    })).concat([{ id: 'no-props', name: 'Sparse herb' }, { id: 'empty-props', name: 'Empty herb', props: {} }]),
    studyObjects: [{ id: 'study%2F', name: 'Study', props: { [name]: { nested: [0, false] } }, system: 'S', systems: ['T'], links: [{ text: name, url: 'https://invalid.example/offline' }] }, { id: 'study-empty', name: 'Sparse Study' }],
    properties: { Before: { category: 'C', related: [name, 'After', name] }, [name]: { category: 'C', desc: 'definition', related: ['After'], metadata: { literal: name, values: [0, false] } }, After: { category: 'C', related: [] }, Asymmetric: { related: [name], unknown: name }, Sparse: {} },
    categories: { C: { system: 'S', subcategories: [] }, Empty: { system: 'T', subcategories: [] } },
    systems: { S: { categories: ['C'] }, T: { categories: ['Empty'] }, 'Ospecifierade kategorier': { categories: [], desc: 'Kategorier som saknar skola.' } },
    systemOrder: ['T', 'S', 'Ospecifierade kategorier'],
    sources: [{ id: 'source-z', title: 'Source', author: 'Author', year: '2001', tags: [
      { type: 'property', id: name, pages: '42-43', metadata: { keep: name } }, { type: 'property', id: name, pages: '90' },
      { type: 'object', id: name, pages: 'unchanged' }, { type: 'Property', id: name }, { type: 'property', note: name }
    ], metadata: { id: name } }, { id: 'source-a', title: 'No tags' }, { id: 'source-null', title: 'Null tags', tags: null }],
    formulas: { [name]: { desc: name, components: [{ objId: name, role: name, qty: 0, unit: 'g', props: { [name]: 1 } }] } },
    trash: [{ type: 'object', id: 'dead', name: 'Dead', data: { id: 'dead', name: 'Dead herb', props: { [name]: null }, categoryLinks: ['Empty'], metadata: { keep: name } } },
      { type: 'study_object', id: 'dead-study', data: { id: 'dead-study', name: 'Legacy Study', props: { [name]: false } } },
      { type: 'property', id: 'Deleted', name: 'Deleted', data: { related: [name, 'After'], unknown: name } },
      { type: 'unknown', data: { props: { [name]: 'do not rewrite unknown payloads' }, related: [name] } }],
    metadata: { literal: name, names: [name, 'Renamed'], fields: { [name]: { keep: true } } }
  }));
}
function renamedLibrary(input, oldName, newName) {
  const next = structuredClone(input);
  const swap = map => Object.fromEntries(Object.entries(map).map(([key, value]) => [key === oldName ? newName : key, value]));
  const holders = [...next.objects, ...next.studyObjects, ...next.trash.filter(t => ['object', 'study_object'].includes(t.type)).map(t => t.data)];
  for (const holder of holders) if (holder.props && Object.hasOwn(holder.props, oldName)) holder.props = swap(holder.props);
  for (const record of [...Object.values(next.properties), ...next.trash.filter(t => t.type === 'property').map(t => t.data)]) {
    if (Array.isArray(record.related)) record.related = record.related.map(key => key === oldName ? newName : key);
  }
  for (const source of next.sources) for (const tag of source.tags || []) if (tag.type === 'property' && Object.hasOwn(tag, 'id') && tag.id === oldName) tag.id = newName;
  next.properties = swap(next.properties);
  return next;
}
module.exports = { propertyRenameLibrary, renamedLibrary };
