// Modal components
const DeleteConfirmModal = ({item, onConfirm, onCancel}) => (
  React.createElement('div',{className:"fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"},
    React.createElement('div',{className:"bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl anim-zoomIn"},
      React.createElement('div',{className:"flex flex-col items-center text-center"},
        React.createElement('div',{className:"w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"},React.createElement(Icon,{name:'alertTriangle',size:24})),
        React.createElement('h3',{className:"text-lg font-bold text-slate-800 mb-2"},'確認刪除？'),
        React.createElement('p',{className:"text-sm text-slate-500 mb-6"},'確定要刪除「'+item.name+'」嗎？此操作無法還原。'),
        React.createElement('div',{className:"flex gap-3 w-full"},
          React.createElement('button',{onClick:onCancel,className:"flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"},'取消'),
          React.createElement('button',{onClick:onConfirm,className:"flex-1 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"},'確定刪除')
        )
      )
    )
  )
);

const EndConfirmModal = ({onConfirm, onCancel}) => (
  React.createElement('div',{className:"fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"},
    React.createElement('div',{className:"bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl anim-zoomIn"},
      React.createElement('div',{className:"flex flex-col items-center text-center"},
        React.createElement('div',{className:"w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"},React.createElement(Icon,{name:'alertTriangle',size:24})),
        React.createElement('h3',{className:"text-lg font-bold text-slate-800 mb-2"},'確定要結束活動嗎？'),
        React.createElement('p',{className:"text-sm text-slate-500 mb-6"},
          '結束後，系統會清除並封存本房間的所有資料。',
          React.createElement('strong',{className:"text-red-500"},'此操作無法復原'),
          '。房間代碼可以在未來重新使用。'
        ),
        React.createElement('div',{className:"flex gap-3 w-full"},
          React.createElement('button',{onClick:onCancel,className:"flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"},'取消'),
          React.createElement('button',{onClick:onConfirm,className:"flex-1 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"},'確定結束')
        )
      )
    )
  )
);

const MemberModal = ({isOpen, onClose, members, currentUser, roomId}) => {
  if(!isOpen) return null;
  return React.createElement('div',{className:"fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"},
    React.createElement('div',{className:"bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl anim-zoomIn"},
      React.createElement('div',{className:"flex justify-between items-center mb-4"},
        React.createElement('h3',{className:"text-lg font-bold text-slate-800 flex items-center gap-2"},React.createElement(Icon,{name:'users',size:20,className:"text-emerald-600"}),' 房間成員 ('+members.length+')'),
        React.createElement('button',{onClick:onClose,className:"p-1 text-slate-400 hover:bg-slate-100 rounded-full"},React.createElement(Icon,{name:'x',size:20}))
      ),
      React.createElement('div',{className:"bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-60 overflow-y-auto"},
        React.createElement('ul',{className:"space-y-2"},
          members.map(m=>React.createElement('li',{key:m,className:"flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-slate-100"},
            React.createElement('div',{className:`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${m===currentUser?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600'}`},m.charAt(0).toUpperCase()),
            React.createElement('span',{className:`font-medium ${m===currentUser?'text-emerald-800':'text-slate-700'}`},m+(m===currentUser?' (你)':''))
          ))
        )
      ),
      React.createElement('div',{className:"mt-4 text-center"},React.createElement('p',{className:"text-xs text-slate-400"},'房間代碼：'+roomId.toUpperCase()))
    )
  );
};

