'use strict';
function safe(fn,code){try{return fn(code)}catch{return code}}
function multiPass(fn,code,passes=4){let r=code;for(let i=0;i<passes;i++){const n=safe(fn,r);if(n===r)break;r=n}return r}
function decodeHexEscapes(c){return c.replace(/\\x([0-9a-fA-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))}
function decodeDecimalEscapes(c){return c.replace(/\\(\d{1,3})/g,(_,n)=>{const x=parseInt(n);return x<=255?String.fromCharCode(x):`\\${n}`})}
function decodeStringChar(c){return c.replace(/string\.char\(([^)]+)\)/g,(_,nums)=>{try{return JSON.stringify(nums.split(',').map(n=>String.fromCharCode(parseInt(n.trim()))).join(''))}catch{return _}})}
function decodeByteTable(c){return c.replace(/\{((?:\s*\d+\s*,\s*){5,}\s*\d+\s*)\}/g,(match,inner)=>{try{const nums=inner.split(',').map(n=>parseInt(n.trim())).filter(n=>!isNaN(n));if(nums.every(n=>n>=32&&n<=126))return JSON.stringify(nums.map(n=>String.fromCharCode(n)).join(''));return match}catch{return match}})}
function simplifyConcat(c){let prev;do{prev=c;c=c.replace(/"([^"\\]*)"\s*\.\.\s*"([^"\\]*)"/g,(_,a,b)=>`"${a}${b}"`)}while(c!==prev);return c}
function decodeBase64(c){return c.replace(/"([A-Za-z0-9+/]{24,}={0,2})"/g,(match,b64)=>{try{const d=Buffer.from(b64,'base64').toString('utf-8');if(/^[\x20-\x7E\n\r\t]+$/.test(d))return JSON.stringify(d);return match}catch{return match}})}
function decodeXOR(c){return c.replace(/bit\.bxor\((\d+),\s*(\d+)\)/g,(_,a,b)=>String(parseInt(a)^parseInt(b)))}
function evalConstMath(c){return c.replace(/\b(\d+)\s*([+\-*])\s*(\d+)\b/g,(match,a,op,b)=>{const na=parseInt(a),nb=parseInt(b);let r;if(op==='+')r=na+nb;else if(op==='-')r=na-nb;else if(op==='*')r=na*nb;else return match;return Number.isInteger(r)?String(r):match})}
function decodeTostring(c){return c.replace(/tostring\((\d+(?:\.\d+)?)\)/g,(_,n)=>`"${n}"`)}
function removeDummyLocals(c){return c.replace(/local\s+_+[a-zA-Z0-9]*\s*=\s*nil\s*;?\n?/g,'')}
function removeJunkComments(c){return c.replace(/--\[\[[\s\S]{200,}?\]\]/g,'').replace(/--[^\n]{0,300}\n/g,'\n')}
function renameObfVars(c){const map={};let counter=0;const found=[...new Set([...c.matchAll(/\b(_0x[a-fA-F0-9]{2,}|__[a-zA-Z]{1,3}\d{3,})\b/g)].map(m=>m[0]))];for(const v of found)map[v]=`var${counter++}`;for(const[orig,alias]of Object.entries(map))c=c.replace(new RegExp(`\\b${orig.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'g'),alias);return c}
function expandWrapper(c){return c.replace(/\(\s*function\s*\(\s*\)\s*\n?([\s\S]*?)\nend\s*\)\s*\(\s*\)/g,(_,body)=>body.trim())}
function decodeLoadstring(c){return c.replace(/loadstring\(([^)]+)\)\(\)/g,(match,inner)=>{if(inner.startsWith('"')&&inner.endsWith('"'))return `-- [loadstring decodificado]\n${inner.slice(1,-1)}`;return match})}
function normalize(c){return c.replace(/;{2,}/g,';').replace(/\t/g,'    ').replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trim()}

const PIPELINE=[
  {name:'🔢 Hex Escapes (\\xNN)',fn:decodeHexEscapes},
  {name:'🔢 Decimal Escapes (\\NNN)',fn:decodeDecimalEscapes},
  {name:'🔤 string.char() → texto',fn:decodeStringChar},
  {name:'📋 Tabela de bytes → string',fn:decodeByteTable},
  {name:'🔗 Concatenação de strings',fn:simplifyConcat},
  {name:'📦 Base64 embutido',fn:decodeBase64},
  {name:'⚡ XOR (bit.bxor)',fn:decodeXOR},
  {name:'🧮 Matemática constante',fn:evalConstMath},
  {name:'🔡 tostring(N)',fn:decodeTostring},
  {name:'🗑️  Locais dummy removidos',fn:removeDummyLocals},
  {name:'💬 Comentários-lixo removidos',fn:removeJunkComments},
  {name:'🏷️  Variáveis obfuscadas renomeadas',fn:renameObfVars},
  {name:'📦 Wrapper inline expandido',fn:expandWrapper},
  {name:'🔓 loadstring decodificado',fn:decodeLoadstring},
  {name:'🧹 Normalização final',fn:normalize},
];

function deobfuscate(code){
  let output=code;const applied=[];
  for(const step of PIPELINE){const before=output;output=multiPass(step.fn,output);if(output!==before)applied.push(step.name)}
  return{output,techniquesApplied:applied}
}

function analyze(code){
  const checks=[
    {label:'Hex Escapes',regex:/\\x[0-9a-fA-F]{2}/},
    {label:'Decimal Escapes',regex:/\\[0-9]{1,3}/},
    {label:'string.char()',regex:/string\.char\(/},
    {label:'XOR (bit.bxor)',regex:/bit\.bxor/},
    {label:'Base64',regex:/[A-Za-z0-9+/]{40,}={0,2}/},
    {label:'Hex Variables',regex:/_0x[a-fA-F0-9]{2,}/},
    {label:'loadstring (VM)',regex:/loadstring/},
    {label:'Dynamic require',regex:/require\s*\(/},
    {label:'Byte Table',regex:/\{\s*\d+\s*,\s*\d+/},
    {label:'getfenv/setfenv',regex:/getfenv|setfenv/},
  ];
  const detected=checks.filter(c=>c.regex.test(code)).map(c=>c.label);
  const hasVM=/loadstring|getfenv|setfenv/.test(code);
  let complexity='Baixa 🟢';
  if(detected.length>=3)complexity='Média 🟡';
  if(detected.length>=6||hasVM)complexity='Alta 🔴';
  return{detectedTypes:detected,complexity,deobfuscable:!hasVM||detected.length>1,hasVM}
}

module.exports={deobfuscate,analyze};
