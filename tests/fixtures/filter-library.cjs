'use strict';
const { propertyLibrary } = require('./property-library.cjs');
function filterLibrary() {
  const library=propertyLibrary().library;
  const payload=`<img data-payload="yes" src=x onerror="window.__payloads++">`;
  const first=`Alpha O'Brien " / % \u00c5\ud83d\udc09 ${payload}`;
  const second='Second % / \u00c5', absent='No matches', near=first+' near';
  const category='Category '+payload;
  library.properties={
    [first]:{category,summary:'',desc:'',related:[]},
    [second]:{category,summary:'',desc:'',related:[]},
    [absent]:{category,summary:'',desc:'',related:[]},
    [near]:{category,summary:'',desc:'',related:[]}
  };
  library.categories[category]={subcategories:[]};
  const all={ [first]:true,[second]:true },partial={[first]:true};
  const specialId=`id/'\"/%/\u00c5 ${payload}`;
  const longName=('Long \u00c5\u00e4\u00f6 \ud83d\udc09 '+payload+' ').repeat(20);
  library.objects=[
    {id:'item%20name',name:'Literal '+payload,desc:'Original description',props:{...all},unknown:{keep:false}},
    {id:'item name',name:'Space '+payload,desc:'Space description',props:{...partial}},
    {id:specialId,name:longName,desc:'Long original',props:{...all}},
    {id:'nonmatching',name:'No match',props:{[first]:false},desc:''}
  ];
  library.studyObjects=[{id:`study/'\"/%/\u00c5 ${payload}`,name:'Study '+payload,type:'Type '+payload,props:{...partial},systems:[],desc:'',unknown:{keep:1}}];
  library.sources=[];
  return {library,first,second,absent,near,category,payload,specialId,longName};
}
module.exports={filterLibrary};
