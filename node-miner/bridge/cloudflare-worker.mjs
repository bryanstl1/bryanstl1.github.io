// NODE MINER | authenticated Cloudflare WSS->Stratum relay.
// NO CPU mining on Cloudflare. NO private Monero keys.
// Secret BRIDGE_TOKEN lives only in Cloudflare secret storage.
import { connect } from "cloudflare:sockets";

const APP_ORIGIN = "https://bryanstl1.github.io";
const POOL_HOST = "pool.hashvault.pro";
const POOL_PORT = 443;
const METHODS = new Set(["login", "submit", "keepalived"]);
const encoder = new TextEncoder();

export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  const configured = typeof env.BRIDGE_TOKEN === "string" && env.BRIDGE_TOKEN.length >= 32;

  if (request.method === "GET" && url.pathname === "/health") {
   const allowOrigin = request.headers.get("Origin") === APP_ORIGIN ? APP_ORIGIN : "null";
   return Response.json(
    { service: "node-miner-bridge", mining: false, bridgeTokenConfigured: configured, protocol: "wss-auth-v6", poolConnected: false },
    { headers: {"Access-Control-Allow-Origin": allowOrigin, "Cache-Control": "no-store", "Vary": "Origin"} }
   );
  }

  if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
   return new Response("WebSocket required", {status: 426});
  if (url.pathname !== "/ws")
   return new Response("Not found", {status: 404});
  if (request.headers.get("Origin") !== APP_ORIGIN)
   return new Response("Origin denied", {status: 403});
  if (!configured)
   return new Response("Secret missing", {status: 503});

  // Upgrade WITHOUT token in URL (avoid leaking secrets into HTTP logs).
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  let state="auth", tcp=null, writer=null, ended=false, buf="";
  let queue=Promise.resolve(), windowStart=Date.now(), messageCount=0;
  const send=(type,detail={})=>{if(!ended){try{server.send(JSON.stringify({type,...detail}))}catch{}}};
  const authTimer=setTimeout(()=>{if(state==="auth"){send("auth_timeout");void cleanup(1008,"Authentication timeout")}},8000);
  async function cleanup(code=1000,reason="Finished"){
   if(ended)return;
   ended=true;clearTimeout(authTimer);
   try{server.close(code,reason)}catch{}
   try{await writer?.abort("closed")}catch{}
   try{await tcp?.close()}catch{}
  }

  function classify(err){
   const msg=String(err?.message||err||"").toLowerCase();
   if(/blocked|disallow|prohibited|not permitted|loop detected/.test(msg))return "destination_blocked";
   if(/dns|resolve|lookup|name or service|enotfound/.test(msg))return "dns_failed";
   if(/refused|econnrefused/.test(msg))return "connection_refused";
   if(/timed out|timeout/.test(msg))return "timeout";
   if(/certificate|cert|tls|ssl|handshake/.test(msg))return "tls_or_handshake";
   if(/unreachable|ehostunreach|enetunreach/.test(msg))return "unreachable";
   return "connection_error";
  }
  async function probe(host,mode,limitMs){
   let trial=null;
   try{
    trial=connect({hostname:host,port:POOL_PORT},{secureTransport:mode});
    await Promise.race([
     trial.opened,
     new Promise((_,reject)=>setTimeout(()=>reject(new Error("Probe timeout")),limitMs))
    ]);
    if(ended){try{await trial.close()}catch{}return false}
    send("probe_ok",{host,mode});
    if(mode==="on"){
     tcp=trial;
     writer=tcp.writable.getWriter();
     state="ready";
     send("pool_ready",{host});
     ctx.waitUntil(readPool());
     return true;
    }
    return false;
   }catch(err){
    const category=classify(err);
    console.error("NODE MINER pool probe:",host,mode,category,String(err?.message||"").slice(0,160));
    send("probe_failed",{host,mode,category});
    return false;
   }finally{
    if(trial!==tcp)try{await trial?.close()}catch{}
   }
  }
  async function diagnosticTLS(host,port,kind,deadline){
   if(ended)return;
   send("diagnostic_start",{host,port,kind});
   let sock=null;
   try{
    sock=connect({hostname:host,port},{secureTransport:"on"});
    await Promise.race([sock.opened,new Promise((_,rej)=>setTimeout(()=>rej(new Error("TLS diagnostic timeout")),deadline))]);
    if(!ended)send("diagnostic_ok",{host,port,kind});
   }catch(err){
    const category=classify(err);
    console.error("NODE MINER TLS diagnostic:",kind,host,port,category,String(err?.message||"").slice(0,200));
    // Only the authenticated user receives this sanitized network error.
    // Redact the private secret even if a runtime ever echoes it unexpectedly.
    let reason=String(err?.message||err?.name||"Error no especificado")
      .split(env.BRIDGE_TOKEN).join("[SECRETO]")
      .replace(/https?:\/\/[^\s]+/gi,"[URL]")
      .replace(/[\r\n\t]/g," ").slice(0,190);
    if(!ended)send("diagnostic_failed",{host,port,kind,category,reason});
   }finally{
    try{await sock?.close()}catch{}
   }
  }
  async function connectPool(){
   if(ended||state!=="connecting")return;
   state="diagnosing";
   // No Stratum login or wallet: this is a TLS connectivity test only.
   // HashVault's own miner pins its mining-server certificate.
   for(const host of [POOL_HOST,"pool.hashvault.sh"]){
    if(ended)return;
    await diagnosticTLS(host,443,"hashvault",6500);
   }
   if(!ended)await diagnosticTLS("www.google.com",443,"control",6500);
   if(!ended)await diagnosticTLS("xmr-us-east1.nanopool.org",10343,"alternative_pool",7500);
   if(!ended){
    state="diagnosed";
    send("diagnostics_done");
    setTimeout(()=>{void cleanup(1000,"Diagnostics finished")},1100);
   }
  }
  async function readPool(){
   if(!tcp)return;
   const reader=tcp.readable.getReader();
   try{
    while(!ended){
     const {value,done}=await reader.read();
     if(done)break;
     buf+=new TextDecoder().decode(value,{stream:true});
     if(buf.length>131072)throw new Error("Pool buffer exceeded");
     let p;
     while((p=buf.indexOf("\n"))>=0){
      const line=buf.slice(0,p).trim();buf=buf.slice(p+1);
      if(line.length>65536)throw new Error("Pool line limit");
      if(line&&!ended)server.send(line);
     }
    }
   }catch(e){
    console.error("NODE MINER upstream closed:",e?.name||"error");
   }finally{
    try{reader.releaseLock()}catch{}
    await cleanup(1000,"Upstream closed");
   }
  }

  server.addEventListener("message",event=>{
   if(ended)return;
   if(typeof event.data!=="string" || event.data.length>4096){void cleanup(1008,"Invalid frame");return;}
   const now=Date.now();
   if(now-windowStart>1000){windowStart=now;messageCount=0;}
   if(++messageCount>20){void cleanup(1008,"Rate limit");return;}
   let msg;
   try{msg=JSON.parse(event.data)}catch{void cleanup(1008,"Invalid JSON");return;}
   if(state==="auth"){
    if(msg?.type!=="auth" || typeof msg.token!=="string" || msg.token!==env.BRIDGE_TOKEN){
     send("auth_failed");setTimeout(()=>{void cleanup(1008,"Authentication failed")},200);return;
    }
    clearTimeout(authTimer);
    state="connecting";
    send("auth_ok");
    void connectPool();
    return;
   }
   if(state!=="ready")return;
   if(!msg || typeof msg!=="object" || !METHODS.has(msg.method)){
    void cleanup(1008,"Invalid Stratum method");return;
   }
   queue=queue.then(()=>writer.write(encoder.encode(JSON.stringify(msg)+"\n"))).catch(()=>cleanup(1011,"Write failed"));
  });
  server.addEventListener("close",()=>{void cleanup()});
  server.addEventListener("error",()=>{void cleanup(1011,"Socket error")});
  return new Response(null,{status:101,webSocket:client});
 }
};