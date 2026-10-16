'use strict';
function identityLibrary() {
  const library = {
    objects: [
      { id: 'item%20name', name: 'Literal percent record', desc: 'Synthetic literal metadata', props: { P: true }, unknown: { keep: 'literal' } },
      { id: 'item name', name: 'Space record', desc: 'Synthetic space metadata', props: { P: true }, unknown: { keep: 'space' } },
      { id: 'item%2520name', name: 'Double encoded literal record', props: { P: true } },
      { id: 'special/"\'%;Å🐉', name: 'Special character record', props: { P: true } },
      { id: '%bad', name: 'Raw malformed percent record', props: { P: true } },
      { id: '', name: 'Empty-ID decoy', props: {} },
    ],
    categories: { C: { subcategories: [] } }, properties: { P: { category: 'C', related: [] } },
    systems: { S: { categories: ['C'] } }, systemOrder: ['S'],
    studyObjects: [], sources: [], formulas: {}, trash: [], unknown: { preserve: true },
  };
  library.objects.forEach(object => { object.nativeSystems = ['S']; });
  return library;
}
module.exports = { identityLibrary };
