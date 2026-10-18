const {propertyRenameLibrary}=require('./property-rename-library.cjs');
function formulaProfileLibrary(){
 const db=propertyRenameLibrary();
 const text=`Å % / O'Brien " <img data-payload=yes src=x onerror="window.__payloads++">`;
 const key='Blend '+text;
 db.objects[0].name=text;db.objects[1].name=text;db.objects[0].id='id%20literal';db.objects[1].id='id literal';
 db.formulas=Object.fromEntries([
  [key,{desc:' Original description ',components:[
   {objId:'id%20literal',role:text,qty:0,unit:text,metadata:{keep:[0,false,null]}},
   {objId:'id literal',role:'secondary',qty:'0.00',unit:'g'},
   {objId:'missing% / '+text,role:'missing',qty:2,unit:'ml'},
   {},null,42,'legacy row',[{formulaId:'Nested'}],{formulaId:'Nested',role:'unknown',metadata:{keep:true}}
  ],metadata:{keep:{unknown:[0,false,null]},literal:key}}],
  ['Empty',{desc:'',components:[],metadata:{keep:true}}],
  ['One',{components:[{objId:'id literal',role:'one',qty:0,unit:'g'}]}],
  ['Legacy description',{desc:{literal:[0,false]},components:[]}],['Absent',{}],['Legacy',{desc:'legacy',components:{length:2,rows:['keep']}}],
  ['__proto__',{desc:'literal own key',components:[]}]
 ]);
 return {library:db,key,text};
}
module.exports={formulaProfileLibrary};
