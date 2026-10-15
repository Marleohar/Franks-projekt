'use strict';

// Entirely synthetic. Fresh objects per call; no user data or service settings.
const firstDescription = 'First synthetic description. '.repeat(16);
const secondDescription = 'Second synthetic description with different content. '.repeat(10);

function duplicateLibrary() {
  return {
    objects: [
      { id: 'synthetic-first', name: '  Sample Leaf ', desc: firstDescription,
        props: { shared: false }, taxonomies: { language: 'first' },
        nativeSystems: ['system-first'], unknownObjectField: { origin: 'first' } },
      { id: 'synthetic-second', name: 'sample LEAF', desc: secondDescription,
        props: { shared: false, secondOnly: false },
        taxonomies: { language: 'second', extra: 'retained taxonomy' },
        nativeSystems: ['system-second'], unknownObjectField: { origin: 'second' },
        secondOnlyMetadata: { preserve: true } },
    ],
    categories: {}, properties: {}, systems: {}, systemOrder: [],
    studyObjects: [], sources: [], formulas: {}, trash: [],
    unknownLibraryField: { preserve: 'synthetic top-level extension' },
  };
}

function emptyObjectLibrary() {
  const library = duplicateLibrary();
  library.objects = [];
  library.categories = { 'Synthetic Category': { desc: firstDescription, subcategories: [] } };
  library.properties = { 'Synthetic Property': { category: 'Synthetic Category', desc: secondDescription } };
  library.systems = { 'Synthetic System': { categories: ['Synthetic Category'] } };
  library.systemOrder = ['Synthetic System'];
  library.studyObjects = [{ id: 'synthetic-study', name: 'Synthetic Study', unknown: true }];
  library.sources = [{ id: 'synthetic-source', title: 'Synthetic Source', tags: [] }];
  library.formulas = { 'Synthetic Recipe': { desc: firstDescription, components: [] } };
  library.trash = [{ type: 'object', id: 'synthetic-trash', data: { name: 'Synthetic Trash' } }];
  return library;
}

module.exports = { duplicateLibrary, emptyObjectLibrary, firstDescription, secondDescription };
