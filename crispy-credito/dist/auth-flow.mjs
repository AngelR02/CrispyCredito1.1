// Auth URLs may contain credentials. Never log this module's input or parser result.
const PENDING_KEY='crispy.password-flow.v1';
const PASSWORD_MODES=new Set(['invite','recovery']);
const OTP_TYPES=new Set(['invite','recovery','email','signup','magiclink','email_change']);
const AUTH_KEYS=['auth','type','code','token','token_hash','access_token','refresh_token','expires_at','expires_in','token_type','provider_token','provider_refresh_token','error','error_code','error_description'];

export function parseAuthReturn(href){
  const url=new URL(href),query=url.searchParams,fragment=new URLSearchParams(url.hash.slice(1));
  const get=k=>query.get(k)||fragment.get(k)||'';
  const type=get('type'),hint=get('auth');
  const mode=PASSWORD_MODES.has(type)?type:PASSWORD_MODES.has(hint)?hint:url.hash==='#recuperar'?'recovery':null;
  if(get('error')||get('error_code'))return{kind:'error',mode,code:get('error_code')||get('error')};
  if(get('token_hash'))return{kind:'otp',mode,type,tokenHash:get('token_hash')};
  if(get('code'))return{kind:'code',mode,code:get('code')};
  if(get('access_token')||get('refresh_token'))return{kind:'tokens',mode,type,accessToken:get('access_token'),refreshToken:get('refresh_token')};
  if(mode||url.hash==='#nueva-clave')return{kind:'intent',mode};
  return{kind:'normal',mode:null};
}
export function cleanAuthReturn(href,mode=null){
  const url=new URL(href);
  for(const key of AUTH_KEYS)url.searchParams.delete(key);
  url.hash=PASSWORD_MODES.has(mode)?'nueva-clave':'acceso';
  return url.pathname+url.search+url.hash;
}
export function passwordReturnUrl(href,mode='recovery'){
  if(!PASSWORD_MODES.has(mode))throw Error('Tipo de enlace inválido.');
  const url=new URL(href);url.search='';url.hash='';url.searchParams.set('auth',mode);return url.href;
}
function safeGet(storage){try{return JSON.parse(storage?.getItem(PENDING_KEY)||'null');}catch{return null;}}
export function clearPasswordFlow(storage){try{storage?.removeItem(PENDING_KEY);}catch{}}
export function rememberPasswordFlow(storage,userId,mode,now=Date.now()){
  if(!userId||!PASSWORD_MODES.has(mode))throw Error('No hay una sesión válida para crear la contraseña.');
  try{storage?.setItem(PENDING_KEY,JSON.stringify({userId,mode,expiresAt:now+3600000}));}catch{}
}
export function pendingPasswordFlow(storage,userId,now=Date.now()){
  const p=safeGet(storage);
  if(p&&p.userId===userId&&PASSWORD_MODES.has(p.mode)&&p.expiresAt>now&&p.expiresAt<=now+3600000)return p.mode;
  clearPasswordFlow(storage);return null;
}
export function authMessage(error,context='login'){
  const code=error?.code||'',message=error?.message||'';
  if(code==='invalid_credentials'||/invalid login credentials/i.test(message))return 'El correo o la contraseña no coinciden. Usa el correo de tu cuenta actual.';
  if(code==='email_not_confirmed'||/email not confirmed/i.test(message))return 'Tu correo todavía no está confirmado. Confírmalo antes de ingresar; las cuentas manuales pueden crearse con Auto Confirm User.';
  if(code==='user_banned')return 'Esta cuenta tiene el acceso restringido.';
  if(code==='same_password')return 'Elige una contraseña diferente de la anterior.';
  if(code==='user_already_exists')return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.';
  if(code==='weak_password')return 'La contraseña no cumple los requisitos. Usa al menos 12 caracteres.';
  if(error?.status===429||/rate_limit/.test(code))return 'Se alcanzó el límite temporal de solicitudes. Espera unos minutos antes de intentar otra vez.';
  if(/pkce|code_verifier|flow_state/.test(code)||/code verifier|PKCE/i.test(message))return 'Este enlace pertenece a un flujo anterior o a otro navegador. Solicita un enlace nuevo desde la app actualizada.';
  if(/otp_expired|access_denied|expired|invalid_token|auth_code/.test(code)||/expired|one.time token|invalid.*token/i.test(message))return 'El enlace venció o ya se utilizó. Solicita uno nuevo y abre el más reciente.';
  if(error?.name==='AuthRetryableFetchError'||/fetch|network|connection/i.test(message))return 'No pudimos conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.';
  return context==='signup'?'No pudimos crear tu cuenta. Revisa el correo y los requisitos de contraseña.':context==='password'?'No pudimos guardar la contraseña. Revisa los requisitos e inténtalo otra vez.':context==='link'?'No pudimos verificar el enlace. Solicita uno nuevo y abre el más reciente.':context==='reset'?'No pudimos enviar el enlace. Inténtalo más tarde.':'No pudimos iniciar sesión. Revisa el correo, la contraseña y la conexión.';
}
function missingSession(error){return error?.name==='AuthSessionMissingError'||error?.code==='session_not_found';}

