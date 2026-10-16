'use strict';
const {glossaryLibrary}=require('./glossary-library.cjs');
function formulaLibrary(){
  const library=glossaryLibrary().library;
  const payload=`<img data-payload="yes" src=x onerror="window.__payloads++">`;
  const special=`Formula O'Brien " & &amp; &#39; / % \u00c5\u00e4\u00f6 \ud83d\udc09 ${payload}`;
  const description=('Long description '+special+' ').repeat(20);
  library.formulas={
    'Formula%20name':{desc:'Literal-percent formula',components:[{id:'keep',unknown:false}],unknown:{keep:1}},
    'Formula name':{desc:'Space formula',components:[],unknown:{keep:2}},
    [special]:{desc:description,components:[{id:'one'},{id:'two'}],unknown:{keep:false}},
    'Empty description':{desc:'',components:[]},
    'Malformed length':{desc:'Malformed but untouched',components:{length:payload},unknown:['keep']},
    'Null record':null,
    'Legacy string components':{desc:'Legacy components untouched',components:'legacy'},
  };
  return {library,special,description,payload};
}
module.exports={formulaLibrary};
