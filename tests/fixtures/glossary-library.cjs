'use strict';
const {filterLibrary}=require('./filter-library.cjs');
function glossaryLibrary(){
  const library=filterLibrary().library;
  const payload=`<img data-payload="yes" src=x onerror="window.__payloads++">`;
  const text=`O'Brien " & &amp; &#39; / % \u00c5\u00e4\u00f6 \ud83d\udc09 ${payload}`;
  const botanical=('Botanical '+text+' ').repeat(10).trim();
  const specialId=`id/'\"/%/\u00c5 ${payload}`;
  library.objects=[
    {id:'item%20name',name:'Literal '+text,desc:'Literal description',props:{},taxonomies:{'Botanical Name':'  '+botanical+' \t',Other:'Keep original'},unknown:{keep:false}},
    {id:'item name',name:'Space '+text,desc:'Space description',props:{},taxonomies:{'Botanical Name':botanical},unknown:['keep']},
    {id:specialId,name:('Unassigned '+text+' ').repeat(10).trim(),desc:'Unassigned description',props:{},taxonomies:{Other:'Keep unassigned'},unknown:{keep:1}},
    {id:'ordinary',name:'Ordinary herb',desc:'Other group',props:{},taxonomies:{'Botanical Name':'A ordinary'},unknown:{keep:2}},
    {id:'blank',name:'Blank botanical',desc:'Whitespace only',props:{},taxonomies:{'Botanical Name':' \t '},unknown:{keep:3}}
  ];
  library.studyObjects=[];library.sources=[];
  return {library,botanical,text,payload,specialId};
}
module.exports={glossaryLibrary};