const ImportSelectionModal = ({isOpen, onClose, onImport, existingItems, isImporting}) => {
  const existingNames = new Set(existingItems.map(i=>i.name));
  const availableCategories = useMemo(()=>{
    const r={};Object.entries(PREP_CATEGORIES).forEach(([cat,items])=>{const f=items.filter(i=>!existingNames.has(i));if(f.length>0)r[cat]=f});return r;
  },[existingItems]);
  const allAvail = Object.values(availableCategories).flat();
  const [selected, setSelected] = useState([]);
  useEffect(()=>{setSelected(allAvail)},[availableCategories]);
  const toggleItem = (item) => setSelected(p=>p.includes(item)?p.filter(i=>i!==item):[...p,item]);
  const toggleAll = () => setSelected(selected.length===allAvail.length?[]:allAvail);
  if(!isOpen) return null;
  return React.createElement('div',{className:"fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 bg-slate-900/50 backdrop-blur-sm"},
    React.createElement('div',{className:"bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl anim-slideUp"},
      React.createElement('div',{className:"flex justify-between items-center p-4 border-b"},
        React.createElement('h2',{className:"text-xl font-bold text-slate-800 flex items-center gap-2"},React.createElement(Icon,{name:'listChecks',size:20,className:"text-emerald-600"}),' 選擇匯入項目'),
        React.createElement('button',{onClick:onClose,className:"p-2 text-slate-400 hover:bg-slate-100 rounded-full"},React.createElement(Icon,{name:'x',size:20}))
      ),
      React.createElement('div',{className:"p-3 bg-slate-50 border-b flex justify-between items-center"},
        React.createElement('span',{className:"text-sm text-slate-600"},'已選擇 '+selected.length+' / '+allAvail.length+' 項'),
        React.createElement('button',{onClick:toggleAll,className:"text-sm font-semibold text-emerald-600 hover:text-emerald-700"},selected.length===allAvail.length?'取消全選':'全選')
      ),
      React.createElement('div',{className:"flex-1 overflow-y-auto p-4 space-y-6"},
        Object.keys(availableCategories).length===0
          ? React.createElement('div',{className:"text-center text-slate-400 py-10"},'建議項目都已經在你的清單中囉！')
          : Object.entries(availableCategories).map(([cat,items])=>
              React.createElement('div',{key:cat},
                React.createElement('h3',{className:"text-sm font-bold text-slate-500 mb-3 bg-slate-100 inline-block px-2 py-1 rounded"},cat),
                React.createElement('div',{className:"grid grid-cols-2 gap-3"},items.map(item=>{
                  const sel=selected.includes(item);
                  return React.createElement('div',{key:item,onClick:()=>toggleItem(item),className:`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${sel?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-slate-200 hover:border-emerald-300'}`},
                    React.createElement(Icon,{name:sel?'checkSquare':'square',size:20,className:sel?'text-emerald-600 shrink-0':'text-slate-300 shrink-0'}),
                    React.createElement('span',{className:"text-sm font-medium"},item)
                  )
                }))
              )
            )
      ),
      React.createElement('div',{className:"p-4 border-t bg-white pb-safe"},
        React.createElement('button',{onClick:()=>onImport(selected),disabled:isImporting||selected.length===0,className:`w-full font-semibold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 ${isImporting||selected.length===0?'bg-slate-300 text-slate-500 cursor-not-allowed':'bg-emerald-600 text-white hover:bg-emerald-700'}`},
          isImporting?React.createElement(React.Fragment,{},React.createElement(Icon,{name:'loader2',size:20,className:"anim-spin"}),' 匯入中...'):('確認匯入 '+selected.length+' 項')
        )
      )
    )
  );
};

