export function catalog(content){
 const learning=content.split('## 学习｜')[1];if(!learning)throw Error('Missing learning content');
 return learning.split(/\n### /).slice(1).flatMap(chunk=>{
  const cut=chunk.indexOf('\n'),title=chunk.slice(0,cut),body=chunk.slice(cut+1).trim();
  if(title.startsWith('英语'))return [...body.matchAll(/\*\*([a-z]+) (\/[\s\S]*?)(?=\*\*[a-z]+ \/|\*\*可选30秒|$)/g)].map(m=>({key:'word-'+m[1],title:'英语 · '+m[1],body:m[1]+' '+m[2],course:false}));
  const course=/^(西方史|易经)/.test(title);
  const key=course?title.split('｜')[0]:'concept-'+title.split('｜').slice(1).join('｜');
  return [{key,title,body:body.replace(/^建议用时：([^。]+)。状态：[^\n]+/,'建议用时：$1。学习状态见下方操作记录。'),course}];
 });
}
export function initial(task){return {key:task.key,title:task.title,status:'已安排/待学习',read:false,review:false,note:'',events:[],version:null};}
export function transition(existing,input,task,now){
 if(typeof input.note!=='string'||input.note.length>4000)throw Error('笔记须在4000字以内');
 const next={...existing,note:input.note};
 switch(input.action){
  case 'note':break;
  case 'read':next.read=true;break;
  case 'recite':if(!input.note.trim())throw Error('请先填写复述或答案');next.status='已复述/待核对';break;
  case 'complete':if(input.confirmed!==true)throw Error('需要明确确认完成');next.status='已掌握';next.read=true;break;
  case 'review':next.review=!existing.review;break;
  case 'reset':next.status='已安排/待学习';next.read=false;break;
  default:throw Error('未知学习操作');
 }
 next.updatedAt=now;
 const event={id:input.eventId,at:now,action:input.action,status:next.status,read:next.read,review:next.review,note:next.note,title:task.title,key:task.key,course:task.course};
 next.events=[...(existing.events||[]),event];return next;
}
