import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {createPdfMiddleware} from '/opt/cys-pdf/current/scripts/local-pdf-plugin.ts';
const require=createRequire('/opt/cys-pdf/current/package.json');
const {PDFDocument}=require('pdf-lib');
const {unzipSync}=require('fflate');
const materias=Array.from({length:11},(_,m)=>({id:`m${m}`,materiaNombre:`Materia ${m}`,ordenVisual:m,formativa:m<2,criterios:Array.from({length:5},(_,c)=>({id:`c${m}-${c}`,texto:`Concepto de prueba ${c}`,orden:c}))}));

const grado=7;const ms=materias;
  const snapshot={huella:'a'.repeat(64),datos:{versionContrato:1,curso:{nombre:`${grado}°`},ciclo:{ano:2026},bimestreCorte:1,alumno:{apellidos:'Prueba',nombres:'Sintetica',dni:'00000000'},responsable:{apellidos:'Prueba',nombres:'Tutor'},materias:ms,escala:[{id:'nota',etiqueta:grado===1?'Destacado':'Destacado 10',pesoNumerico:99}],dependencias:[{bimestre:1,vigente:true}],periodos:[{bimestre:1,evaluaciones:ms.map(m=>({cursoMateriaId:m.id,ppi:false,calificacionGeneralId:m.formativa?null:'nota',criterios:m.criterios.map(c=>({criterioId:c.id,valorEscalaId:'nota'}))})),cierre:{asistencias:0,inasistencias:0,llegadasTarde:0,observaciones:''}}],apoyos:{poseeApoyos:'NO',cualesApoyos:'',promocionoConAcompanamiento:null}}};
snapshot.datos.curso.id='c'.repeat(15);
snapshot.datos.inscripcionId='a'.repeat(15);
let stored=null;let reads=0;
const backend=createServer(async(req,res)=>{
 if(req.headers.authorization!=='synthetic-session'){res.writeHead(401).end();return}
 if(req.url.includes('/instantanea')){reads++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot));return}
 if(req.url.includes('/archivo')){res.setHeader('Content-Type','application/pdf');res.end(stored);return}
 if(req.method==='POST'){
  if(req.headers['x-cys-pdf-worker']!=='synthetic-worker')throw new Error('Worker key');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':req.headers['content-type']}}).formData();
  stored=Buffer.from(await form.get('archivo').arrayBuffer());
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'e'.repeat(15),created:true}));return
 }
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({emision:stored?{id:'e'.repeat(15),huella:snapshot.huella}:null}));
});
await new Promise(r=>backend.listen(18095,'127.0.0.1',r));
const handler=createPdfMiddleware('http://127.0.0.1:18095','synthetic-worker',{root:'/opt/cys-pdf/current',port:()=>18094,allowedOrigins:['https://crecer-y-ser-ten.vercel.app'],renderOrigin:'http://127.0.0.1:8093',chromium:true});
const server=createServer((req,res)=>handler(req,res,()=>res.writeHead(404).end()));
await new Promise(r=>server.listen(18094,'127.0.0.1',r));
try{
 const headers={Origin:'https://crecer-y-ser-ten.vercel.app',Authorization:'synthetic-session','Content-Type':'application/json'};
 const result=await fetch('http://127.0.0.1:18094/api/cys/pdf/generar',{method:'POST',headers,body:JSON.stringify({inscripcionId:'a'.repeat(15),periodoId:'p'.repeat(15),huella:snapshot.huella})});
 if(!result.ok)throw new Error(await result.text());
 if(result.headers.get('X-CYS-PDF-Result')!=='generated')throw new Error('Generation result');
 if(!result.headers.get('Access-Control-Expose-Headers')?.includes('X-CYS-PDF-Result'))throw new Error('Result header not exposed');
 const pdf=await result.arrayBuffer();if((await PDFDocument.load(pdf)).getPageCount()!==14)throw new Error('Pages');
 const reused=await fetch('http://127.0.0.1:18094/api/cys/pdf/generar',{method:'POST',headers,body:JSON.stringify({inscripcionId:'a'.repeat(15),periodoId:'p'.repeat(15),huella:snapshot.huella})});
 if(!reused.ok||reused.headers.get('X-CYS-PDF-Result')!=='reused'||!Buffer.from(await reused.arrayBuffer()).equals(Buffer.from(pdf)))throw new Error('Reuse result');
 const zip=await fetch('http://127.0.0.1:18094/api/cys/pdf/lote',{method:'POST',headers,body:JSON.stringify({cursoId:'c'.repeat(15),periodoId:'p'.repeat(15),emisiones:[{inscripcionId:'a'.repeat(15),emisionId:'e'.repeat(15),huella:snapshot.huella}]})});
 if(!zip.ok)throw new Error(await zip.text());
 const entries=Object.values(unzipSync(new Uint8Array(await zip.arrayBuffer())));
 if(entries.length!==1||!Buffer.from(entries[0]).equals(Buffer.from(pdf)))throw new Error('ZIP bytes');
 console.log(JSON.stringify({productionMiddleware:'ok',pages:14,zip:'identical bytes',snapshotReads:reads}));
}finally{server.close();backend.close()}
