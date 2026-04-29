import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.js";

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "сега";
  if (m < 60) return `преди ${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `преди ${h} ч`;
  return `преди ${Math.floor(h / 24)} д`;
}

const T = {
  bg:"#07090f",bg2:"#0d1017",bg3:"#121620",bg4:"#181d28",
  border:"#1e2535",border2:"#252d3f",
  gold:"#f0a500",gold2:"#ffc940",teal:"#00c9a7",red:"#e05c6a",
  text:"#e2e8f4",text2:"#8896b3",text3:"#4a5670",
  head:"'Playfair Display', Georgia, serif",
  body:"'DM Sans', sans-serif",
  mono:"'JetBrains Mono', monospace",
};

function Avatar({ user, size=34 }) {
  if (!user) return null;
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:`radial-gradient(135deg, ${user.color}33, ${user.color}11)`,
      border:`1.5px solid ${user.color}55`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.33,fontWeight:600,color:user.color,fontFamily:T.mono,
      boxShadow:`0 0 10px ${user.color}22`,
    }}>{user.avatarInitials}</div>
  );
}

function Tag({ label, onClick, active }) {
  return (
    <span onClick={onClick} style={{
      fontSize:11,fontFamily:T.mono,
      background:active?`${T.gold}18`:"rgba(255,255,255,0.03)",
      color:active?T.gold:T.text3,
      padding:"3px 10px",borderRadius:20,
      border:`1px solid ${active?T.gold+"55":T.border}`,
      cursor:onClick?"pointer":"default",
      transition:"all 0.18s",letterSpacing:"0.03em",userSelect:"none",
    }}
      onMouseEnter={e=>{if(!active&&onClick){e.target.style.color=T.text2;e.target.style.borderColor=T.border2;}}}
      onMouseLeave={e=>{if(!active&&onClick){e.target.style.color=T.text3;e.target.style.borderColor=T.border;}}}
    >#{label}</span>
  );
}

function VoteBtn({ count, hasVoted, onVote, disabled, size="md" }) {
  const [anim,setAnim]=useState(false);
  const isLg=size==="lg";
  function handleClick(){
    if(disabled)return;
    setAnim(true);setTimeout(()=>setAnim(false),400);onVote();
  }
  return (
    <button onClick={handleClick} disabled={disabled} style={{
      display:"flex",flexDirection:"column",alignItems:"center",gap:3,
      padding:isLg?"10px 14px":"7px 11px",
      background:hasVoted?`linear-gradient(135deg,${T.gold}20,${T.gold}08)`:"rgba(255,255,255,0.02)",
      border:`1px solid ${hasVoted?T.gold+"55":T.border}`,borderRadius:10,
      color:hasVoted?T.gold:T.text3,cursor:disabled?"not-allowed":"pointer",
      transition:"all 0.2s",boxShadow:hasVoted?`0 0 16px ${T.gold}18`:"none",
      animation:anim?"votePop 0.4s ease":"none",minWidth:isLg?52:42,
    }}>
      <svg width={isLg?16:13} height={isLg?16:13} viewBox="0 0 12 12" fill="none">
        <path d="M6 1.5L11 9.5H1L6 1.5Z" fill={hasVoted?T.gold:"none"}
          stroke={hasVoted?T.gold:"currentColor"} strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
      <span style={{fontFamily:T.mono,fontSize:isLg?15:12,fontWeight:600,lineHeight:1}}>{count}</span>
    </button>
  );
}

function Spinner() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"60px 0"}}>
      <div style={{width:36,height:36,border:`2px solid ${T.border2}`,borderTopColor:T.gold,
        borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontFamily:T.mono,fontSize:11,color:T.text3,letterSpacing:"0.1em"}}>ЗАРЕЖДАНЕ</span>
    </div>
  );
}

function Err({ msg }) {
  return (
    <div style={{background:`${T.red}12`,border:`1px solid ${T.red}44`,borderRadius:10,
      padding:"14px 18px",color:T.red,fontSize:13,display:"flex",gap:10}}>
      <span>⚠</span><span>{msg}</span>
    </div>
  );
}

function StatBadge({ value, label, color=T.text2 }) {
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:T.head,fontSize:22,fontWeight:700,color,lineHeight:1,marginBottom:2}}>{value}</div>
      <div style={{fontSize:10,color:T.text3,fontFamily:T.mono,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.border2},transparent)`,margin:"6px 0"}}/>;
}

