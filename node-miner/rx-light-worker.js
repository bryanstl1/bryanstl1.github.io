/* NODE MINER RandomX browser experiment.
 * Attribution: RandomX-bonanza by aa022 (0BSD) and RandomX (BSD-3-Clause).
 * Entirely local benchmark: no wallet, mining pool, network calls or Stratum.
 */
'use strict';
importScripts('./randomx_st.js');
let moduleRX, vm=0, cache=0, inputPtr=0, outPtr=0, count=0;
const encoder=new TextEncoder();
const expected='8a48e5f9db45ab79d9080574c4d81954fe6ac63842214aff73c244b26330b7c9';
function say(type,data={}){self.postMessage({type,...data})}
function binToHex(buf){let out='';for(let i=0;i<buf.length;i++)out+=buf[i].toString(16).padStart(2,'0');return out}
function initBytes(str){return encoder.encode(str)}
function allocBytes(bytes){const at=moduleRX._malloc(bytes.length);if(!at)throw new Error('Memoria insuficiente');moduleRX.HEAPU8.set(bytes,at);return at}
function copyInput(bytes){moduleRX.HEAPU8.set(bytes,inputPtr)}
async function main(seconds){
 say('phase',{phase:'loading',status:'Cargando motor RandomX WebAssembly…'});
 const base=new URL('./',self.location.href);
 moduleRX=await createRandomX({locateFile:(file)=>file.endsWith('.wasm')?new URL('randomx_st.wasm',base).href:new URL(file,base).href});
 const alloc=moduleRX.cwrap('randomx_alloc_cache','number',['number']);
 const init=moduleRX.cwrap('randomx_init_cache',null,['number','number','number']);
 const createVM=moduleRX.cwrap('randomx_create_vm','number',['number','number','number']);
 const calc=moduleRX.cwrap('randomx_calculate_hash',null,['number','number','number','number']);
 const key=initBytes('RandomX example key\0');
 const sample=initBytes('RandomX example input\0');
 const keyPtr=allocBytes(key);
 inputPtr=moduleRX._malloc(512);
 outPtr=moduleRX._malloc(32);
 if(!inputPtr||!outPtr)throw new Error('No se pudo reservar memoria');
 say('phase',{phase:'cache',status:'Inicializando caché RandomX (~256 MiB). Puede tardar bastante en iPhone…'});
 cache=alloc(0);
 if(!cache)throw new Error('Safari no pudo reservar la caché RandomX (256 MiB)');
 init(cache,keyPtr,key.length);
 say('phase',{phase:'verification',status:'Verificando un hash RandomX de referencia…'});
 vm=createVM(0,cache,0);
 if(!vm)throw new Error('No fue posible crear la máquina virtual RandomX');
 copyInput(sample);
 calc(vm,inputPtr,sample.length,outPtr);
 const reference=binToHex(moduleRX.HEAPU8.slice(outPtr,outPtr+32));
 if(reference!==expected){
  say('error',{status:'RandomX no produjo el vector esperado: '+reference});
  return;
 }
 say('verified',{reference,expected,status:'RandomX verificado. Iniciando cálculo local…'});
 const start=performance.now();
 let lastReport=start,lastHash='',nonce=0;
 const limit=Math.min(15000,Math.max(3000,Number(seconds||5)*1000));
 while(performance.now()-start<limit){
  const frame=performance.now();
  do{
   const bytes=initBytes('NODE-MINER-RANDOMX-LOCAL-'+nonce);
   copyInput(bytes);
   calc(vm,inputPtr,bytes.length,outPtr);
   lastHash=binToHex(moduleRX.HEAPU8.slice(outPtr,outPtr+32));
   count++;nonce++;
  }while(performance.now()-frame<50&&performance.now()-start<limit);
  const elapsed=Math.min(performance.now()-start,limit);
  if(performance.now()-lastReport>200){
    say('progress',{count,seconds:elapsed/1000,hps:elapsed?count/(elapsed/1000):0,lastHash});
    lastReport=performance.now();
  }
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 const elapsed=Math.min(performance.now()-start,limit);
 say('done',{count,seconds:elapsed/1000,hps:elapsed?count/(elapsed/1000):0,lastHash,status:'Benchmark RandomX terminado. Sin minería conectada.'});
}
let started=false;
self.onmessage=e=>{
 if(e.data?.type!=='start'||started)return;
 started=true;
 main(e.data.seconds).catch(err=>say('error',{status:'Error RandomX: '+String(err?.message||err)}));
};