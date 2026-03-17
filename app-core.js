const { useState, useEffect, useMemo, useRef, useCallback } = React;

const MEAL_TYPES = { breakfast: '早餐', lunch: '午餐', tea: '下午茶', dinner: '晚餐', snack: '宵夜' };
const PREP_CATEGORIES = {
  "貴重/電子": ["錢包", "手機", "耳機", "行動電源", "充電器", "相機"],
  "個人/衣物": ["眼鏡", "隱形眼鏡", "生理食鹽水", "墨鏡", "薄外套", "遮陽帽", "換洗衣物", "睡衣", "雨傘", "梳子", "拖鞋"],
  "盥洗/保養": ["牙膏", "牙刷", "毛巾", "刮鬍刀", "洗髮精", "沐浴乳", "洗面乳", "護髮素", "化妝品", "卸妝用品", "乳液", "防曬", "棉花棒"],
  "醫藥/安全": ["備用藥", "暈車藥", "腸胃藥", "止痛藥", "防蚊液", "蚊香", "OK蹦", "優碘", "貼布", "個人藥品"],
  "日常/雜項": ["水壺", "衛生紙", "濕紙巾", "酒精", "口罩", "塑膠袋", "暖暖包", "耳塞", "眼罩"]
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// SVG Icon components
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    tent: `<path d="m18 17-6-11-6 11Z"/><path d="M12 6V2"/><path d="M4 17h16"/>`,
    utensils: `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`,
    calculator: `<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>`,
    plus: `<path d="M5 12h14"/><path d="M12 5v14"/>`,
    check: `<path d="M20 6 9 17l-5-5"/>`,
    logOut: `<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>`,
    trash2: `<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`,
    edit2: `<path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>`,
    users: `<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>`,
    receipt: `<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><path d="M12 17.5v-11"/>`,
    arrowRight: `<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>`,
    user: `<path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
    alertTriangle: `<path d="m21.73 18-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
    clipboardList: `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
    loader2: `<path d="M21 12a9 9 0 11-6.219-8.56"/>`,
    listChecks: `<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>`,
    checkSquare: `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>`,
    square: `<rect width="18" height="18" x="3" y="3" rx="2"/>`,
    doorOpen: `<path d="M13 4h3a2 2 0 012 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 01-1.242.97L5 20V5.562a2 2 0 011.515-1.94l4-1A2 2 0 0113 4.561Z"/>`,
    backpack: `<path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2Z"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/><path d="M8 21v-5a2 2 0 012-2h4a2 2 0 012 2v5"/><path d="M8 10h8"/><path d="M8 18h8"/>`,
    history: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>`,
    clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`
  };
  return React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
    className, dangerouslySetInnerHTML: { __html: icons[name] || '' }
  });
};
