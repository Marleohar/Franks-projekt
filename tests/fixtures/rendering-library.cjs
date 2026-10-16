'use strict';
const attack = '<svg onload="window.__payloads++"></svg>';
const attribute = '" autofocus onfocus="window.__payloads++" data-injected="yes';
function renderingLibrary() {
  const id = `synthetic/"';window.__payloads++;//%<>&å`;
  const category = `Sök kategori O'Brien "${attack}" & Åäö`;
  const property = `Sök egenskap '${attribute}<>&`;
  const subcategory = `Under '${attack} & "ö"`;
  const system = `Sök system '${attack} & "å"`;
  const long = (`Sök lång text ${attack} <script>window.__payloads++</script> " '& Åäö 🐉\n`).repeat(12);
  return {
    id, category, property, subcategory, system, long, attack, attribute,
    library: {
      objects: [{ id, name: `Sök ört ${attack} '${attribute} & Åäö 🐉`, desc: long,
        props: { [property]: true }, nativeSystems: [system],
        taxonomies: { 'Botanical Name': `Sök latin ${attack}`, [`Nyckel ${attack}`]: attribute } }],
      categories: { [category]: { system, desc: long, subcategories: [subcategory] } },
      properties: { [property]: { category, subcategory, summary: long, desc: long } },
      systems: { [system]: { categories: [category], desc: long } }, systemOrder: [system],
      studyObjects: [], sources: [], formulas: {}, trash: [], unknown: { preserve: attack }
    }
  };
}
module.exports = { renderingLibrary };
