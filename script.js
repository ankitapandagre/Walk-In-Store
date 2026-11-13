
// ==========================================
// WALK-IN STORE - FRONTEND JAVASCRIPT
// ==========================================

let books = [];
let currentUserId = null;

const API_URL = "https://walk-in-store-backend.onrender.com";

// ==========================================
// HTML ELEMENTS
// ==========================================

const searchInput = document.getElementById("searchInput");
const areaFilter = document.getElementById("areaFilter");
const availableOnly = document.getElementById("availableOnly");
const sortPrice = document.getElementById("sortPrice");

const clearFiltersButton = document.getElementById("clearFilters");
const bookResults = document.getElementById("bookResults");
const resultCount = document.getElementById("resultCount");
const noResults = document.getElementById("noResults");

const sellerButton = document.getElementById("sellerButton");
const sellerFormSection = document.getElementById("sellerFormSection");
const sellerForm = document.getElementById("sellerForm");
const formMessage = document.getElementById("formMessage");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");
const authMessage = document.getElementById("authMessage");

const resendConfirmationButton =
    document.getElementById("resendConfirmationButton");

// Escape user-entered text before inserting it into HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Get the current logged-in user's access token.
async function getAccessToken() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        return null;
    }

    return data.session.access_token;
}

// ==========================================
// LOAD BOOKS FROM BACKEND
// ==========================================

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
        bookResults.textContent =
            "Unable to load books. Please try again.";
    }
}

// ==========================================
// DISPLAY BOOKS
// ==========================================

function renderBooks() {

    const term = searchInput.value.trim().toLowerCase();
    const area = areaFilter.value;

    const filtered = books.filter(book => {

        const matchText =
            (book.title || "").toLowerCase().includes(term) ||
            (book.author || "").toLowerCase().includes(term) ||
            (book.store || "").toLowerCase().includes(term);

        const matchArea =
            area === "all" || book.area === area;

        const matchStock =
            !availableOnly.checked || book.quantity > 0;

        return matchText && matchArea && matchStock;
    });

    // SORT BY PRICE

    const sortOption = sortPrice.value;

    if (sortOption === "low-high") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "high-low") {
        filtered.sort((a, b) => b.price - a.price);
    }

    bookResults.innerHTML = "";

    filtered.forEach(book => {

        // Check whether the logged-in user owns this book.
        const isOwner =
            Boolean(currentUserId) &&
            book.owner_id === currentUserId;

        const available = book.quantity > 0;

        const status = available
            ? `Available · ${book.quantity} left`
            : "Out of stock";

        const mapUrl =
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(book.address || book.area || "")}`;

        const card = document.createElement("article");
        card.className = "book-card";

        // BOOK CARD HTML

        card.innerHTML = `
            <div class="book-cover" aria-hidden="true">
                <div>
                    ${escapeHTML(book.icon || "📚")}
                    <span>${escapeHTML(book.title)}</span>
                </div>
            </div>

            <div class="book-info">

                <h4>${escapeHTML(book.title)}</h4>

                <p class="author">
                    by ${escapeHTML(book.author)}
                </p>

                <p class="store-line">
                    ${escapeHTML(book.store)}
                </p>

                <p class="store-name">
                    📍 ${escapeHTML(book.area)} ·
                    ${escapeHTML(book.distance || "Distance not set")}
                </p>

                <div class="card-bottom">

                    <span class="price">
                        ₹${escapeHTML(book.price)}
                    </span>

                    <span class="stock ${available ? "" : "out"}">
                        ${escapeHTML(status)}
                    </span>

                </div>

                <div class="card-actions">

                    <a href="${mapUrl}"
                       target="_blank"
                       rel="noopener noreferrer">
                        View location ↗
                    </a>

                    <button type="button" class="details-button">
                        Book details
                    </button>

                    ${isOwner ? `
                        <button type="button" class="edit-button">
                            Edit
                        </button>

                        <button type="button" class="delete-button">
                            Delete
                        </button>
                    ` : ""}

                </div>

            </div>
        `;

        // ==================================
        // BOOK DETAILS BUTTON
        // ==================================

        card.querySelector(".details-button")
            .addEventListener("click", () => {

                alert(
                    `${book.title}
Author: ${book.author}
Store: ${book.store}
Area: ${book.area}
Price: ₹${book.price}
Stock: ${book.quantity}

Demo listing only — please confirm availability with the store.`
                );

            });

        // ==================================
        // EDIT BUTTON
        // ==================================

        const editButton = card.querySelector(".edit-button");

        if (editButton) {

            editButton.addEventListener("click", async () => {

                const newQuantity = prompt(
                    "Enter updated quantity:",
                    book.quantity
                );

                if (newQuantity === null) return;

                if (
                    newQuantity.trim() === "" ||
                    !Number.isInteger(Number(newQuantity)) ||
                    Number(newQuantity) < 0
                ) {
                    alert("Please enter a valid quantity.");
                    return;
                }

                try {

                    const token = await getAccessToken();

                    if (!token) {
                        alert("Please log in again.");
                        return;
                    }

                    const response = await fetch(
                        `${API_URL}/books/${book.id}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                quantity: Number(newQuantity)
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        alert(
                            result.message ||
                            "Could not update book."
                        );
                        return;
                    }

                    alert("Book quantity updated successfully!");

                    await loadBooks();

                } catch (error) {

                    console.error("Error updating book:", error);

                    alert("Something went wrong while updating the book.");

                }

            });

        }

        // ==================================
        // DELETE BUTTON
        // ==================================

        const deleteButton = card.querySelector(".delete-button");

        if (deleteButton) {

            deleteButton.addEventListener("click", async () => {

                const confirmed = confirm(
                    `Are you sure you want to delete "${book.title}"?`
                );

                if (!confirmed) return;

                try {

                    const token = await getAccessToken();

                    if (!token) {
                        alert("Please log in again.");
                        return;
                    }

                    const response = await fetch(
                        `${API_URL}/books/${book.id}`,
                        {
                            method: "DELETE",

                            headers: {
                                "Authorization": `Bearer ${token}`
                            }
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        alert(
                            result.message ||
                            "Could not delete book."
                        );
                        return;
                    }

                    alert("Book deleted successfully!");

                    await loadBooks();

                } catch (error) {

                    console.error("Error deleting book:", error);

                    alert("Something went wrong while deleting the book.");

                }

            });

        }

        bookResults.appendChild(card);

    });

    // UPDATE RESULT COUNT

    resultCount.textContent =
        `${filtered.length} listing${filtered.length === 1 ? "" : "s"}`;

    noResults.hidden = filtered.length !== 0;

}

