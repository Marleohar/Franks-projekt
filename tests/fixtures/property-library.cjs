'use strict';
function propertyLibrary() {
  const attack = '<svg data-payload="yes" onload="window.__payloads++"></svg>';
  const text = `O'Brien " & ${attack} <script>window.__payloads++</script> Åäö 🐉`;
  const property = `Property ${text}`;
  const related = `Related ${text}`;
  const category = `Category ${text}`;
  const system = `System ${text}`;
  const sourceId = `source/'";window.__payloads++;//%Å`;
  const pages = `Pages '${text}`;
  const description = (`Long ${text}\n`).repeat(12);
  const library = {
    objects: [
      { id: 'item%20name', name: `Literal herb ${text}`, props: { [property]: true } },
      { id: 'item name', name: `Space herb ${text}`, props: { [property]: true } },
      { id: 'unlinked', name: 'Unlinked synthetic herb', props: {} },
    ],
    properties: {
      [property]: { category, summary: `Summary ${text}`, desc: description, related: [related], unknown: { preserve: text } },
      [related]: { category, summary: '', desc: '', related: [property] },
    },
    categories: { [category]: { system, desc: '', subcategories: [] } },
    systems: { [system]: { categories: [category] }, 'Ospecifierade kategorier': { desc: 'Kategorier som saknar skola.', categories: [] } },
    systemOrder: [system, 'Ospecifierade kategorier'],
    studyObjects: [{ id: 'study-synthetic', name: `Study ${text}`, type: `Type ${text}`, props: { [property]: true } }],
    sources: [{ id: sourceId, title: `Title ${text}`, author: `Author ${text}`, year: `Year ${text}`,
      tags: [{ type: 'property', id: property, pages }, { type: 'system', id: system, pages: 'Unchanged synthetic reference' }] }],
    formulas: {}, trash: [], unknown: { preserve: description },
  };
  return { library, property, related, category, system, sourceId, pages, description, attack, text };
}
module.exports = { propertyLibrary };
