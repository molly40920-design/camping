// Main App Component
function App() {
  const [roomId,setRoomId]=useState(()=>{let r=null;if(typeof window!=='undefined'){r=new URLSearchParams(window.location.search).get('room')};return r||localStorage.getItem('campsync_roomId')||''});
  const [userName,setUserName]=useState(()=>localStorage.getItem('campsync_userName')||'');
  const [password,setPassword]=useState('');
  const [loginMode,setLoginMode]=useState('join');
  const [loginError,setLoginError]=useState('');
  const [loginLoading,setLoginLoading]=useState(false);
  const [isJoined,setIsJoined]=useState(()=>localStorage.getItem('campsync_isJoined')==='true');
  const [hasEnteredCamp,setHasEnteredCamp]=useState(()=>localStorage.getItem('campsync_hasEnteredCamp')==='true');
  const [members,setMembers]=useState([]);
  const [sharedItems,setSharedItems]=useState([]); // 公共裝備 + 伙食 (from Google Sheet)
  const [prepItems,setPrepItems]=useState([]);     // 個人行李 (from localStorage, 私密)
  const [currentTab,setCurrentTab]=useState('equipment');
  const [isModalOpen,setIsModalOpen]=useState(false);
  const [isImportModalOpen,setIsImportModalOpen]=useState(false);
  const [isMemberModalOpen,setIsMemberModalOpen]=useState(false);
  const [editingItem,setEditingItem]=useState(null);
  const [itemToDelete,setItemToDelete]=useState(null);
  const [isImporting,setIsImporting]=useState(false);
  const [isEndModalOpen,setIsEndModalOpen]=useState(false);
  const [syncStatus,setSyncStatus]=useState('idle');

  // ===== 個人行李 localStorage 工具 =====
  const getPrepKey = useCallback(()=>{
    if(!roomId||!userName) return null;
    return 'campsync_prep_'+roomId.toLowerCase()+'_'+userName;
  },[roomId,userName]);

  const loadPrepItems = useCallback(()=>{
    const key=getPrepKey();
    if(!key) return;
    try{
      const raw=localStorage.getItem(key);
      if(raw){setPrepItems(JSON.parse(raw))}else{setPrepItems([])}
    }catch(e){setPrepItems([])}
  },[getPrepKey]);

  const savePrepItems = useCallback((items)=>{
    const key=getPrepKey();
    if(!key) return;
    setPrepItems(items);
    localStorage.setItem(key,JSON.stringify(items));
  },[getPrepKey]);

  // ===== 共用 items (equipment + meal) 從 Google Sheet =====
  const fetchRetryCount = useRef(0);
  const isSyncingRef = useRef(false);

  const fetchRoomData = useCallback(async()=>{
    if(!roomId)return;
    if(isSyncingRef.current) return;
    try{
      const res=await fetch(`${GAS_URL}?roomId=${roomId.toUpperCase()}&t=${Date.now()}`);
      const result=await res.json();
      if(result.success){
        if(result.roomDeleted){
          if(result.debug) console.warn('[CampSync] Room not found debug:', JSON.stringify(result.debug));
          fetchRetryCount.current++;
          if(fetchRetryCount.current<=3) return;
          fetchRetryCount.current=0;
          alert("此房間已被刪除。");handleLeaveRoom();return;
        }
        fetchRetryCount.current=0;
        if(!isSyncingRef.current){
          setSharedItems(result.items||[]);
          setMembers(Array.from(new Set([...(result.members||[]),userName])));
        }
      }else if(result.error==='ROOM_CLOSED'){alert("此房間活動已結束並封存。");handleLeaveRoom()}
    }catch(e){console.error("Fetch Error:",e)}
  },[roomId,userName]);

  // 加入房間後開始輪詢 + 載入個人行李
  useEffect(()=>{
    if(!isJoined||!roomId) return;
    fetchRetryCount.current=0;
    loadPrepItems();
    fetchRoomData();
    const iv=setInterval(fetchRoomData,3000);
    return()=>clearInterval(iv);
  },[isJoined,roomId,fetchRoomData,loadPrepItems]);

  useEffect(()=>{if(isJoined)localStorage.setItem('campsync_hasEnteredCamp',hasEnteredCamp.toString())},[hasEnteredCamp,isJoined]);

  // 合併 items 供「進入營地」後的公共頁面使用
  const allItems = useMemo(()=>[...sharedItems,...prepItems],[sharedItems,prepItems]);

  // ===== 同步共用 items 到 Google Sheet =====
  const syncToSheet=async(action,data)=>{
    if(!roomId)return;
    isSyncingRef.current=true;
    setSyncStatus('syncing');
    if(action==='upsert'){
      const arr=Array.isArray(data)?data:[data];
      setSharedItems(prev=>{const n=[...prev];arr.forEach(ni=>{const idx=n.findIndex(i=>i.id===ni.id);if(idx>-1)n[idx]=ni;else n.push(ni)});return n});
    }else if(action==='delete'){
      setSharedItems(prev=>prev.filter(i=>i.id!==data.id));
    }
    try{
      const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,roomId:roomId.toUpperCase(),data})});
      const result=await res.json();
      if(!result.success) console.error('[CampSync] Sync failed:', result.error);
      if(result.error==='ROOM_CLOSED'){alert("此房間活動已結束並封存。");handleLeaveRoom();return}
      setSyncStatus('saved');setTimeout(()=>setSyncStatus('idle'),3000);
    }catch(e){console.error("Sync Error:",e);setSyncStatus('error')}
    finally{isSyncingRef.current=false}
  };

  // ===== 個人行李操作 (純 localStorage) =====
  const savePrepItem=(itemData)=>{
    const tid=itemData.id||genId();
    const item={...itemData,id:tid,type:'prep',assignee:userName,payer:userName,updatedAt:new Date().toISOString()};
    const updated=prepItems.some(i=>i.id===tid)
      ? prepItems.map(i=>i.id===tid?item:i)
      : [...prepItems,item];
    savePrepItems(updated);
  };

  const deletePrepItem=(id)=>{
    savePrepItems(prepItems.filter(i=>i.id!==id));
  };

  const togglePrepPacked=(item)=>{
    savePrepItems(prepItems.map(i=>i.id===item.id?{...i,isPacked:!i.isPacked}:i));
  };

  const handleBatchImport=async(sel)=>{
    if(!roomId||sel.length===0)return;setIsImporting(true);
    const ni=sel.map(name=>({id:genId()+Math.random().toString(36).substr(2,5),type:'prep',name,assignee:userName,isPacked:false,price:0,payer:userName,updatedAt:new Date().toISOString()}));
    savePrepItems([...prepItems,...ni]);
    setIsImportModalOpen(false);setIsImporting(false);
  };

  // ===== 共用 items 操作 (Google Sheet) =====
  const saveSharedItem=async(itemData)=>{
    if(!userName||!roomId)return;
    const tid=itemData.id||genId();
    await syncToSheet('upsert',{...itemData,id:tid,updatedAt:new Date().toISOString()});
    setIsModalOpen(false);setEditingItem(null);
  };

  const deleteSharedItem=async()=>{
    if(!userName||!roomId||!itemToDelete)return;
    if(itemToDelete.type==='prep'){
      deletePrepItem(itemToDelete.id);
    }else{
      await syncToSheet('delete',{id:itemToDelete.id});
    }
    setItemToDelete(null);
  };

  const toggleSharedPacked=async(item)=>{
    if(!userName||!roomId||!item.id)return;
    if(item.type==='prep'){
      togglePrepPacked(item);
    }else{
      await syncToSheet('upsert',{...item,isPacked:!item.isPacked});
    }
  };

  // ===== 統一 save 入口 =====
  const saveItem=async(itemData)=>{
    if(!userName||!roomId)return;
    if(itemData.type==='prep'){
      savePrepItem(itemData);
      setIsModalOpen(false);setEditingItem(null);
    }else{
      await saveSharedItem(itemData);
    }
  };

  // ===== 建立新房間 =====
  const handleCreateRoom=async(ev)=>{
    if(ev)ev.preventDefault();
    if(!roomId.trim()||!userName.trim()||!password.trim()){setLoginError('請填寫所有欄位');return}
    const fId=roomId.trim().toUpperCase();
    setLoginLoading(true);setLoginError('');
    try{
      const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'create_room',roomId:fId,data:{userName:userName.trim(),password:password.trim()}})});
      const result=await res.json();
      if(result.success){
        setRoomId(fId.toLowerCase());setIsJoined(true);setHasEnteredCamp(false);setPassword('');
        localStorage.setItem('campsync_roomId',fId.toLowerCase());localStorage.setItem('campsync_userName',userName.trim());
        localStorage.setItem('campsync_isJoined','true');localStorage.setItem('campsync_hasEnteredCamp','false');
      }else{
        if(result.error==='ROOM_EXISTS')setLoginError('此房間代碼已被使用中，請換一個代碼或選擇「加入房間」');
        else setLoginError('建立房間失敗：'+(result.error||'未知錯誤'));
      }
    }catch(error){setLoginError('建立房間失敗，請檢查網路連線')}
    finally{setLoginLoading(false)}
  };

  // ===== 加入已有房間 =====
  const handleJoinRoom=async(ev)=>{
    if(ev)ev.preventDefault();
    if(!roomId.trim()||!userName.trim()||!password.trim()){setLoginError('請填寫所有欄位');return}
    const fId=roomId.trim().toUpperCase();
    setLoginLoading(true);setLoginError('');
    try{
      const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'join',roomId:fId,data:{userName:userName.trim(),password:password.trim()}})});
      const result=await res.json();
      if(result.success){
        setRoomId(fId.toLowerCase());setIsJoined(true);setHasEnteredCamp(false);setPassword('');
        localStorage.setItem('campsync_roomId',fId.toLowerCase());localStorage.setItem('campsync_userName',userName.trim());
        localStorage.setItem('campsync_isJoined','true');localStorage.setItem('campsync_hasEnteredCamp','false');
      }else{
        if(result.error==='ROOM_NOT_FOUND')setLoginError('找不到此房間，請確認代碼是否正確');
        else if(result.error==='WRONG_PASSWORD')setLoginError('密碼錯誤，請重新輸入');
        else if(result.error==='ROOM_CLOSED')setLoginError('這組房間代碼已經結束使用了！');
        else if(result.error==='MISSING_PASSWORD')setLoginError('請輸入密碼');
        else setLoginError('加入房間失敗：'+(result.error||'未知錯誤'));
      }
    }catch(error){setLoginError('加入房間失敗，請檢查網路連線')}
    finally{setLoginLoading(false)}
  };

  // ===== URL 自動加入 =====
  useEffect(()=>{
    const autoJoin=async()=>{
      if(typeof window==='undefined')return;
      const room=new URLSearchParams(window.location.search).get('room');
      const pwd=new URLSearchParams(window.location.search).get('pwd');
      if(room&&userName&&!isJoined&&pwd){
        const fId=room.trim().toUpperCase();
        try{
          const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'join',roomId:fId,data:{userName:userName.trim(),password:pwd}})});
          const result=await res.json();
          if(result.success){
            setRoomId(fId.toLowerCase());setIsJoined(true);setHasEnteredCamp(false);
            localStorage.setItem('campsync_roomId',fId.toLowerCase());localStorage.setItem('campsync_userName',userName.trim());
            localStorage.setItem('campsync_isJoined','true');localStorage.setItem('campsync_hasEnteredCamp','false');
            window.history.replaceState({},document.title,window.location.pathname);
          }else{
            if(result.error==='WRONG_PASSWORD')setLoginError('連結中的密碼錯誤，請手動輸入密碼加入');
            else if(result.error==='ROOM_NOT_FOUND')setLoginError('連結中的房間不存在');
          }
        }catch(e){console.error("Auto join failed:",e)}
      }
    };autoJoin();
  },[isJoined,userName]);

  const handleLeaveRoom=()=>{
    setIsJoined(false);setRoomId('');setSharedItems([]);setPrepItems([]);setMembers([]);setHasEnteredCamp(false);setPassword('');setLoginError('');
    ['campsync_roomId','campsync_userName','campsync_isJoined','campsync_hasEnteredCamp'].forEach(k=>localStorage.removeItem(k));
  };

  const handleEndActivity=async()=>{
    if(!roomId)return;
    try{setSyncStatus('syncing');
      await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'delete_sheet',roomId:roomId.toUpperCase()})});
      // 清除個人行李
      const key=getPrepKey();
      if(key) localStorage.removeItem(key);
      setIsEndModalOpen(false);alert('活動已結束！房間已封存。');handleLeaveRoom();
    }catch(e){console.error("End Error:",e);alert('刪除過程中發生錯誤');setSyncStatus('error')}
  };

  const getCurrentType=()=>{if(!hasEnteredCamp)return'prep';if(currentTab==='meals')return'meal';return'equipment'};

  const e=React.createElement;
  const syncBadge = syncStatus!=='idle'&&e('span',{className:`text-[10px] font-normal flex items-center gap-1 px-2 py-0.5 rounded-full ml-2 ${syncStatus==='syncing'?'bg-white/20 text-white':syncStatus==='saved'?'bg-emerald-400/20 text-emerald-100':'bg-red-400/20 text-red-100'} transition-opacity duration-300`},
    syncStatus==='syncing'&&e(React.Fragment,{},e(Icon,{name:'loader2',size:12,className:"anim-spin"}),' 同步中'),
    syncStatus==='saved'&&e(React.Fragment,{},e(Icon,{name:'check',size:12}),' 已儲存'),
    syncStatus==='error'&&e(React.Fragment,{},e(Icon,{name:'alertTriangle',size:12}),' 失敗')
  );

  // ===== Login Screen =====
  if(!isJoined){
    const isCreate = loginMode==='create';
    const handleSubmit = isCreate ? handleCreateRoom : handleJoinRoom;
    return e('div',{className:"min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-50 flex flex-col items-center justify-center p-4"},
      e('div',{className:"max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden anim-fadeIn"},
        e('div',{className:"bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-center"},
          e('div',{className:"w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"},e(Icon,{name:'tent',size:32,className:"text-emerald-600"})),
          e('h1',{className:"text-3xl font-extrabold text-white tracking-wider"},'CampSync'),
          e('p',{className:"text-emerald-100 mt-2"},'輕量化露營協作平台')
        ),
        e('div',{className:"flex border-b border-slate-200"},
          e('button',{type:"button",onClick:()=>{setLoginMode('create');setLoginError('')},className:`flex-1 py-3 text-sm font-semibold transition-colors ${isCreate?'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50':'text-slate-400 hover:text-slate-600'}`},'🏕️ 建立新房間'),
          e('button',{type:"button",onClick:()=>{setLoginMode('join');setLoginError('')},className:`flex-1 py-3 text-sm font-semibold transition-colors ${!isCreate?'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50':'text-slate-400 hover:text-slate-600'}`},'🚪 加入房間')
        ),
        e('form',{onSubmit:handleSubmit,className:"p-8 space-y-5"},
          e('div',{},
            e('label',{className:"block text-sm font-medium text-slate-700 mb-2"},'你的暱稱'),
            e('div',{className:"relative"},
              e('div',{className:"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"},e(Icon,{name:'user',size:20,className:"text-slate-400"})),
              e('input',{type:"text",required:true,value:userName,onChange:ev=>setUserName(ev.target.value),className:"w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all",placeholder:"例如：小明"})
            )
          ),
          e('div',{},
            e('label',{className:"block text-sm font-medium text-slate-700 mb-2"},'房間代碼'),
            e('div',{className:"relative"},
              e('div',{className:"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"},e(Icon,{name:'users',size:20,className:"text-slate-400"})),
              e('input',{type:"text",required:true,value:roomId,onChange:ev=>setRoomId(ev.target.value),className:"w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all",placeholder:isCreate?"自訂一個房間代碼":"輸入要加入的房間代碼"})
            )
          ),
          e('div',{},
            e('label',{className:"block text-sm font-medium text-slate-700 mb-2"},isCreate?'設定房間密碼':'房間密碼'),
            e('div',{className:"relative"},
              e('div',{className:"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"},
                e('svg',{xmlns:"http://www.w3.org/2000/svg",width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-slate-400"},
                  e('rect',{width:18,height:11,x:3,y:11,rx:2,ry:2}),
                  e('path',{d:"M7 11V7a5 5 0 0 1 10 0v4"})
                )
              ),
              e('input',{type:"password",required:true,value:password,onChange:ev=>setPassword(ev.target.value),className:"w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all",placeholder:isCreate?"設定密碼（分享給隊友）":"輸入房間密碼"})
            )
          ),
          loginError&&e('div',{className:"bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2"},
            e(Icon,{name:'alertTriangle',size:16}),e('span',{},loginError)
          ),
          e('button',{type:"submit",disabled:loginLoading,className:"w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"},
            loginLoading
              ? e(React.Fragment,{},e(Icon,{name:'loader2',size:20,className:"anim-spin"}),' 處理中...')
              : e(React.Fragment,{},isCreate?'建立房間並進入':'加入房間',' ',e(Icon,{name:'arrowRight',size:20}))
          ),
          e('p',{className:"text-center text-xs text-slate-400 mt-1"},
            isCreate?'建立後將密碼分享給隊友，他們即可使用「加入房間」進入':'請向房間建立者取得代碼與密碼'
          )
        )
      )
    );
  }

  // ===== Main App =====
  return e('div',{className:"min-h-screen bg-slate-50 flex justify-center"},
    e('div',{className:"w-full max-w-md bg-white min-h-screen relative shadow-2xl flex flex-col"},
      // Header
      e('header',{className:`${hasEnteredCamp?'bg-gradient-to-r from-emerald-600 to-emerald-500':'bg-slate-800'} text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md transition-colors duration-500`},
        e('div',{},
          e('h1',{className:"font-bold text-lg flex items-center gap-2"},
            e(Icon,{name:hasEnteredCamp?'tent':'backpack',size:20}),
            hasEnteredCamp?('房間：'+roomId.toUpperCase()):'個人行前準備',
            syncBadge
          ),
          e('p',{className:"text-xs text-white/80 mt-0.5"},'我是：'+userName)
        ),
        e('div',{className:"flex items-center gap-2"},
          hasEnteredCamp&&e('button',{onClick:()=>setHasEnteredCamp(false),className:"p-2 bg-emerald-700 hover:bg-emerald-800 rounded-full transition-colors",title:"回個人清單"},e(Icon,{name:'clipboardList',size:16})),
          e('button',{onClick:()=>setIsMemberModalOpen(true),className:`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors text-xs font-medium ${hasEnteredCamp?'bg-emerald-700/50 hover:bg-emerald-700':'bg-slate-700 hover:bg-slate-600'}`},e(Icon,{name:'users',size:12}),e('span',{},members.length)),
          e('button',{onClick:handleLeaveRoom,className:`p-2 rounded-full transition-colors ${hasEnteredCamp?'hover:bg-emerald-700':'hover:bg-slate-700'}`,title:"登出"},e(Icon,{name:'logOut',size:20}))
        )
      ),
      // Main content
      e('main',{className:"flex-1 overflow-y-auto p-4 pb-24"},
        // === 個人行前準備頁 ===
        !hasEnteredCamp&&e('div',{className:"space-y-6 anim-fadeIn"},
          e('div',{className:"bg-gradient-to-r from-slate-100 to-emerald-50 p-4 rounded-xl border border-slate-200"},
            e('h2',{className:"text-xl font-bold text-slate-800 mb-1"},'嗨，'+userName+' 👋'),
            e('p',{className:"text-slate-500 text-sm"},'出發前，先檢查自己的行李吧！'),
            e('p',{className:"text-emerald-600 text-xs mt-1 flex items-center gap-1"},
              e('svg',{xmlns:"http://www.w3.org/2000/svg",width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
                e('rect',{width:18,height:11,x:3,y:11,rx:2,ry:2}),e('path',{d:"M7 11V7a5 5 0 0 1 10 0v4"})
              ),
              ' 你的行李清單是私密的，其他同行者看不到'
            )
          ),
          e('div',{className:"space-y-4"},
            e('div',{className:"flex justify-between items-end"},
              e('h3',{className:"font-bold text-slate-700 flex items-center gap-2"},e(Icon,{name:'backpack',size:20,className:"text-emerald-600"}),' 我的行李清單 ',e('span',{className:"text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"},prepItems.filter(i=>i.isPacked).length+'/'+prepItems.length)),
              e('button',{onClick:()=>setIsImportModalOpen(true),className:"text-emerald-600 text-sm font-semibold hover:text-emerald-700 flex items-center gap-1"},e(Icon,{name:'listChecks',size:16}),' 快速匯入')
            ),
            e(ItemList,{items:prepItems,emptyMessage:"你的行李空空如也。點擊「快速匯入」或右下角新增！",emptyIcon:e(Icon,{name:'backpack',size:48,className:"text-slate-300"}),onToggle:toggleSharedPacked,onEdit:i=>{setEditingItem(i);setIsModalOpen(true)},onDelete:setItemToDelete,isPersonal:true})
          ),
          e('div',{className:"pt-4"},
            e('button',{onClick:()=>{setHasEnteredCamp(true);localStorage.setItem('campsync_hasEnteredCamp','true')},className:"w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"},e(Icon,{name:'doorOpen',size:24}),' 準備好了，進入營地！'),
            e('p',{className:"text-center text-xs text-slate-400 mt-3"},'進入後可以查看大家的公共裝備與伙食分配')
          )
        ),
        // === 進入營地後的公共頁面 ===
        hasEnteredCamp&&e('div',{className:"anim-fadeIn"},
          currentTab==='equipment'&&e(ItemList,{items:sharedItems.filter(i=>i.type==='equipment'),onToggle:toggleSharedPacked,onEdit:i=>{setEditingItem(i);setIsModalOpen(true)},onDelete:setItemToDelete}),
          currentTab==='meals'&&e(MealList,{items:sharedItems.filter(i=>i.type==='meal'),onToggle:toggleSharedPacked,onEdit:i=>{setEditingItem(i);setIsModalOpen(true)},onDelete:setItemToDelete}),
          currentTab==='settlement'&&e(SettlementView,{items:allItems,members,onEndActivity:()=>setIsEndModalOpen(true)})
        )
      ),
      // FAB
      currentTab!=='settlement'&&e('button',{onClick:()=>{setEditingItem(null);setIsModalOpen(true)},className:`fixed bottom-24 right-4 sm:absolute text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-10 ${hasEnteredCamp?'bg-emerald-500 hover:bg-emerald-600':'bg-slate-700 hover:bg-slate-800'}`},e(Icon,{name:'plus',size:24})),
      // Bottom nav
      hasEnteredCamp&&e('nav',{className:"bg-white border-t border-slate-200 fixed bottom-0 w-full max-w-md flex justify-around p-2 pb-safe z-20"},
        e(NavButton,{active:currentTab==='equipment',onClick:()=>setCurrentTab('equipment'),iconName:'tent',label:'公共裝備'}),
        e(NavButton,{active:currentTab==='meals',onClick:()=>setCurrentTab('meals'),iconName:'utensils',label:'伙食計劃'}),
        e(NavButton,{active:currentTab==='settlement',onClick:()=>setCurrentTab('settlement'),iconName:'calculator',label:'費用結算'})
      ),
      // Modals
      isModalOpen&&e(ItemModal,{isOpen:isModalOpen,onClose:()=>setIsModalOpen(false),onSave:saveItem,initialData:editingItem,type:editingItem?editingItem.type:getCurrentType(),members,currentUser:userName}),
      isImportModalOpen&&e(ImportSelectionModal,{isOpen:isImportModalOpen,onClose:()=>setIsImportModalOpen(false),onImport:handleBatchImport,existingItems:hasEnteredCamp?sharedItems:prepItems,isImporting}),
      itemToDelete&&e(DeleteConfirmModal,{item:itemToDelete,onConfirm:deleteSharedItem,onCancel:()=>setItemToDelete(null)}),
      isMemberModalOpen&&e(MemberModal,{isOpen:isMemberModalOpen,onClose:()=>setIsMemberModalOpen(false),members,currentUser:userName,roomId}),
      isEndModalOpen&&e(EndConfirmModal,{onConfirm:handleEndActivity,onCancel:()=>setIsEndModalOpen(false)})
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
