import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';
import{supabase}from'./supabase.js';
import './style.css';

const id=new URLSearchParams(window.location.search).get('authorization_id');
const looksLikeId=(value)=>typeof value==='string'&&/^[a-zA-Z0-9_-]{8,256}$/.test(value);
const consentPath=()=>'/oauth/consent?authorization_id='+encodeURIComponent(id??'');
function App(){
 const[status,setStatus]=useState('loading');
 const[email,setEmail]=useState('');
 const[sessionEmail,setSessionEmail]=useState('');
 const[details,setDetails]=useState(null);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const[notice,setNotice]=useState('');
 const[revision,setRevision]=useState(0);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,_session)=>{setRevision(v=>v+1);});
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  let active=true;
  (async()=>{
   setError('');setDetails(null);
   if(!looksLikeId(id)){if(active){setError('Falta un identificador de autorización válido. Inicia la conexión desde ChatGPT.');setStatus('error');}return;}
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(!active)return;
   if(userError||!user){setStatus('login');return;}
   setSessionEmail(user.email??'Usuario autenticado');
   const {data:authorization,error:authError}=await supabase.auth.oauth.getAuthorizationDetails(id);
   if(!active)return;
   if(authError||!authorization){setStatus('error');setError(authError?.message??'Solicitud de autorización no válida.');return;}
   if(!('authorization_id' in authorization)){
     if(typeof authorization.redirect_url==='string'){window.location.assign(authorization.redirect_url);return;}
     setStatus('error');setError('La respuesta de autorización no incluye un destino válido.');return;
   }
   setDetails(authorization);setStatus('consent');
  })().catch(e=>{if(active){setError(e?.message??'No se pudo cargar la autorización.');setStatus('error');}});
  return()=>{active=false};
 },[revision]);
 async function signIn(event){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const {error:e}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+'/auth/callback?authorization_id='+encodeURIComponent(id)}});
   if(e)throw e;
   setNotice('Hemos enviado un enlace de acceso a tu correo. Ábrelo para continuar con esta autorización.');
  }catch(e){setError(e.message??'Error enviando el enlace.');}finally{setBusy(false);}
 }
 async function decision(approved){
  setBusy(true);setError('');
  try{
   const result=approved?await supabase.auth.oauth.approveAuthorization(id):await supabase.auth.oauth.denyAuthorization(id);
   if(result.error)throw result.error;
   if(!result.data?.redirect_url)throw new Error('No se ha recibido la URL de retorno.');
   window.location.assign(result.data.redirect_url);
  }catch(e){setError(e.message??'No se ha podido procesar la autorización.');setBusy(false);}
 }
 async function signOut(){setBusy(true);await supabase.auth.signOut();setRevision(x=>x+1);setBusy(false);}
 const client=details?.client?.name||'Una aplicación conectada';
 const scopes=typeof details?.scope==='string'?details.scope.split(/\s+/).filter(Boolean):[];
 return <main className="page"><section className="panel">
 <div className="brand"><span className="mark">T</span><span>TRAZO<span className="accent">.DIGITAL</span><small>HOTMART MCP</small></span></div>
 {status==='loading'&&<><h1>Verificando acceso</h1><p>Estamos comprobando la solicitud de conexión.</p></>}
 {status==='error'&&<><h1>No se puede continuar</h1><p>Reinicia la conexión desde ChatGPT para generar una nueva autorización.</p></>}
 {status==='login'&&<><h1>Accede a tu cuenta</h1><p>Utiliza tu correo para iniciar sesión y revisar la solicitud de acceso.</p>
 <form onSubmit={signIn}><label htmlFor="email">Correo electrónico</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@empresa.com"/><button disabled={busy||!email.trim()} className="primary" type="submit">{busy?'Enviando…':'Enviar enlace de acceso'}</button></form>
 {notice&&<p role="status" className="notice">{notice}</p>}</>}
 {status==='consent'&&<><div className="eyebrow">AUTORIZACIÓN DE ACCESO</div><h1>¿Permitir la conexión?</h1><p><strong>{client}</strong> solicita acceder a la identidad de tu cuenta de Hotmart MCP by Trazo Digital.</p>
 <div className="scope"><strong>Permisos solicitados</strong><ul>{scopes.length?scopes.map(s=><li key={s}>{s}</li>):<li>No se han especificado permisos adicionales.</li>}</ul></div>
 <div className="scope"><strong>Aplicación solicitante</strong><p>{client}</p><strong>Destino de retorno</strong><p className="url">{details?.redirect_uri??'No disponible'}</p></div>
 <p className="fine">Autorizar este acceso no comparte tu contraseña ni tus credenciales privadas de Hotmart. Las consultas futuras seguirán sujetas a tus permisos dentro de cada empresa.</p>
 <div className="buttons"><button disabled={busy} onClick={()=>decision(false)} className="secondary">Rechazar</button><button disabled={busy} onClick={()=>decision(true)} className="primary">{busy?'Procesando…':'Autorizar acceso'}</button></div>
 <div className="session">Sesión: {sessionEmail} · <button disabled={busy} className="link" onClick={signOut}>Cambiar de cuenta</button></div></>}
 {error&&<p role="alert" className="error">{error}</p>}
 <footer>Autenticación gestionada por Supabase · Trazo Digital</footer></section></main>;
}
const callback=window.location.pathname==='/auth/callback';
if(callback&&looksLikeId(id)){window.history.replaceState(null,'',consentPath());}
createRoot(document.getElementById('root')).render(<App/>);