// ==========================================
// SEARCH AND FILTERS
// ==========================================

document.getElementById("searchButton")
    .addEventListener("click", renderBooks);

searchInput.addEventListener("input", renderBooks);

areaFilter.addEventListener("change", renderBooks);

availableOnly.addEventListener("change", renderBooks);

sortPrice.addEventListener("change", renderBooks);

clearFiltersButton.addEventListener("click", () => {

    searchInput.value = "";
    areaFilter.value = "all";
    availableOnly.checked = false;
    sortPrice.value = "default";

    renderBooks();

});

// ==========================================
// SHOPKEEPER FORM VISIBILITY
// ==========================================

sellerButton.addEventListener("click", () => {

    sellerFormSection.hidden = !sellerFormSection.hidden;

    if (!sellerFormSection.hidden) {
        sellerFormSection.scrollIntoView({
            behavior: "smooth"
        });
    }

});

// ==========================================
// ADD NEW BOOK
// ==========================================

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

        const token = await getAccessToken();

        if (!token) {
            throw new Error("Please login before adding a book.");
        }

        const response = await fetch(`${API_URL}/books`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify(newBook)

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to add book"
            );
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

// ==========================================
// SHOPKEEPER SIGNUP
// ==========================================

signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("signupEmail").value;

    const password =
        document.getElementById("signupPassword").value;

    const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {

        authMessage.textContent = error.message;
        return;

    }

    authMessage.textContent =
        "Signup successful! Please check your email for confirmation.";

});

// ==========================================
// SHOPKEEPER LOGIN
// ==========================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({

            email: email,
            password: password

        });

    if (error) {

        authMessage.textContent = error.message;
        return;

    }

    currentUserId = data.user.id;

    authMessage.textContent = "Login successful!";

    logoutButton.hidden = false;

    renderBooks();

});

// ==========================================
// SHOPKEEPER LOGOUT
// ==========================================

logoutButton.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {

        authMessage.textContent = error.message;
        return;

    }

    authMessage.textContent = "Logged out successfully!";

    logoutButton.hidden = true;

    currentUserId = null;

    renderBooks();

});

// ==========================================
// RESEND CONFIRMATION EMAIL
// ==========================================

resendConfirmationButton.addEventListener("click", async () => {

    const email =
        document.getElementById("signupEmail").value;

    if (!email) {

        authMessage.textContent =
            "Please enter your email address first.";

        return;

    }

    const { error } = await supabaseClient.auth.resend({

        type: "signup",
        email: email

    });

    if (error) {

        authMessage.textContent = error.message;
        return;

    }

    authMessage.textContent =
        "Confirmation email sent! Please check your inbox.";

});

// ==========================================
// CHECK EXISTING LOGIN SESSION
// ==========================================

async function checkLoginSession() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {

        console.log(error.message);
        return;

    }

    if (data.session) {

        currentUserId = data.session.user.id;

        authMessage.textContent = "You are logged in!";

        logoutButton.hidden = false;

    } else {

        currentUserId = null;

        logoutButton.hidden = true;

    }

    renderBooks();

}

// ==========================================
// INITIALIZE WEBSITE
// ==========================================

async function initializeWebsite() {

    await checkLoginSession();

    await loadBooks();

}

initializeWebsite();
