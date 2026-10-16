const API = window.APP_CONFIG?.API_URL || "";
const form=document.getElementById("requestForm"), msg=document.getElementById("adminMessage"), btn=document.getElementById("submitBtn");
function configured(){return API && !API.includes("PASTE_YOUR");}
form.addEventListener("submit",async e=>{
 e.preventDefault();msg.className="message";msg.textContent="";
 if(!configured()){msg.className="message error";msg.textContent="請先在 config.js 設定 Google Apps Script Web App URL。";return;}
 const readerId=document.getElementById("readerId").value.trim();
 const barcode=document.getElementById("barcode").value.trim();
 const adminPin=document.getElementById("adminPin").value;
 if(!readerId||!barcode||!adminPin){msg.className="message error";msg.textContent="請完整填寫所有欄位。";return;}
 btn.disabled=true;btn.textContent="送出中…";
 try{
   // URL-encoded POST avoids CORS preflight; server validates the PIN and updates Sheets.
   const body=new URLSearchParams({action:"claim",readerId,barcode,adminPin});
   await fetch(API,{method:"POST",mode:"no-cors",body});
   // no-cors responses are opaque, so poll the book list to verify the status changed.
   await new Promise(r=>setTimeout(r,1800));
   const data=await getBooks();
   const book=(data.books||[]).find(b=>String(b.barcode)===barcode);
   if(book&&book.status==="claimed"){
     msg.className="message success";msg.textContent="登記已完成，書目狀態已更新。";
     document.getElementById("readerId").value="";document.getElementById("barcode").value="";
   }else{
     msg.className="message error";msg.textContent="尚未確認登記成功。請檢查讀者證號、條碼及驗證碼，並至試算表確認後再重試。";
   }
 }catch(err){msg.className="message error";msg.textContent="送出後無法確認結果。請檢查連線及試算表，避免重複登記。";}
 finally{btn.disabled=false;btn.textContent="確認登記";}
});
function getBooks(){return new Promise((resolve,reject)=>{const cb="cb_"+Math.random().toString(36).slice(2),s=document.createElement("script"),t=setTimeout(()=>{cleanup();reject(Error("timeout"))},15000);function cleanup(){clearTimeout(t);delete window[cb];s.remove()}window[cb]=d=>{cleanup();resolve(d)};s.onerror=()=>{cleanup();reject(Error("load failed"))};s.src=API+(API.includes("?")?"&":"?")+"action=books&callback="+cb+"&_="+Date.now();document.body.appendChild(s);});}