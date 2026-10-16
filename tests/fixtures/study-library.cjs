'use strict';
const {filterLibrary} = require('./filter-library.cjs');
function studyLibrary() {
  const f = filterLibrary();
  const ids = ['ordinary', 'space id', `quotes'"`, 'percent%id', 'slash/id', '\u00c5\u6f22\u5b57\ud83d\udc09', 'item%20name', 'item name', `javascript:alert(1)/"><img src=x onerror="window.__payloads++">`];
  f.library.systems = {'Legacy \u00c5': {}, 'Plural / %': {}, 'Unrelated': {}};
  f.library.studyObjects = ids.map((id, i) => ({id, name: 'Study '+i+' '+f.payload, type: 'Type '+f.payload,
    desc: 'Literal <script>window.__payloads++</script> & " text\n'+f.payload,
    props: {[f.first]: true, [f.second]: false, disabled: null},
    system: 'Legacy \u00c5', systems: ['Plural / %', 'Legacy \u00c5'],
    metadata: {sequence: i, original: false}, unknown: ['keep', {nested: null}]}));
  return f;
}
module.exports = {studyLibrary};