const SCHEMAS = {
  questions:`// questions collection\n{\n  _id:      ObjectId,\n  authorId: ObjectId,    // → REF users._id\n  title:    String,\n  body:     String,\n  tags:     [String],    // ARRAY field\n  votes:    [ObjectId],  // ARRAY of user refs\n  views:    Number,\n  createdAt: Date\n}`,
  answers:`// answers collection\n{\n  _id:        ObjectId,\n  questionId: ObjectId,  // → REF questions._id\n  authorId:   ObjectId,  // → REF users._id\n  body:       String,\n  votes:      [ObjectId], // ARRAY field\n  isAccepted: Boolean,\n  createdAt:  Date\n}`,
  aggregation:`db.questions.aggregate([\n  { $lookup: {\n      from:         "answers",\n      localField:   "_id",\n      foreignField: "questionId",\n      as:           "answers"\n  }},\n  { $lookup: {\n      from:         "users",\n      localField:   "authorId",\n      foreignField: "_id",\n      as:           "author"\n  }},\n  { $unwind: "$author" },\n  { $addFields: {\n      voteCount:   { $size: "$votes" },\n      answerCount: { $size: "$answers" },\n  }},\n  { $sort: { voteCount: -1 } }\n])`,
};

function SchemaPanel({ stats }) {
  const [tab,setTab]=useState("questions");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,animation:"fadeUp 0.4s ease"}}>
      <div style={{display:"flex",gap:6}}>
        {Object.keys(SCHEMAS).map(k=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            fontFamily:T.mono,fontSize:11,letterSpacing:"0.04em",
            padding:"5px 14px",borderRadius:20,
            background:tab===k?`${T.gold}18`:"transparent",
            border:`1px solid ${tab===k?T.gold+"55":T.border}`,
            color:tab===k?T.gold:T.text3,
          }}>{k}</button>
        ))}
      </div>
      <div style={{background:T.bg3,border:`1px solid ${T.border2}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{
          background:`linear-gradient(90deg,${T.gold}10,transparent)`,
          borderBottom:`1px solid ${T.border}`,padding:"8px 16px",
          display:"flex",alignItems:"center",gap:8,
        }}>
          <div style={{width:8,height:8,borderRadius:"50%",background:T.gold,boxShadow:`0 0 6px ${T.gold}`}}/>
          <span style={{fontFamily:T.mono,fontSize:11,color:T.text3,letterSpacing:"0.06em"}}>MONGODB SCHEMA</span>
        </div>
        <pre style={{fontFamily:T.mono,fontSize:12,lineHeight:1.8,color:T.text2,
          padding:"16px 20px",overflowX:"auto",margin:0,whiteSpace:"pre"}}>{SCHEMAS[tab]}</pre>
      </div>
      {tab==="questions"&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[{l:"tags[] → Array field",c:"#4f9ef8"},{l:"votes[] → Array of refs",c:T.gold},{l:"authorId → Reference",c:T.teal}].map(b=>(
            <span key={b.l} style={{fontSize:11,fontFamily:T.mono,background:`${b.c}12`,color:b.c,
              padding:"3px 10px",borderRadius:20,border:`1px solid ${b.c}33`,letterSpacing:"0.02em"}}>{b.l}</span>
          ))}
        </div>
      )}
      {stats?.length>0&&(
        <div>
          <div style={{fontSize:11,fontFamily:T.mono,color:T.text3,textTransform:"uppercase",
            letterSpacing:"0.08em",marginBottom:10}}>Live aggregation резултат</div>
          {stats.slice(0,4).map(s=>(
            <div key={s._id} style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:8,
              padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",
              marginBottom:6,transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.border2}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <span style={{fontSize:13,color:T.text2,flex:1,overflow:"hidden",textOverflow:"ellipsis",
                whiteSpace:"nowrap",paddingRight:12}}>{s.question?.title?.slice(0,40)}…</span>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <span style={{fontSize:10,fontFamily:T.mono,background:`${T.teal}15`,color:T.teal,
                  padding:"2px 8px",borderRadius:20,border:`1px solid ${T.teal}33`}}>{s.answerCount} отг</span>
                <span style={{fontSize:10,fontFamily:T.mono,background:`${T.gold}15`,color:T.gold,
                  padding:"2px 8px",borderRadius:20,border:`1px solid ${T.gold}33`}}>{s.totalVotes} гл</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, currentUser, onOpen, onVote, activeTag, onTagClick, idx }) {
  const hasVoted=q.votes?.some(v=>v===currentUser?._id||v?._id===currentUser?._id);
  return (
    <div style={{
      background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,
      padding:"20px 24px",cursor:"pointer",
      display:"grid",gridTemplateColumns:"52px 1fr auto",gap:20,alignItems:"start",
      transition:"border-color 0.2s, box-shadow 0.2s, transform 0.2s",
      animation:`fadeUp 0.4s ease ${idx*0.06}s both`,
      position:"relative",overflow:"hidden",
    }}
      onClick={()=>onOpen(q._id)}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.boxShadow=`0 4px 32px rgba(0,0,0,0.35)`;e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}
    >
      {q.hasAccepted&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
        background:`linear-gradient(180deg,${T.teal},${T.teal}44)`,borderRadius:"14px 0 0 14px"}}/>}
      <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"center",paddingTop:2}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:T.head,fontSize:20,fontWeight:700,color:T.text,lineHeight:1}}>{q.voteCount??0}</div>
          <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,letterSpacing:"0.06em",marginTop:2}}>ГЛАСА</div>
        </div>
        <Divider/>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:T.head,fontSize:17,fontWeight:700,lineHeight:1,
            color:q.hasAccepted?T.teal:q.answerCount>0?T.text2:T.text3}}>{q.answerCount??0}</div>
          <div style={{fontSize:9,fontFamily:T.mono,letterSpacing:"0.06em",marginTop:2,
            color:q.hasAccepted?T.teal:T.text3}}>{q.hasAccepted?"✓ ОТГ":"ОТГ"}</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:12,color:T.text3,fontFamily:T.mono}}>{q.views??0}</div>
          <div style={{fontSize:9,color:T.text3,fontFamily:T.mono,letterSpacing:"0.05em"}}>ПРЕГ</div>
        </div>
      </div>
      <div style={{minWidth:0}}>
        <h3 style={{fontFamily:T.head,fontSize:17,fontWeight:700,color:T.text,
          lineHeight:1.4,marginBottom:8,letterSpacing:"-0.01em"}}>{q.title}</h3>
        <p style={{fontSize:13,color:T.text2,lineHeight:1.65,marginBottom:14,
          overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{q.body}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {(q.tags||[]).map(t=>(
            <Tag key={t} label={t} active={t===activeTag}
              onClick={e=>{e.stopPropagation();onTagClick(t);}}/>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,fontSize:12,color:T.text3}}>
            <Avatar user={q.author} size={22}/>
            <span style={{fontWeight:500,color:T.text2}}>{q.author?.name}</span>
            <span style={{fontFamily:T.mono,fontSize:11}}>·</span>
            <span style={{fontFamily:T.mono,fontSize:11}}>{timeAgo(q.createdAt)}</span>
          </div>
        </div>
      </div>
      <div onClick={e=>{e.stopPropagation();onVote(q._id);}}>
        <VoteBtn count={q.voteCount??0} hasVoted={hasVoted} onVote={()=>{}} disabled={!currentUser}/>
      </div>
    </div>
  );
}

function QuestionDetail({ questionId, currentUser, onBack }) {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [body,setBody]=useState("");
  const [posting,setPosting]=useState(false);

  const load=useCallback(async()=>{
    try{setLoading(true);setData(await api.getQuestion(questionId));}
    catch(e){setError(e.message);}finally{setLoading(false);}
  },[questionId]);
  useEffect(()=>{load();},[load]);

  async function handleVoteQ(){if(!currentUser)return;await api.voteQuestion(questionId,currentUser._id);load();}
  async function handleVoteA(aId){if(!currentUser)return;await api.voteAnswer(aId,currentUser._id);load();}
  async function handleAccept(aId){await api.acceptAnswer(aId);load();}
  async function handlePost(){
    if(!body.trim()||!currentUser)return;setPosting(true);
    try{await api.postAnswer(questionId,{body,authorId:currentUser._id});setBody("");load();}
    catch(e){setError(e.message);}finally{setPosting(false);}
  }

  if(loading)return <Spinner/>;
  if(error)return <Err msg={error}/>;
  if(!data)return null;

  const{question:q,answers}=data;
  const qVoted=q.votes?.some(v=>v===currentUser?._id||v?._id===currentUser?._id);
  const isAuth=currentUser?._id===(q.authorId?._id||q.authorId);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,animation:"fadeUp 0.3s ease"}}>
      <button onClick={onBack} style={{alignSelf:"flex-start",background:"transparent",border:"none",
        color:T.text3,padding:0,fontSize:12,display:"flex",alignItems:"center",gap:6,
        fontFamily:T.mono,letterSpacing:"0.04em"}}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        НАЗАД
      </button>

      <div style={{background:T.bg2,border:`1px solid ${T.border2}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${T.bg3},${T.bg2})`,
          borderBottom:`1px solid ${T.border}`,padding:"24px 28px"}}>
          <h1 style={{fontFamily:T.head,fontSize:24,fontWeight:700,lineHeight:1.35,
            color:T.text,marginBottom:16,letterSpacing:"-0.01em"}}>{q.title}</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {(q.tags||[]).map(t=><Tag key={t} label={t}/>)}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              <Avatar user={q.authorId} size={24}/>
              <span style={{fontSize:13,color:T.text2,fontWeight:500}}>{q.authorId?.name}</span>
              <span style={{fontFamily:T.mono,fontSize:11,color:T.text3}}>· {timeAgo(q.createdAt)}</span>
              <span style={{fontFamily:T.mono,fontSize:11,color:T.text3}}>· {q.views} прег</span>
            </div>
          </div>
        </div>
        <div style={{padding:"24px 28px",display:"flex",gap:20}}>
          <VoteBtn count={q.votes?.length??0} hasVoted={qVoted} onVote={handleVoteQ} disabled={!currentUser} size="lg"/>
          <p style={{flex:1,fontSize:15,color:T.text2,lineHeight:1.8}}>{q.body}</p>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{height:1,flex:1,background:`linear-gradient(90deg,${T.border2},transparent)`}}/>
        <span style={{fontFamily:T.mono,fontSize:11,color:T.text3,letterSpacing:"0.1em"}}>{answers.length} ОТГОВОРА</span>
        <div style={{height:1,flex:1,background:`linear-gradient(270deg,${T.border2},transparent)`}}/>
      </div>

      {answers.map((ans,i)=>{
        const aVoted=ans.votes?.some(v=>v===currentUser?._id||v?._id===currentUser?._id);
        return (
          <div key={ans._id} style={{
            background:ans.isAccepted?`linear-gradient(135deg,${T.teal}08,${T.bg2})`:T.bg2,
            border:`1px solid ${ans.isAccepted?T.teal+"44":T.border}`,
            borderRadius:14,overflow:"hidden",animation:`fadeUp 0.4s ease ${i*0.08}s both`,
          }}>
            {ans.isAccepted&&(
              <div style={{background:`linear-gradient(90deg,${T.teal}22,transparent)`,
                borderBottom:`1px solid ${T.teal}33`,padding:"7px 20px",
                display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:T.teal,boxShadow:`0 0 6px ${T.teal}`}}/>
                <span style={{fontSize:11,color:T.teal,fontFamily:T.mono,fontWeight:500,letterSpacing:"0.06em"}}>ПРИЕТ ОТГОВОР</span>
              </div>
            )}
            <div style={{padding:"20px 24px",display:"flex",gap:18}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <VoteBtn count={ans.votes?.length??0} hasVoted={aVoted}
                  onVote={()=>handleVoteA(ans._id)} disabled={!currentUser}/>
                {isAuth&&!ans.isAccepted&&(
                  <button onClick={()=>handleAccept(ans._id)} title="Приеми"
                    style={{background:"transparent",border:`1px solid ${T.border}`,
                      borderRadius:8,padding:"6px 9px",color:T.text3,transition:"all 0.18s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.teal;e.currentTarget.style.color=T.teal;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text3;}}>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:14,color:T.text,lineHeight:1.8,marginBottom:14}}>{ans.body}</p>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Avatar user={ans.authorId} size={22}/>
                  <span style={{fontSize:13,color:T.text2,fontWeight:500}}>{ans.authorId?.name}</span>
                  <span style={{fontFamily:T.mono,fontSize:11,color:T.text3}}>· {timeAgo(ans.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"24px 28px"}}>
        <div style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:T.text,
          marginBottom:16,letterSpacing:"-0.01em"}}>Твоят отговор</div>
        {!currentUser?<p style={{fontSize:13,color:T.text3,fontFamily:T.mono}}>Избери потребител за да отговориш.</p>:(
          <>
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Напиши отговор..." rows={5} style={{marginBottom:14}}/>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button onClick={handlePost} disabled={!body.trim()||posting} style={{
                background:body.trim()?`linear-gradient(135deg,${T.gold}22,${T.gold}08)`:"transparent",
                border:`1px solid ${body.trim()?T.gold+"66":T.border}`,
                color:body.trim()?T.gold:T.text3,padding:"9px 22px",fontWeight:600,
                boxShadow:body.trim()?`0 0 20px ${T.gold}15`:"none",
              }}>{posting?"Публикуване…":"Публикувай отговор"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AskForm({ currentUser, onSuccess, onCancel }) {
  const [form,setForm]=useState({title:"",body:"",tags:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  async function submit(){
    if(!form.title.trim())return;setLoading(true);
    try{await api.createQuestion({...form,authorId:currentUser._id});onSuccess();}
    catch(e){setError(e.message);}finally{setLoading(false);}
  }
  return (
    <div style={{background:T.bg2,border:`1px solid ${T.border2}`,borderRadius:16,overflow:"hidden",animation:"fadeUp 0.35s ease"}}>
      <div style={{background:`linear-gradient(135deg,${T.gold}12,transparent)`,
        borderBottom:`1px solid ${T.border}`,padding:"20px 28px",
        display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:T.gold,boxShadow:`0 0 8px ${T.gold}`}}/>
        <h2 style={{fontFamily:T.head,fontSize:20,fontWeight:700,color:T.text,letterSpacing:"-0.01em"}}>Задай въпрос</h2>
      </div>
      <div style={{padding:"24px 28px",display:"flex",flexDirection:"column",gap:18}}>
        {error&&<Err msg={error}/>}
        {[
          {k:"title",l:"Заглавие",ph:"Как работи…?"},
          {k:"body",l:"Описание",ph:"Дай повече контекст…",area:true},
          {k:"tags",l:"Тагове (разделени със запетая)",ph:"mongodb, aggregation, schema"},
        ].map(f=>(
          <div key={f.k}>
            <label style={{fontSize:11,fontFamily:T.mono,color:T.text3,letterSpacing:"0.08em",
              textTransform:"uppercase",display:"block",marginBottom:8}}>{f.l}</label>
            {f.area
              ?<textarea value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} rows={4}/>
              :<input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}/>
            }
          </div>
        ))}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
          <button onClick={onCancel}>Откажи</button>
          <button onClick={submit} disabled={!form.title.trim()||loading} style={{
            background:form.title.trim()?`linear-gradient(135deg,${T.gold}25,${T.gold}08)`:"transparent",
            border:`1px solid ${form.title.trim()?T.gold+"66":T.border}`,
            color:form.title.trim()?T.gold:T.text3,
            padding:"8px 22px",fontWeight:600,
            boxShadow:form.title.trim()?`0 0 20px ${T.gold}12`:"none",
          }}>{loading?"Публикуване…":"Публикувай въпрос"}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [users,setUsers]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [questions,setQuestions]=useState([]);
  const [stats,setStats]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [view,setView]=useState("list");
  const [selectedQId,setSelectedQId]=useState(null);
  const [sort,setSort]=useState("votes");
  const [activeTag,setActiveTag]=useState("");

  const loadQ=useCallback(async()=>{
    try{setQuestions(await api.getQuestions(sort,activeTag));}catch(e){setError(e.message);}
  },[sort,activeTag]);

  useEffect(()=>{
    (async()=>{
      try{
        const[us,qs,st]=await Promise.all([api.getUsers(),api.getQuestions("votes",""),api.getStats()]);
        setUsers(us);setCurrentUser(us[0]||null);setQuestions(qs);setStats(st);
      }catch(e){setError(e.message);}finally{setLoading(false);}
    })();
  },[]);
  useEffect(()=>{if(!loading)loadQ();},[sort,activeTag]);

  async function handleVoteQ(qId){
    if(!currentUser)return;
    await api.voteQuestion(qId,currentUser._id);loadQ();api.getStats().then(setStats);
  }

  const totalVotes=questions.reduce((s,q)=>s+(q.voteCount||0),0);
  const totalAnswers=stats.reduce((s,x)=>s+(x.answerCount||0),0);
  const totalAccepted=stats.filter(x=>x.hasAccepted).length;
  const allTags=[...new Set(questions.flatMap(q=>q.tags||[]))];

  return (
    <div style={{minHeight:"100vh",background:T.bg}}>
      {/* Header */}
      <header style={{
        background:`${T.bg2}ee`,backdropFilter:"blur(14px)",
        borderBottom:`1px solid ${T.border}`,padding:"0 32px",
        display:"flex",alignItems:"center",gap:20,height:58,
        position:"sticky",top:0,zIndex:100,
      }}>
        <div onClick={()=>{setView("list");setSelectedQId(null);}}
          style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:8,
            background:`linear-gradient(135deg,${T.gold}33,${T.gold}11)`,
            border:`1px solid ${T.gold}44`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:15,boxShadow:`0 0 12px ${T.gold}22`}}>✦</div>
          <div>
            <div style={{fontFamily:T.head,fontSize:16,fontWeight:700,color:T.text,lineHeight:1}}>QA Forum</div>
            <div style={{fontFamily:T.mono,fontSize:9,color:T.text3,letterSpacing:"0.1em",lineHeight:1.4}}>MONGODB</div>
          </div>
        </div>

        <div style={{display:"flex",gap:4,marginLeft:4}}>
          {[{key:"list",label:"ВЪПРОСИ"},{key:"schema",label:"SCHEMA"}].map(n=>(
            <button key={n.key} onClick={()=>{setView(n.key);setSelectedQId(null);}} style={{
              fontFamily:T.mono,fontSize:10,letterSpacing:"0.08em",
              padding:"5px 14px",borderRadius:20,
              background:view===n.key?`${T.gold}15`:"transparent",
              border:`1px solid ${view===n.key?T.gold+"44":"transparent"}`,
              color:view===n.key?T.gold:T.text3,
            }}>{n.label}</button>
          ))}
        </div>

        <div style={{flex:1}}/>

        {view==="list"&&(
          <select value={sort} onChange={e=>setSort(e.target.value)}
            style={{width:"auto",fontSize:12,fontFamily:T.mono}}>
            <option value="votes">По гласове</option>
            <option value="newest">По нови</option>
            <option value="answers">По отговори</option>
          </select>
        )}

        <div style={{width:1,height:22,background:T.border}}/>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Avatar user={currentUser} size={28}/>
          <select value={currentUser?._id||""}
            onChange={e=>setCurrentUser(users.find(u=>u._id===e.target.value)||null)}
            style={{width:"auto",fontSize:12,fontFamily:T.mono}}>
            {users.map(u=><option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>

        <button onClick={()=>setView("ask")} disabled={!currentUser} style={{
          background:`linear-gradient(135deg,${T.gold}25,${T.gold}08)`,
          border:`1px solid ${T.gold}55`,color:T.gold,fontWeight:600,
          padding:"7px 18px",boxShadow:`0 0 16px ${T.gold}12`,
        }}>+ Въпрос</button>
      </header>

      {/* Layout */}
      <div style={{maxWidth:1180,margin:"0 auto",padding:"28px 24px",
        display:"grid",gridTemplateColumns:"1fr 276px",gap:24,alignItems:"start"}}>

        <main>
          {loading&&<Spinner/>}
          {error&&<Err msg={`Грешка: ${error}`}/>}
          {!loading&&view==="schema"&&<SchemaPanel stats={stats}/>}
          {!loading&&view==="ask"&&currentUser&&(
            <AskForm currentUser={currentUser} onSuccess={()=>{setView("list");loadQ();}} onCancel={()=>setView("list")}/>
          )}
          {!loading&&view==="question"&&selectedQId&&(
            <QuestionDetail questionId={selectedQId} currentUser={currentUser}
              onBack={()=>{setView("list");loadQ();}}/>
          )}
          {!loading&&view==="list"&&(
            <div>
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20}}>
                <div>
                  <div style={{fontFamily:T.mono,fontSize:10,color:T.text3,letterSpacing:"0.1em",
                    textTransform:"uppercase",marginBottom:4}}>
                    {activeTag?`Таг: #${activeTag}`:"Всички въпроси"}
                  </div>
                  <h2 style={{fontFamily:T.head,fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.02em"}}>
                    {questions.length} въпроса
                  </h2>
                </div>
                {activeTag&&(
                  <button onClick={()=>setActiveTag("")} style={{
                    fontFamily:T.mono,fontSize:11,color:T.text3,
                    border:`1px solid ${T.border}`,padding:"4px 12px",borderRadius:20}}>
                    × изчисти #{activeTag}
                  </button>
                )}
              </div>
              {questions.length===0?(
                <div style={{textAlign:"center",padding:"60px 0",color:T.text3,
                  fontFamily:T.mono,fontSize:12,letterSpacing:"0.06em"}}>
                  НЯМА ВЪПРОСИ — БЪДИ ПЪРВИЯТ
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {questions.map((q,i)=>(
                    <QuestionCard key={q._id} q={q} idx={i} currentUser={currentUser}
                      onOpen={id=>{setSelectedQId(id);setView("question");}}
                      onVote={handleVoteQ} activeTag={activeTag}
                      onTagClick={tag=>{setActiveTag(p=>p===tag?"":tag);setView("list");}}/>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside style={{display:"flex",flexDirection:"column",gap:16,position:"sticky",top:78}}>

          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
            <div style={{background:`linear-gradient(135deg,${T.bg3},${T.bg2})`,
              borderBottom:`1px solid ${T.border}`,padding:"12px 18px",
              display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:T.teal,
                boxShadow:`0 0 6px ${T.teal}`,animation:"pulse 2s infinite"}}/>
              <span style={{fontFamily:T.mono,fontSize:10,color:T.text3,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                Live статистики
              </span>
            </div>
            <div style={{padding:"18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <StatBadge value={questions.length} label="Въпроси" color={T.gold}/>
              <StatBadge value={totalAnswers}     label="Отговори" color={T.teal}/>
              <StatBadge value={totalVotes}       label="Гласа"    color="#4f9ef8"/>
              <StatBadge value={totalAccepted}    label="Приети"   color={T.text2}/>
            </div>
          </div>

          {allTags.length>0&&(
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px"}}>
              <div style={{fontFamily:T.mono,fontSize:10,color:T.text3,letterSpacing:"0.1em",
                textTransform:"uppercase",marginBottom:12}}>Тагове</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {allTags.slice(0,16).map(tag=>(
                  <Tag key={tag} label={tag} active={tag===activeTag}
                    onClick={()=>{setActiveTag(p=>p===tag?"":tag);setView("list");}}/>
                ))}
              </div>
            </div>
          )}

          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontFamily:T.mono,fontSize:10,color:T.text3,letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:12}}>Потребители</div>
            {users.map(u=>(
              <div key={u._id} onClick={()=>setCurrentUser(u)} style={{
                display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,
                cursor:"pointer",marginBottom:4,
                background:currentUser?._id===u._id?`${T.gold}0f`:"transparent",
                border:`1px solid ${currentUser?._id===u._id?T.gold+"33":"transparent"}`,
                transition:"all 0.15s",
              }}
                onMouseEnter={e=>{if(currentUser?._id!==u._id)e.currentTarget.style.background="rgba(255,255,255,0.02)";}}
                onMouseLeave={e=>{if(currentUser?._id!==u._id)e.currentTarget.style.background="transparent";}}>
                <Avatar user={u} size={30}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:currentUser?._id===u._id?T.text:T.text2}}>{u.name}</div>
                  <div style={{fontFamily:T.mono,fontSize:9,color:T.text3,letterSpacing:"0.04em"}}>{u._id?.slice(-8)}</div>
                </div>
                {currentUser?._id===u._id&&(
                  <div style={{width:6,height:6,borderRadius:"50%",background:T.gold,
                    boxShadow:`0 0 6px ${T.gold}`,flexShrink:0}}/>
                )}
              </div>
            ))}
          </div>

          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 18px"}}>
            <div style={{fontFamily:T.mono,fontSize:10,color:T.text3,letterSpacing:"0.1em",
              textTransform:"uppercase",marginBottom:10}}>Docker · bridge network</div>
            {[{name:"frontend",port:"5173",color:"#4f9ef8"},{name:"backend",port:"5000",color:T.gold},{name:"mongo",port:"27017",color:T.teal}].map(s=>(
              <div key={s.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                fontFamily:T.mono,fontSize:11,marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:s.color,boxShadow:`0 0 4px ${s.color}`}}/>
                  <span style={{color:s.color}}>{s.name}</span>
                </div>
                <span style={{color:T.text3}}>:{s.port}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes votePop{0%{transform:scale(1)}40%{transform:scale(1.38)}70%{transform:scale(0.9)}100%{transform:scale(1)}}
      `}</style>
    </div>
  );
}