// Deterministic entry point: process the URL before loading private records.
// The tab marker contains only a user ID, mode and expiration, never tokens.
export async function resolveAuthEntry({auth,href,storage,replaceUrl=()=>{},now=Date.now()}){
  const intent=parseAuthReturn(href);
  if(intent.kind!=='normal')replaceUrl(cleanAuthReturn(href,intent.mode));
  if(['error','otp','code','tokens'].includes(intent.kind))clearPasswordFlow(storage);
  if(intent.kind==='error'){clearPasswordFlow(storage);return{kind:'link-error',mode:intent.mode,message:authMessage({code:intent.code},'link')};}
  try{
    let verifiedMode=intent.mode;
    if(['otp','code','tokens'].includes(intent.kind)){
      let response;
      if(intent.kind==='otp'){
        if(!OTP_TYPES.has(intent.type))throw Error('Tipo de enlace no válido.');
        response=await auth.verifyOtp({token_hash:intent.tokenHash,type:intent.type});
      }else if(intent.kind==='code'){
        response=await auth.exchangeCodeForSession(intent.code);
        if(PASSWORD_MODES.has(response.data?.redirectType))verifiedMode=response.data.redirectType;
      }else{
        if(!intent.accessToken||!intent.refreshToken)return{kind:'link-error',mode:intent.mode,message:'El enlace está incompleto. Solicita uno nuevo.'};
        response=await auth.setSession({access_token:intent.accessToken,refresh_token:intent.refreshToken});
      }
      if(response.error)throw response.error;
      if(!response.data?.session)throw Error('El enlace no creó una sesión válida.');
      const{data,error}=await auth.getUser();
      if(error||!data?.user)throw error||Error('El enlace no tiene un usuario válido.');
      if(PASSWORD_MODES.has(verifiedMode)){
        rememberPasswordFlow(storage,data.user.id,verifiedMode,now);
        replaceUrl(cleanAuthReturn(href,verifiedMode));
        return{kind:'password',mode:verifiedMode,user:data.user};
      }
      clearPasswordFlow(storage);return{kind:'account',user:data.user};
    }
    const{data,error}=await auth.getUser();
    if(error&&!missingSession(error))throw error;
    const user=data?.user;
    if(!user){clearPasswordFlow(storage);return intent.kind==='intent'?{kind:'link-error',mode:intent.mode,message:'Abre el enlace completo que recibiste por correo. Si ya lo usaste, solicita uno nuevo.'}:{kind:'login'};}
    const pending=pendingPasswordFlow(storage,user.id,now);
    if(pending){replaceUrl(cleanAuthReturn(href,pending));return{kind:'password',mode:pending,user};}
    if(intent.kind==='intent')return{kind:'link-error',mode:intent.mode,message:'Este enlace no contiene una verificación válida. Solicita uno nuevo.'};
    return{kind:'account',user};
  }catch(error){
    if(intent.kind==='normal')throw error;
    clearPasswordFlow(storage);return{kind:'link-error',mode:intent.mode,message:authMessage(error,'link')};
  }
}
