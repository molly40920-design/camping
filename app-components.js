// Sub-components
const EmptyState = ({icon, message}) => (
  React.createElement('div',{className:"flex flex-col items-center justify-center h-64 text-center px-4"},
    React.createElement('div',{className:"mb-4"},icon),
    React.createElement('p',{className:"text-slate-500 text-sm"},message)
  )
);

const NavButton = ({active, onClick, iconName, label}) => (
  React.createElement('button',{onClick, className:`flex flex-col items-center justify-center w-full py-2 transition-colors ${active?'text-emerald-600 font-semibold':'text-slate-400'}`},
    React.createElement('div',{className:`mb-1 ${active?'scale-110':''}`}, React.createElement(Icon,{name:iconName,size:24})),
    React.createElement('span',{className:"text-xs"},label)
  )
);

const ItemCard = ({item, onToggle, onEdit, onDelete, isPersonal}) => {
  const isMeal = item.type==='meal', isPrep = item.type==='prep';
  return React.createElement('div',{className:`flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm transition-all anim-fadeIn ${item.isPacked?'border-emerald-200 bg-emerald-50/30':'border-slate-100'} ${isPersonal?'hover:shadow-md':''}`},
    React.createElement('div',{className:"flex items-center gap-4 flex-1"},
      React.createElement('button',{onClick:()=>onToggle(item),className:`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${item.isPacked?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300 text-transparent'}`},
        React.createElement(Icon,{name:'check',size:18})
      ),
      React.createElement('div',{className:"flex-1 min-w-0"},
        React.createElement('div',{className:"flex items-center gap-2 flex-wrap"},
          React.createElement('h3',{className:`font-semibold ${item.isPacked?'text-slate-500 line-through':'text-slate-800'}`},item.name),
          isMeal&&item.mealType&&React.createElement('span',{className:"text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium"},MEAL_TYPES[item.mealType])
        ),
        React.createElement('div',{className:"flex items-center gap-3 text-sm text-slate-500 mt-1"},
          !isPrep&&React.createElement('span',{className:"flex items-center gap-1"},React.createElement(Icon,{name:'user',size:12}),item.assignee||'未指派'),
          item.price>0&&React.createElement('span',{className:"text-emerald-600 font-medium"},'$'+item.price+' ('+item.payer+'付)')
        )
      )
    ),
    React.createElement('div',{className:"flex items-center gap-1 shrink-0"},
      React.createElement('button',{onClick:()=>onEdit(item),className:"p-2 text-slate-400 hover:text-emerald-600 rounded-lg"},React.createElement(Icon,{name:'edit2',size:16})),
      React.createElement('button',{onClick:()=>onDelete(item),className:"p-2 text-slate-400 hover:text-red-500 rounded-lg"},React.createElement(Icon,{name:'trash2',size:16}))
    )
  );
};

const ItemList = ({items, onToggle, onEdit, onDelete, emptyMessage, emptyIcon, isPersonal}) => {
  if(items.length===0) return React.createElement(EmptyState,{icon:emptyIcon||React.createElement(Icon,{name:'tent',size:48,className:"text-slate-300"}),message:emptyMessage||"目前沒有裝備。點擊右下角新增！"});
  return React.createElement('div',{className:"space-y-3"},items.map(item=>React.createElement(ItemCard,{key:item.id,item,onToggle,onEdit,onDelete,isPersonal})));
};

const MealList = ({items, onToggle, onEdit, onDelete}) => {
  if(items.length===0) return React.createElement(EmptyState,{icon:React.createElement(Icon,{name:'utensils',size:48,className:"text-slate-300"}),message:"目前沒有伙食規劃。點擊右下角新增！"});
  const grouped = items.reduce((a,i)=>{const d=i.day||1;if(!a[d])a[d]=[];a[d].push(i);return a},{});
  const order = ['breakfast','lunch','tea','dinner','snack'];
  return React.createElement('div',{className:"space-y-6"},
    Object.keys(grouped).sort((a,b)=>a-b).map(day=>
      React.createElement('div',{key:day,className:"bg-slate-50 p-4 rounded-xl border border-slate-200 anim-fadeIn"},
        React.createElement('h2',{className:"font-bold text-slate-700 mb-3 text-lg border-b pb-2"},'第 '+day+' 天'),
        React.createElement('div',{className:"space-y-3"},grouped[day].sort((a,b)=>order.indexOf(a.mealType)-order.indexOf(b.mealType)).map(item=>React.createElement(ItemCard,{key:item.id,item,onToggle,onEdit,onDelete})))
      )
    )
  );
};

const SettlementView = ({items, members, onEndActivity}) => {
  const settlement = useMemo(()=>{
    const balances={};members.forEach(m=>balances[m]=0);let totalSpent=0;
    items.filter(i=>i.type!=='prep').forEach(item=>{
      const price=Number(item.price)||0;
      if(price>0&&item.payer){totalSpent+=price;balances[item.payer]+=price;
        const sm=item.splitAmong&&item.splitAmong.length>0?item.splitAmong:members;
        const sa=price/sm.length;sm.forEach(m=>balances[m]-=sa);
      }
    });
    const debtors=[],creditors=[];
    Object.keys(balances).forEach(p=>{const b=Math.round(balances[p]);if(b<0)debtors.push({person:p,amount:-b});else if(b>0)creditors.push({person:p,amount:b})});
    debtors.sort((a,b)=>b.amount-a.amount);creditors.sort((a,b)=>b.amount-a.amount);
    const tx=[];let i=0,j=0;
    while(i<debtors.length&&j<creditors.length){const d=debtors[i],c=creditors[j],amt=Math.min(d.amount,c.amount);if(amt>0)tx.push({from:d.person,to:c.person,amount:amt});d.amount-=amt;c.amount-=amt;if(d.amount===0)i++;if(c.amount===0)j++}
    return{balances,transactions:tx,totalSpent};
  },[items,members]);

  return React.createElement('div',{className:"space-y-6 pb-6"},
    React.createElement('div',{className:"bg-emerald-600 text-white p-6 rounded-2xl shadow-lg anim-fadeIn"},
      React.createElement('h2',{className:"text-sm text-emerald-100 mb-1"},'總支出 (不含個人裝備)'),
      React.createElement('div',{className:"text-3xl font-bold"},'$ '+settlement.totalSpent.toLocaleString())
    ),
    React.createElement('div',{},
      React.createElement('h3',{className:"font-bold text-slate-800 mb-3 flex items-center gap-2"},React.createElement(Icon,{name:'calculator',size:20,className:"text-emerald-600"}),' 最佳化拆帳結果'),
      settlement.transactions.length===0
        ? React.createElement('div',{className:"bg-slate-50 border rounded-xl p-6 text-center text-slate-500"},'目前沒有欠款。')
        : React.createElement('div',{className:"space-y-3"},settlement.transactions.map((t,idx)=>
            React.createElement('div',{key:idx,className:"bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm anim-fadeIn"},
              React.createElement('div',{className:"flex items-center gap-3"},
                React.createElement('div',{className:"font-semibold"},t.from),
                React.createElement(Icon,{name:'arrowRight',size:16,className:"text-slate-300"}),
                React.createElement('div',{className:"font-semibold"},t.to)
              ),
              React.createElement('div',{className:"font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg"},'$'+t.amount.toLocaleString())
            )
          ))
    ),
    React.createElement('div',{className:"pt-6 border-t mt-6"},
      React.createElement('button',{onClick:onEndActivity,className:"w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"},
        React.createElement(Icon,{name:'logOut',size:20}),' 結束活動 (結清並封存房間)'
      )
    )
  );
};
