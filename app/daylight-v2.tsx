'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {catalog,initial,transition} from '../scripts/lib/learning-record.mjs';
import './daylight-v2.css';
type Tab='资讯'|'兴趣'|'学习';
type Task={key:string;title:string;body:string;course:boolean};
type Learning={key:string;title:string;status:string;read:boolean;review:boolean;note:string;events:any[];revision?:number;sync?:{lastEventId:string;at:string}};
type Daily={kind:'daily-v2';editionDate:string;coveredSession:string;title:string;quality:'trial'|'partial'|'complete';info:string;interest:string;learning:string;tasks:Task[];generatedAt:string};
declare global {interface Window {firebase?:any;DAYLIGHT_FIREBASE_CONFIG?:Record<string,string>}}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function inline(text:string):ReactNode[]{
 const pattern=/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^\s)]+\)|https:\/\/[^\s<>]+)/g;
 return text.split(pattern).filter(Boolean).map((s,i)=>{
  if(s.startsWith('**')&&s.endsWith('**'))return <strong key={i}>{s.slice(2,-2)}</strong>;
  const link=s.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);if(link)return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]} ↗</a>;
  if(s.startsWith('https://'))return <a key={i} href={s} target="_blank" rel="noopener noreferrer">阅读原文 ↗</a>;
  return s;
 });
}
function Markdown({text}:{text:string}){
 const lines=text.split('\n'),nodes:ReactNode[]=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  if(line.startsWith('|')&&lines[i+1]?.match(/^\s*\|?\s*:?-{3}/)){
   const rows:string[][]=[];rows.push(line.split('|').slice(1,-1).map(s=>s.trim()));i++;
   while(lines[i+1]?.trim().startsWith('|')){i++;rows.push(lines[i].trim().split('|').slice(1,-1).map(s=>s.trim()))}
   nodes.push(<div className="v2-table" key={i} tabIndex={0} aria-label="数据表，可左右滑动"><table><thead><tr>{rows[0].map((s,j)=><th key={j}>{inline(s)}</th>)}</tr></thead><tbody>{rows.slice(1).map((r,k)=><tr key={k}>{r.map((s,j)=><td key={j}>{inline(s)}</td>)}</tr>)}</tbody></table></div>);continue;
  }
  const heading=line.match(/^(#{1,6})\s+(.+)/);if(heading){nodes.push(heading[1].length<=3?<h2 key={i}>{inline(heading[2])}</h2>:<h3 key={i}>{inline(heading[2])}</h3>);continue}
  nodes.push(<p key={i}>{inline(line.replace(/^[-*] /,'• '))}</p>);
 }
 return <div className="v2-prose">{nodes}</div>;
}
function Lesson({task,record,onSave}:{task:Task;record:Learning;onSave:(task:Task,action:string,note:string,confirmed:boolean,revision:number)=>Promise<void>}){
 const [note,setNote]=useState(record.note),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ask,setAsk]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),editRevision=useRef(record.revision||0);
 useEffect(()=>{if(ask)dialog.current?.showModal();else dialog.current?.close()},[ask]);
 useEffect(()=>{if(!editing)setNote(record.note)},[record.note,editing]);
 async function save(action:string,confirmed=false){
  if(action==='recite'&&!note.trim()){setEditing(true);setMessage('先写下你的复述或答案，再提交核对。');return}
  setBusy(true);setMessage('正在保存…');try{await onSave(task,action,note,confirmed,editing?editRevision.current:(record.revision||0));setMessage('已保存到云端；本机下次运行时同步到Obsidian。');setEditing(false)}catch(e){setMessage(e instanceof Error?e.message:'保存失败，笔记仍留在输入框中。')}finally{setBusy(false)}
 }
 const last=record.events.at(-1),synced=last&&record.sync?.lastEventId===last.id;
 return <section className="v2-lesson">
  <div className="v2-kicker">{task.course?'继续上次课程':task.key.startsWith('word-')?'每日英语':'每日概念 · 进阶'}</div>
  <details><summary>{task.title.split('｜').slice(task.title.includes('｜')?1:0).join('｜')}</summary><Markdown text={task.body}/></details>
  <p className="v2-state">{record.status}{record.read?' · 已读':''}{record.review?' · 待复习':''}</p>
  <div className="v2-actions">
   <button className="v2-primary" disabled={busy} onClick={()=>setAsk(true)}>{task.course?'确认完成本节':'确认掌握'}</button>
   {!task.course&&<button disabled={busy} onClick={()=>void save('read')}>标记已读</button>}
   <button disabled={busy} onClick={()=>void save('review')}>{record.review?'取消复习':'加入复习'}</button>
   <button disabled={busy} onClick={()=>{if(!editing)editRevision.current=record.revision||0;setEditing(!editing)}}>笔记 / 复述</button>
  </div>
  {editing&&<div className="v2-editor"><label>我的理解、复述与疑问<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={4000} rows={5}/></label><div className="v2-actions"><button disabled={busy} onClick={()=>void save('note')}>保存笔记</button><button disabled={busy} onClick={()=>void save('recite')}>提交复述，待核对</button></div></div>}
  <details className="v2-more"><summary>更多操作与同步情况</summary><p>{!last?'尚未提交学习操作。':synced?'Obsidian已同步 · '+new Date(record.sync!.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'云端已保存 · Obsidian待本机同步。电脑关闭时仍可记录。'}</p><button disabled={busy} onClick={()=>void save('reset')}>撤销完成，保留笔记</button>{record.events.length>0&&<p>已保留 {record.events.length} 次操作记录，历史笔记随记录同步。</p>}</details>
  <p role="status" className="v2-message">{message}</p>
  <dialog ref={dialog} onCancel={()=>setAsk(false)}><h2>确认{task.course?'完成本节':'掌握'}？</h2><p>{task.course?'这只确认当前小节，不会把整个单元标为完成。下次更新才会安排下一小节。':'阅读过和掌握分开记录。确认后会记录为已掌握。'}</p><div className="v2-actions"><button onClick={()=>setAsk(false)}>再看一看</button><button className="v2-primary" onClick={()=>{setAsk(false);void save('complete',true)}}>确认完成</button></div></dialog>
 </section>;
}
export default function DaylightV2(){
 const [tab,setTab]=useState<Tab>('资讯'),[user,setUser]=useState<any>(null),[ready,setReady]=useState(false),[loading,setLoading]=useState(false),[daily,setDaily]=useState<Daily|null>(null),[records,setRecords]=useState<Record<string,Learning>>({}),[error,setError]=useState(''),[readAt,setReadAt]=useState(''),[authorized,setAuthorized]=useState(false);
 const cloud=useRef<{auth:any;db:any;user:any}>({auth:null,db:null,user:null});
 const load=useCallback(async()=>{
  const {db,user}=cloud.current;if(!db||!user)return;
  setLoading(true);try{
   const [edition,rows]=await Promise.all([db.collection('daylightEditions').doc('v2-current').get({source:'server'}),db.collection('daylightUsers').doc(user.uid).collection('records').where('kind','==','learningV2').get({source:'server'})]);
   if(cloud.current.user?.uid!==user.uid)return;
   if(edition.exists){const next=edition.data();if(next.kind!=='daily-v2'||!Array.isArray(next.tasks)||typeof next.info!=='string'||typeof next.interest!=='string')throw Error('日报格式待修复，请稍后刷新');setDaily(next)}else setDaily(null);
   setRecords(Object.fromEntries(rows.docs.map((row:any)=>{const d=row.data();return [d.record.key,{...d.record,sync:d.sync}]})));setAuthorized(true);setReadAt(new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}));setError('');
  }catch(e){if(cloud.current.user?.uid!==user.uid)return;setAuthorized(false);setDaily(null);setRecords({});setError(e instanceof Error?e.message:'内容读取失败，请重试。')}finally{setLoading(false)}
 },[]);
 useEffect(()=>{
  const f=window.firebase;if(!f||!window.DAYLIGHT_FIREBASE_CONFIG){setError('登录服务暂未加载，请刷新。');return}
  if(!f.apps.length)f.initializeApp(window.DAYLIGHT_FIREBASE_CONFIG);cloud.current.auth=f.auth();cloud.current.db=f.firestore();
  return cloud.current.auth.onAuthStateChanged((u:any)=>{cloud.current.user=u;setUser(u);setAuthorized(false);setDaily(null);setRecords({});setReady(true);if(u)void load()});
 },[load]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')void load()};document.addEventListener('visibilitychange',refresh);const timer=setInterval(refresh,120000);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh)}},[load]);
 async function signIn(){try{setError('');const provider=new window.firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await cloud.current.auth.signInWithPopup(provider)}catch(e){setError(e instanceof Error?e.message:'登录未完成，请重试。')}}
 async function save(task:Task,action:string,note:string,confirmed:boolean,revision:number){
  const {db,user}=cloud.current;if(!user||!daily)throw Error('请先登录');
  const ref=db.collection('daylightUsers').doc(user.uid).collection('records').doc('learningV2_'+encodeURIComponent(task.key));const eventId=crypto.randomUUID();
  await db.runTransaction(async(tx:any)=>{
   const doc=await tx.get(ref),old=doc.exists?doc.data().record:initial(task);
   if((old.revision||0)!==revision)throw Error('另一设备已修改此记录，请刷新后重试；当前笔记仍保留。');
   const next=transition(old,{action,note,confirmed,eventId},task,new Date().toISOString());delete next.version;next.events.at(-1).editionDate=daily.editionDate;next.revision=(old.revision||0)+1;
   tx.set(ref,{kind:'learningV2',id:task.key,record:next},{merge:true});
  });
  const saved=await ref.get({source:'server'});const result=saved.data();if(result.record.events.at(-1)?.id!==eventId)throw Error('保存结果未核对，请刷新查看。');setRecords(old=>({...old,[task.key]:{...result.record,sync:result.sync}}));
 }
 return <main className="v2-app"><header><div className="v2-brand">DAYLIGHT / 日序</div><div className="v2-top"><h1>每天一点，<br/>看见更大的世界。</h1>{authorized&&<button onClick={()=>void load()} disabled={loading}>{loading?'更新中…':'刷新'}</button>}</div><p>资讯 · 兴趣 · 学习</p></header>
 {!ready&&<p role="status">正在加载登录服务…</p>}
 {error&&<div className="v2-error" role="alert">{error}</div>}
 {ready&&!user&&<section className="v2-card"><h2>你的每日个人中心</h2><p>登录后阅读日报，记录学习进度。手机与电脑共用一份记录。</p><button className="v2-primary" onClick={()=>void signIn()}>用 Google 登录</button></section>}
 {user&&!authorized&&!loading&&<section className="v2-card"><p>此账号尚未获准访问私人内容，请切换到已授权的账号。</p><button onClick={()=>void cloud.current.auth.signOut()}>切换账号</button></section>}
 {user&&loading&&!authorized&&<p role="status">正在由云端核验访问权限…</p>}
 {authorized&&<><nav aria-label="主导航">{(['资讯','兴趣','学习'] as Tab[]).map(t=><button key={t} aria-current={t===tab?'page':undefined} onClick={()=>{setTab(t);window.scrollTo({top:0})}}>{t}</button>)}</nav>
 {daily?<><section className="v2-edition"><span>{daily.editionDate} · {daily.quality==='trial'?'试运行内容':daily.quality==='partial'?'部分内容更新':'每日更新'}</span><h2>{daily.title}</h2><p>{daily.coveredSession}</p>{daily.editionDate!==today()&&<p className="v2-warning">当前展示 {daily.editionDate} 的最近一期；今天尚未完成更新。</p>}{daily.quality!=='complete'&&<p className="v2-warning">本期仍在验证内容覆盖，缺失项会明确标注。</p>}</section>
 {tab==='资讯'&&<article className="v2-card"><Markdown text={daily.info}/></article>}
 {tab==='兴趣'&&<article className="v2-card"><Markdown text={daily.interest}/></article>}
 {tab==='学习'&&<><p className="v2-hint">每天学一点即可。展开标题阅读；西方史和易经经你确认才推进，复述提交后先待核对。</p>{daily.tasks.map(task=><Lesson key={task.key} task={task} record={records[task.key]||initial(task)} onSave={save}/>)}</>}
 </>:<section className="v2-card"><h2>{loading?'正在读取你的日报…':'新版日报准备中'}</h2><p>第一份内容发布后会在这里显示。</p></section>}
 <footer>北京时间 · {readAt?'上次检查 '+readAt:'等待更新'}<br/>生成目标：每日06:30前；内容生成依赖本机运行。<button onClick={()=>void cloud.current.auth.signOut()}>退出登录</button></footer></>}
 </main>;
}
