'use strict';

function previousCategoryLibrary() {
  return {
    objects: [{ id: 'synthetic-previous', name: 'Previous synthetic object' }],
    categories: { C: { desc: 'Previous synthetic category', subcategories: [] } },
    properties: {},
  };
}

function categoryFailureLibrary() {
  return {
    objects: [],
    categories: { C: { subcategories: [] } },
    properties: { P: { category: 'C', subcategory: 'constructor', unknown: { keep: true } } },
  };
}

module.exports = { previousCategoryLibrary, categoryFailureLibrary };
