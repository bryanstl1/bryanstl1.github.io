// NODE MINER: deployed relay source. Bridge only; NEVER mines.
// Cloudflare Secret: BRIDGE_TOKEN >=32 characters. Never commit this secret.
// Fixed upstream: HashVault TLS, cannot be changed by a client.
import { connect } from "cloudflare:sockets";
export default {
  async fetch(request, env, ctx) {
    const u=new URL(request.url), host="pool.hashvault.pro", port=443;
    if(u.pathname==="/health") return Response.json({service:"node-miner-bridge",mining:false});
    if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket") return new Response("WebSocket only",{status:426});
    if(!env.BRIDGE_TOKEN||env.BRIDGE_TOKEN.length<32) return new Response("Not configured",{status:503});
    if(request.headers.get("Origin")!=="https://bryanstl1.github.io") return new Response("Forbidden",{status:403});
    let receivedToken;try{receivedToken=decodeURIComponent(u.pathname.slice(4))}catch{return new Response("Not found",{status:404})}
    if(!u.pathname.startsWith("/ws/")||receivedToken!==env.BRIDGE_TOKEN) return new Response("Not found",{status:404});
    if((u.searchParams.has("pool")&&u.searchParams.get("pool")!==host)||(u.searchParams.has("port")&&u.searchParams.get("port")!=="443")) return new Response("Pool denied",{status:403});
    let upstream;
    try {upstream=connect({hostname:host,port},{secureTransport:"on"});await upstream.opened}
    catch {try{await upstream?.close()}catch{}return new Response("Upstream unavailable",{status:502})}
    const [client,server]=Object.values(new WebSocketPair());server.accept();
    const writer=upstream.writable.getWriter(),encoder=new TextEncoder(),decoder=new TextDecoder();
    let ended=false,pending=Promise.resolve(),buffer="",start=Date.now(),sent=0;
    async function close(){
      if(ended)return;ended=true;
      try{server.close(1000,"Relay ended")}catch{}
      try{await writer.abort("closed")}catch{}
      try{await upstream.close()}catch{}
    }
    server.addEventListener("message",event=>{
      if(ended||typeof event.data!=="string"||event.data.length>4096){void close();return}
      if(Date.now()-start>1000){start=Date.now();sent=0}if(++sent>20){void close();return}
      let data;try{data=JSON.parse(event.data)}catch{void close();return}
      if(!data||!["login","submit","keepalived"].includes(data.method)){void close();return}
      pending=pending.then(()=>writer.write(encoder.encode(JSON.stringify(data)+"\n"))).catch(()=>close());
    });
    server.addEventListener("close",()=>{void close()});
    server.addEventListener("error",()=>{void close()});
    async function pump(){
      const reader=upstream.readable.getReader();
      try{
        while(!ended){
          const {value,done}=await reader.read();if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          if(buffer.length>131072)throw new Error("oversize");
          let p;
          while((p=buffer.indexOf("\n"))>=0){
            const line=buffer.slice(0,p).trim();buffer=buffer.slice(p+1);
            if(line.length>65536)throw new Error("oversize line");
            if(line&&!ended)server.send(line);
          }
        }
      }catch{}finally{try{reader.releaseLock()}catch{}await close()}
    }
    ctx.waitUntil(pump());
    return new Response(null,{status:101,webSocket:client});
  }
};