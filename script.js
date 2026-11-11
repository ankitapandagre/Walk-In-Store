// Sample listings for the Walk-In Store prototype.
// Later, this sample data can be replaced with a real database.
let books = [];
const searchInput=document.getElementById("searchInput");
const areaFilter=document.getElementById("areaFilter");
const availableOnly=document.getElementById("availableOnly");
const sortPrice = document.getElementById("sortPrice");

const clearFiltersButton = document.getElementById("clearFilters");

clearFiltersButton.addEventListener("click", () => {
    searchInput.value = "";
    areaFilter.value = "all";
    availableOnly.checked = false;
    renderBooks();
});

const bookResults=document.getElementById("bookResults");
const resultCount=document.getElementById("resultCount");
const noResults=document.getElementById("noResults");
const sellerButton=document.getElementById("sellerButton");
const sellerFormSection=document.getElementById("sellerFormSection");
const sellerForm=document.getElementById("sellerForm");
const formMessage=document.getElementById("formMessage");
const API_URL = "https://walk-in-store-backend.onrender.com";

async function loadBooks() {
    try {
        const response = await fetch(`${API_URL}/books`);

        if (!response.ok) {
            throw new Error("Could not fetch books");
        }

        books = await response.json();

        renderBooks();

    } catch (error) {
        console.error("Error loading books:", error);
        bookResults.textContent = "Unable to load books. Please try again.";
    }
}

function renderBooks(){
 const term=searchInput.value.trim().toLowerCase();
 const area=areaFilter.value;
 const filtered=books.filter(book=>{
const matchText =
    (book.title || "").toLowerCase().includes(term) ||
    (book.author || "").toLowerCase().includes(term) ||
    (book.store || "").toLowerCase().includes(term);
  const matchArea=area==="all"||book.area===area;
  const matchStock=!availableOnly.checked||book.quantity>0;
  return matchText&&matchArea&&matchStock;
 });
 
const sortOption = sortPrice.value;

if (sortOption === "low-high") {
 filtered.sort((a, b) => a.price - b.price);
} else if (sortOption === "high-low") {
 filtered.sort((a, b) => b.price - a.price);
}

bookResults.innerHTML = "";
filtered.forEach(book => {

  const available=book.quantity>0;
  const status=available?`Available · ${book.quantity} left`:"Out of stock";
  const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(book.address)}`;
  const card=document.createElement("article");
  card.className="book-card";
  card.innerHTML=`<div class="book-cover" aria-hidden="true"><div>${book.icon || "📚"}<span>${book.title}</span></div></div>
  <div class="book-info"><h4>${book.title}</h4><p class="author">by ${book.author}</p>
  <p class="store-line">${book.store}</p><p class="store-name">📍 ${book.area} · ${book.distance || "Distance not set"}</p>
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
sortPrice.addEventListener("change", renderBooks);
sellerButton.addEventListener("click",()=>{
 sellerFormSection.hidden=!sellerFormSection.hidden;
 if(!sellerFormSection.hidden)sellerFormSection.scrollIntoView({behavior:"smooth"});
});

sellerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const area = document.getElementById("newArea").value;

    const newBook = {
        title: document.getElementById("newTitle").value.trim(),
        author: document.getElementById("newAuthor").value.trim(),
        store: document.getElementById("newStore").value.trim(),
        area: area,
        price: Number(document.getElementById("newPrice").value),
        quantity: Number(document.getElementById("newQuantity").value),
        address: area
    };

    try {
        const response = await fetch(`${API_URL}/books`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newBook)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to add book");
        }

        formMessage.textContent = "Book added successfully!";

        sellerForm.reset();

        searchInput.value = "";
        areaFilter.value = "all";
        availableOnly.checked = false;
        sortPrice.value = "default";

        await loadBooks();

        document.getElementById("find-books").scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        console.error("Error adding book:", error);
        formMessage.textContent = error.message;
    }
});

loadBooks();
