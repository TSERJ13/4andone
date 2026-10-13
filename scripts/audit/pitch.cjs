const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');const ts=require(process.cwd()+'/node_modules/typescript');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();await page.route('**/audit-audio',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Audio audit</title>'}));await page.goto('http://127.0.0.1:3000/audit-audio');
 const source=fs.readFileSync('src/utils/finals.ts','utf8').replace(/^export /gm,'');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 await page.addScriptTag({content:code+';window.setMusicTempo=setMusicTempo;'});
 const results=await page.evaluate(async()=>{
   const rate=48000,seconds=15;const buffer=new ArrayBuffer(44+rate*seconds*2);const view=new DataView(buffer);
   function text(offset,s){for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));}
   text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,buffer.byteLength-44,true);
   for(let i=0;i<rate*seconds;i++)view.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/rate)*12000,true);
   const url=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
   const audio=new Audio(url);audio.loop=true;const ctx=new AudioContext({latencyHint:'playback'});const source=ctx.createMediaElementSource(audio);const analyser=ctx.createAnalyser();analyser.fftSize=32768;const gain=ctx.createGain();source.connect(analyser).connect(gain).connect(ctx.destination);
   await ctx.resume();const samples=new Float32Array(analyser.frequencyBinCount);const result=[];
   for(const speed of [100,80,50,120,150]){
     window.setMusicTempo(audio,speed);await audio.play();await new Promise(r=>setTimeout(r,1200));
     analyser.getFloatFrequencyData(samples);let max=-Infinity,index=0;for(let i=0;i<samples.length;i++){if(samples[i]>max){max=samples[i];index=i;}}
     result.push({speed,preservesPitch:audio.preservesPitch,measuredHz:index*ctx.sampleRate/analyser.fftSize,peakDb:max});
   }
   audio.pause();await ctx.close();URL.revokeObjectURL(url);return result;
 });
 fs.writeFileSync(process.env.AUDIT_PITCH_OUTPUT || '/tmp/4andone-pitch-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 if(results.some(x=>Math.abs(x.measuredHz-440)>4||!x.preservesPitch))throw new Error('Pitch changed');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
