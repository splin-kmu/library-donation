const API = window.APP_CONFIG?.API_URL || "";
const $ = id => document.getElementById(id);
let allBooks = [];
function configured(){return API && !API.includes("PASTE_YOUR");}
function jsonp(url){
  return new Promise((resolve,reject)=>{
    const cb="cb_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    const timer=setTimeout(()=>{cleanup();reject(new Error("連線逾時，請稍後再試。"));},15000);
    function cleanup(){clearTimeout(timer);delete window[cb];script.remove();}
    window[cb]=data=>{cleanup();resolve(data)};
    script.onerror=()=>{cleanup();reject(new Error("無法連線至資料庫，請檢查 API 網址及部署權限。"));};
    script.src=url+(url.includes("?")?"&":"?")+"action=books&callback="+cb+"&_="+Date.now();
    document.body.appendChild(script);
  });
}
async function loadBooks(){
  if(!configured()){$("message").textContent="請先在 config.js 設定 Google Apps Script Web App URL。";$("books").innerHTML='<tr><td colspan="4">尚未完成設定</td></tr>';return;}
  $("message").textContent="正在更新…";
  try{const result=await jsonp(API);if(!result.ok)throw new Error(result.error||"讀取失敗");allBooks=result.books||[];render();$("message").textContent="更新時間："+new Date().toLocaleTimeString("zh-TW");}
  catch(e){$("message").textContent=e.message;$("message").className="message error";}
}
function render(){
 const q=$("search").value.trim().toLocaleLowerCase();
 const filter=$("statusFilter").value;
 const filtered=allBooks.filter(b=>{
   const hay=[b.title,b.author,b.barcode].join(" ").toLocaleLowerCase();
   return hay.includes(q)&&(filter==="all"||b.status===filter);
 });
 const available=allBooks.filter(b=>b.status==="available").length;
 $("summary").textContent=`共 ${allBooks.length} 筆書目｜尚可索取 ${available} 筆｜已被索取 ${allBooks.length-available} 筆`;
 $("books").innerHTML=filtered.length?filtered.map(b=>`<tr><td>${esc(b.title||"（未填書名）")}</td><td>${esc(b.author||"—")}</td><td>${esc(b.barcode||"")}</td><td><span class="status ${b.status==="claimed"?"claimed":"available"}">${b.status==="claimed"?"已被索取":"尚可索取"}</span></td></tr>`).join(""):'<tr><td colspan="4">沒有符合條件的書目。</td></tr>';
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("search").addEventListener("input",render);$("statusFilter").addEventListener("change",render);$("refreshBtn").addEventListener("click",loadBooks);
loadBooks();setInterval(loadBooks,30000);