const ItemModal = ({isOpen, onClose, onSave, initialData, type, members, currentUser}) => {
  const isMeal=type==='meal', isPrep=type==='prep';
  const [formData,setFormData]=useState({id:'',type,name:'',assignee:currentUser,isPacked:false,day:1,mealType:'dinner',price:'',payer:currentUser,splitAmong:[]});
  useEffect(()=>{if(initialData)setFormData({...initialData});else setFormData(p=>({...p,type,name:'',price:'',assignee:currentUser,payer:currentUser}))},[initialData,type,currentUser]);
  const handleSubmit=(e)=>{e.preventDefault();if(!formData.name.trim())return;onSave({...formData,price:Number(formData.price)||0,day:Number(formData.day)||1})};
  const toggleSplit=(m)=>setFormData(prev=>{const cur=prev.splitAmong.length===0?[...members]:[...prev.splitAmong];const next=cur.includes(m)?cur.filter(x=>x!==m):[...cur,m];return{...prev,splitAmong:next.length===members.length?[]:next}});
  const iconName = isMeal?'utensils':isPrep?'clipboardList':'tent';
  const title = isMeal?(initialData?'編輯伙食':'新增伙食'):isPrep?(initialData?'編輯個人物品':'新增個人物品'):(initialData?'編輯裝備':'新增裝備');
  if(!isOpen)return null;
  
  const field = (label,content) => React.createElement('div',{},React.createElement('label',{className:"block text-sm font-medium text-slate-700 mb-1"},label),content);
  
  return React.createElement('div',{className:"fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"},
    React.createElement('div',{className:"bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl sm:max-h-[90vh] flex flex-col shadow-2xl anim-slideUp"},
      React.createElement('div',{className:"flex justify-between items-center p-4 border-b"},
        React.createElement('h2',{className:"text-xl font-bold text-slate-800 flex items-center gap-2"},React.createElement(Icon,{name:iconName,size:20,className:"text-emerald-600"}),' ',title),
        React.createElement('button',{onClick:onClose,className:"p-2 text-slate-400 hover:bg-slate-100 rounded-full"},React.createElement(Icon,{name:'x',size:20}))
      ),
      React.createElement('div',{className:"flex-1 overflow-y-auto p-4"},
        React.createElement('form',{id:"item-form",onSubmit:handleSubmit,className:"space-y-4"},
          field('名稱 *',React.createElement('input',{type:"text",required:true,value:formData.name,onChange:e=>setFormData({...formData,name:e.target.value}),className:"w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500",placeholder:"輸入名稱..."})),
          React.createElement('div',{className:"grid grid-cols-2 gap-4"},
            !isPrep&&field('負責人',React.createElement('select',{value:formData.assignee,onChange:e=>setFormData({...formData,assignee:e.target.value}),className:"w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none"},members.map(m=>React.createElement('option',{key:m,value:m},m)))),
            isMeal&&field('天數',React.createElement('select',{value:formData.day,onChange:e=>setFormData({...formData,day:parseInt(e.target.value)}),className:"w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none"},[1,2,3,4,5].map(d=>React.createElement('option',{key:d,value:d},'第 '+d+' 天'))))
          ),
          isMeal&&field('餐別',React.createElement('div',{className:"flex flex-wrap gap-2"},Object.entries(MEAL_TYPES).map(([k,v])=>React.createElement('button',{key:k,type:"button",onClick:()=>setFormData({...formData,mealType:k}),className:`px-3 py-1.5 rounded-full text-sm border transition-colors ${formData.mealType===k?'bg-emerald-500 text-white border-emerald-500':'bg-white text-slate-600 border-slate-200'}`},v)))),
          React.createElement('div',{className:"border-t pt-4 mt-2"},
            React.createElement('h3',{className:"text-sm font-bold text-slate-800 mb-3 flex items-center gap-1"},React.createElement(Icon,{name:'receipt',size:16,className:"text-emerald-600"}),' 費用與拆帳'),
            React.createElement('div',{className:"grid grid-cols-2 gap-4"},
              field('金額 ($)',React.createElement('input',{type:"number",min:"0",value:formData.price,onChange:e=>setFormData({...formData,price:e.target.value}),className:"w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none"})),
              field('付款人',React.createElement('select',{value:formData.payer,onChange:e=>setFormData({...formData,payer:e.target.value}),className:"w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none"},members.map(m=>React.createElement('option',{key:m,value:m},m))))
            ),
            React.createElement('div',{className:"mt-3"},
              React.createElement('label',{className:"block text-sm font-medium text-slate-700 mb-1"},'參與分帳'),
              React.createElement('div',{className:"flex flex-wrap gap-2"},members.map(m=>React.createElement('button',{key:m,type:"button",onClick:()=>toggleSplit(m),className:`px-3 py-1 rounded-lg text-sm border transition-colors ${formData.splitAmong.length===0||formData.splitAmong.includes(m)?'bg-emerald-50 border-emerald-500 text-emerald-700':'bg-slate-50 text-slate-400 border-slate-200'}`},m)))
            )
          )
        )
      ),
      React.createElement('div',{className:"p-4 border-t bg-white pb-safe"},
        React.createElement('button',{type:"submit",form:"item-form",className:"w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-emerald-700 transition-colors"},'儲存')
      )
    )
  );
};
