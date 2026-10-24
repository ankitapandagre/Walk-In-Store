// Sample listings for the Walk-In Store prototype.
// Later, this sample data can be replaced with a real database.
const books = [
 {id:1,title:"The Diary of a Young Girl",author:"Anne Frank",store:"Readers Point",area:"Delhi",distance:"1.2 km",price:299,quantity:4,icon:"📘",address:"Connaught Place, New Delhi"},
 {id:2,title:"RD Sharma Mathematics — Class 12",author:"R. D. Sharma",store:"Student Book House",area:"Bhopal",distance:"1.8 km",price:620,quantity:3,icon:"📗",address:"MP Nagar, Bhopal"},
 {id:3,title:"Harry Potter and the Philosopher's Stone",author:"J. K. Rowling",store:"City Book Centre",area:"Delhi",distance:"2.4 km",price:399,quantity:0,icon:"📙",address:"Karol Bagh, New Delhi"},
 {id:4,title:"Atomic Habits",author:"James Clear",store:"Page Turner Books",area:"Indore",distance:"1.5 km",price:450,quantity:2,icon:"📕",address:"Vijay Nagar, Indore"},
 {id:5,title:"NCERT Biology — Class 12",author:"NCERT",store:"Knowledge Corner",area:"Bhopal",distance:"2.2 km",price:180,quantity:8,icon:"📒",address:"New Market, Bhopal"},
 {id:6,title:"The Alchemist",author:"Paulo Coelho",store:"Readers Point",area:"Delhi",distance:"1.2 km",price:250,quantity:1,icon:"📔",address:"Connaught Place, New Delhi"}
];
const searchInput=document.getElementById("searchInput");
const areaFilter=document.getElementById("areaFilter");
const availableOnly=document.getElementById("availableOnly");
const bookResults=document.getElementById("bookResults");
const resultCount=document.getElementById("resultCount");
const noResults=document.getElementById("noResults");
const sellerButton=document.getElementById("sellerButton");
const sellerFormSection=document.getElementById("sellerFormSection");
const sellerForm=document.getElementById("sellerForm");
const formMessage=document.getElementById("formMessage");

function renderBooks(){
 const term=searchInput.value.trim().toLowerCase();
 const area=areaFilter.value;
 const filtered=books.filter(book=>{
  const matchText=book.title.toLowerCase().includes(term)||book.author.toLowerCase().includes(term)||book.store.toLowerCase().includes(term);
  const matchArea=area==="all"||book.area===area;
  const matchStock=!availableOnly.checked||book.quantity>0;
  return matchText&&matchArea&&matchStock;
 });
 bookResults.innerHTML="";
 filtered.forEach(book=>{
  const available=book.quantity>0;
  const status=available?`Available · ${book.quantity} left`:"Out of stock";
  const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(book.address)}`;
  const card=document.createElement("article");
  card.className="book-card";
  card.innerHTML=`<div class="book-cover" aria-hidden="true"><div>${book.icon}<span>${book.title}</span></div></div>
  <div class="book-info"><h4>${book.title}</h4><p class="author">by ${book.author}</p>
  <p class="store-line">${book.store}</p><p class="store-name">📍 ${book.area} · ${book.distance} (sample)</p>
  <div class="card-bottom"><span class="price">₹${book.price}</span><span class="stock ${available?"":"out"}">${status}</span></div>
  <div class="card-actions"><a href="${mapUrl}" target="_blank" rel="noopener noreferrer">View location ↗</a><button type="button">Book details</button></div></div>`;
  card.querySelector("button").addEventListener("click",()=>alert(`${book.title}\nAuthor: ${book.author}\nStore: ${book.store}\nArea: ${book.area}\nPrice: ₹${book.price}\nStock: ${book.quantity}\n\nDemo listing only — please confirm availability with the store.`));
  bookResults.appendChild(card);
 });
 resultCount.textContent=`${filtered.length} listing${filtered.length===1?"":"s"}`;
 noResults.hidden=filtered.length!==0;
}
document.getElementById("searchButton").addEventListener("click",renderBooks);
searchInput.addEventListener("input",renderBooks);
areaFilter.addEventListener("change",renderBooks);
availableOnly.addEventListener("change",renderBooks);
sellerButton.addEventListener("click",()=>{
 sellerFormSection.hidden=!sellerFormSection.hidden;
 if(!sellerFormSection.hidden)sellerFormSection.scrollIntoView({behavior:"smooth"});
});
sellerForm.addEventListener("submit",event=>{
 event.preventDefault();
 const area=document.getElementById("newArea").value;
 books.unshift({id:Date.now(),title:document.getElementById("newTitle").value.trim(),author:document.getElementById("newAuthor").value.trim(),store:document.getElementById("newStore").value.trim(),area,distance:"Distance not set",price:Number(document.getElementById("newPrice").value),quantity:Number(document.getElementById("newQuantity").value),icon:"📚",address:area});
 searchInput.value="";areaFilter.value="all";availableOnly.checked=false;renderBooks();
 formMessage.textContent="Listing added to this demo page. It will disappear when you refresh because there is no database yet.";
 sellerForm.reset();document.getElementById("find-books").scrollIntoView({behavior:"smooth"});
});
renderBooks();
