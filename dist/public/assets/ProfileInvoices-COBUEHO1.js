import{u,r as f,a as g,j as t,X as h,R as d,E as y,b as j}from"./index-Dc4CUJ9c.js";import{f as c}from"./format-DDrcvaJb.js";import{D as p}from"./download-CBwQ8CGM.js";import{F as v}from"./file-text-CpELGzgA.js";const o=`<img src="${typeof window<"u"?window.location.origin:""}${j}" alt="ر.س" style="height:0.85em;width:auto;display:inline-block;vertical-align:-0.08em;margin:0 0.18em 0 0.05em;object-fit:contain;" />`;function m(s,r){const e=r==="ar",a=`<!DOCTYPE html>
<html dir="${e?"rtl":"ltr"}" lang="${e?"ar":"en"}">
<head>
  <meta charset="UTF-8" />
  <title>${e?"فاتورة":"Invoice"} ${s.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .brand-sub { font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
    .invoice-meta { text-align: ${e?"left":"right"}; }
    .invoice-meta .inv-num { font-size: 18px; font-weight: 900; }
    .invoice-meta .inv-date { font-size: 11px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-block p { font-size: 12px; color: #333; line-height: 1.6; }
    .info-block strong { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f4f4f4; text-align: ${e?"right":"left"}; padding: 8px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #555; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .totals { margin-${e?"left":"right"}: 0; margin-${e?"right":"left"}: auto; width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
    .total-row:last-child { border-bottom: none; font-weight: 900; font-size: 14px; border-top: 2px solid #111; margin-top: 4px; padding-top: 8px; }
    .status-badge { display: inline-block; padding: 3px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: #f0f9f0; color: #16a34a; border: 1px solid #bbf7d0; }
    .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Myla</div>
      <div class="brand-sub">${e?"فاتورة ضريبية":"Tax Invoice"}</div>
    </div>
    <div class="invoice-meta">
      <div class="inv-num">${s.invoiceNumber}</div>
      <div class="inv-date">${e?"تاريخ الإصدار:":"Issue Date:"} ${c(new Date(s.issueDate),"yyyy-MM-dd")}</div>
      ${s.dueDate?`<div class="inv-date">${e?"تاريخ الاستحقاق:":"Due Date:"} ${c(new Date(s.dueDate),"yyyy-MM-dd")}</div>`:""}
      <div style="margin-top:6px"><span class="status-badge">${s.status==="paid"?e?"مدفوعة":"PAID":["pending","draft","issued"].includes(s.status)?e?"معلقة":"PENDING":s.status}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <div class="section-title">${e?"من":"From"}</div>
      <p><strong>Myla — Abayas by HMBL</strong></p>
      <p>${e?"المملكة العربية السعودية":"Saudi Arabia"}</p>
    </div>
    ${s.customerId?`<div class="info-block">
      <div class="section-title">${e?"إلى":"To"}</div>
      <p><strong>${e?"العميل":"Customer"}</strong></p>
      <p>${s.customerId}</p>
    </div>`:""}
  </div>

  ${s.items&&s.items.length>0?`
  <div class="section">
    <div class="section-title">${e?"البنود":"Line Items"}</div>
    <table>
      <thead>
        <tr>
          <th>${e?"الوصف":"Description"}</th>
          <th style="text-align:center">${e?"الكمية":"Qty"}</th>
          <th style="text-align:${e?"left":"right"}">${e?"السعر":"Unit Price"}</th>
          <th style="text-align:${e?"left":"right"}">${e?"الإجمالي":"Total"}</th>
        </tr>
      </thead>
      <tbody>
        ${s.items.map(n=>`
        <tr>
          <td>${n.description||n.name||""}</td>
          <td style="text-align:center">${n.quantity||1}</td>
          <td style="text-align:${e?"left":"right"}">${Number(n.unitPrice||n.price||0).toFixed(2)} ${o}</td>
          <td style="text-align:${e?"left":"right"}">${Number(n.total||(n.quantity||1)*(n.unitPrice||n.price||0)).toFixed(2)} ${o}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>`:""}

  <div class="totals">
    ${s.subtotal!=null?`<div class="total-row"><span>${e?"المجموع الفرعي":"Subtotal"}</span><span>${Number(s.subtotal).toFixed(2)} ${o}</span></div>`:""}
    ${s.discount!=null&&Number(s.discount)>0?`<div class="total-row"><span>${e?"الخصم":"Discount"}</span><span>-${Number(s.discount).toFixed(2)} ${o}</span></div>`:""}
    ${s.tax!=null?`<div class="total-row"><span>${e?"ضريبة القيمة المضافة (15%)":"VAT (15%)"}</span><span>${Number(s.tax).toFixed(2)} ${o}</span></div>`:""}
    <div class="total-row"><span>${e?"الإجمالي الكلي":"Grand Total"}</span><span>${Number(s.total).toFixed(2)} ${o}</span></div>
  </div>

  ${s.notes?`<div class="section" style="margin-top:24px"><div class="section-title">${e?"ملاحظات":"Notes"}</div><p style="font-size:12px;color:#555">${s.notes}</p></div>`:""}

  <div class="footer">
    Myla &bull; ${e?"شكراً لتعاملكم معنا":"Thank you for your business"}
  </div>
</body>
</html>`,l=window.open("","_blank","width=800,height=900");l&&(l.document.write(a),l.document.close(),l.onload=()=>{l.focus(),l.print()})}function D(){const{t:s,language:r}=u(),e=r==="ar",[a,l]=f.useState(null),{data:n,isLoading:b}=g({queryKey:["/api/invoices"]});return b?t.jsx("div",{className:"p-8 text-center",children:s("loading")}):t.jsxs("div",{className:"space-y-6",dir:e?"rtl":"ltr",children:[t.jsx("h2",{className:"text-2xl font-bold font-display",children:e?"فواتيري":"My Invoices"}),a&&t.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4",onClick:()=>l(null),children:t.jsxs("div",{className:"bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-none shadow-2xl",onClick:i=>i.stopPropagation(),dir:e?"rtl":"ltr",children:[t.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-slate-200",children:[t.jsx("h3",{className:"font-black text-base",children:a.invoiceNumber}),t.jsx("button",{onClick:()=>l(null),className:"p-1.5 hover:bg-slate-100 rounded-lg transition-colors","data-testid":"button-close-invoice",children:t.jsx(h,{className:"w-4 h-4"})})]}),t.jsxs("div",{className:"p-6 space-y-6",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsxs("div",{children:[t.jsx("p",{className:"text-xs text-slate-700 uppercase tracking-widest font-bold",children:e?"فاتورة ضريبية":"Tax Invoice"}),t.jsx("p",{className:"font-black text-xl mt-1",children:"Myla"})]}),t.jsxs("div",{className:e?"text-left":"text-right",children:[t.jsx("p",{className:"font-black text-lg",children:a.invoiceNumber}),t.jsx("p",{className:"text-xs text-slate-700 mt-1",children:c(new Date(a.issueDate),"yyyy-MM-dd")}),t.jsx("span",{className:`inline-block mt-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-none ${a.status==="paid"?"bg-emerald-100 text-emerald-700":["pending","draft","issued"].includes(a.status)?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`,children:a.status==="paid"?e?"مدفوعة":"PAID":["pending","draft","issued"].includes(a.status)?e?"معلقة":"PENDING":a.status})]})]}),a.items&&a.items.length>0&&t.jsxs("div",{children:[t.jsx("p",{className:"text-[10px] font-bold uppercase tracking-widest text-slate-700 border-b border-slate-100 pb-2 mb-3",children:e?"البنود":"Line Items"}),t.jsx("div",{className:"space-y-2",children:a.items.map((i,x)=>t.jsxs("div",{className:"flex items-center justify-between text-sm","data-testid":`row-invoice-item-${x}`,children:[t.jsx("span",{className:"text-slate-700",children:i.description||i.name||`${e?"منتج":"Item"} ${x+1}`}),t.jsxs("div",{className:"flex items-center gap-4 text-slate-600",children:[t.jsxs("span",{className:"text-xs",children:["×",i.quantity||1]}),t.jsxs("span",{className:"font-bold",children:[Number(i.total||0).toFixed(2)," ",t.jsx(d,{})]})]})]},x))})]}),t.jsxs("div",{className:`border-t border-slate-100 pt-4 space-y-2 ${e?"text-left":"text-right"}`,children:[a.subtotal!=null&&t.jsxs("div",{className:"flex justify-between text-sm text-slate-600",children:[t.jsx("span",{children:e?"المجموع الفرعي":"Subtotal"}),t.jsxs("span",{children:[Number(a.subtotal).toFixed(2)," ",t.jsx(d,{})]})]}),a.discount!=null&&Number(a.discount)>0&&t.jsxs("div",{className:"flex justify-between text-sm text-emerald-600",children:[t.jsx("span",{children:e?"الخصم":"Discount"}),t.jsxs("span",{children:["-",Number(a.discount).toFixed(2)," ",t.jsx(d,{})]})]}),a.tax!=null&&t.jsxs("div",{className:"flex justify-between text-sm text-slate-600",children:[t.jsx("span",{children:e?"ضريبة القيمة المضافة":"VAT (15%)"}),t.jsxs("span",{children:[Number(a.tax).toFixed(2)," ",t.jsx(d,{})]})]}),t.jsxs("div",{className:"flex justify-between font-black text-base border-t border-slate-200 pt-2 mt-2",children:[t.jsx("span",{children:e?"الإجمالي":"Total"}),t.jsxs("span",{children:[Number(a.total).toFixed(2)," ",t.jsx(d,{})]})]})]}),a.notes&&t.jsxs("div",{className:"bg-slate-50 p-3 rounded-none text-sm text-slate-600",children:[t.jsx("p",{className:"text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1",children:e?"ملاحظات":"Notes"}),a.notes]})]}),t.jsx("div",{className:"px-6 py-4 border-t border-slate-100 flex justify-end gap-2",children:t.jsxs("button",{onClick:()=>m(a,r),className:"flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors rounded-none","data-testid":"button-download-invoice",children:[t.jsx(p,{className:"w-4 h-4"}),e?"تحميل PDF":"Download PDF"]})})]})}),t.jsx("div",{className:"grid gap-4",children:!n||n.length===0?t.jsx("p",{className:"text-muted-foreground",children:e?"لا يوجد فواتير حالياً":"No invoices found"}):n.map(i=>t.jsxs("div",{className:"flex items-center justify-between p-4 bg-white border border-black/5 hover-elevate","data-testid":`card-invoice-${i.id}`,children:[t.jsxs("div",{className:"flex items-center gap-4",children:[t.jsx("div",{className:"w-10 h-10 bg-primary/5 flex items-center justify-center rounded-none",children:t.jsx(v,{className:"w-5 h-5"})}),t.jsxs("div",{children:[t.jsx("p",{className:"font-bold text-sm","data-testid":`text-invoice-number-${i.id}`,children:i.invoiceNumber}),t.jsx("p",{className:"text-xs text-muted-foreground",children:c(new Date(i.issueDate),"yyyy-MM-dd")})]})]}),t.jsxs("div",{className:"flex items-center gap-4",children:[t.jsxs("span",{className:"text-sm font-bold","data-testid":`text-invoice-total-${i.id}`,children:[Number(i.total).toFixed(2)," ",t.jsx(d,{})]}),t.jsx("span",{className:`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-none ${i.status==="paid"?"bg-emerald-100 text-emerald-700":["pending","draft","issued"].includes(i.status)?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-800"}`,children:i.status==="paid"?e?"مدفوعة":"Paid":["pending","draft","issued"].includes(i.status)?e?"معلقة":"Pending":i.status}),t.jsxs("div",{className:"flex gap-1",children:[t.jsx("button",{onClick:()=>l(i),className:"p-2 hover:bg-black/5 transition-colors rounded-none",title:e?"عرض":"View","data-testid":`button-view-invoice-${i.id}`,children:t.jsx(y,{className:"w-4 h-4"})}),t.jsx("button",{onClick:()=>m(i,r),className:"p-2 hover:bg-black/5 transition-colors rounded-none",title:e?"تحميل PDF":"Download PDF","data-testid":`button-download-invoice-${i.id}`,children:t.jsx(p,{className:"w-4 h-4"})})]})]})]},i.id))})]})}export{D as default};
