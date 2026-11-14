
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);
// Supabase client for verifying shopkeeper login tokens
const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// Middleware
app.use(cors());



app.use(express.json());
// Verify shopkeeper authentication
async function verifyShopkeeper(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    // Verify the login token
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({
            message: "Invalid or expired login session."
        });
    }

    // Check whether this user is an approved shopkeeper
    const { data: shopkeeper, error: approvalError } =
        await supabase
            .from("shopkeepers")
            .select("approved")
            .eq("user_id", data.user.id)
            .maybeSingle();

    if (approvalError) {
        console.error("Approval check failed:", approvalError.message);

        return res.status(500).json({
            message: "Unable to verify shopkeeper approval."
        });
    }

    if (!shopkeeper || shopkeeper.approved !== true) {
        return res.status(403).json({
            message: "Your shopkeeper account is not approved yet."
        });
    }

    req.user = data.user;
    next();
}

// ==========================================
// VERIFY ADMIN AUTHENTICATION
// ==========================================

async function verifyAdmin(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } =
        await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({
            message: "Invalid or expired login session."
        });
    }

    const { data: admin, error: adminError } =
        await supabase
            .from("admins")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

    if (adminError) {
        console.error("Admin verification failed:", adminError.message);

        return res.status(500).json({
            message: "Unable to verify admin access."
        });
    }

    if (!admin) {
        return res.status(403).json({
            message: "Admin access denied."
        });
    }

    req.user = data.user;
    next();
}

// Temporary book data
let books = [
    {
        id: 1,
        title: "The Diary of a Young Girl",
        author: "Anne Frank",
        store: "Readers Point",
        area: "Delhi",
        price: 299,
        quantity: 4,
        address: "Connaught Place, New Delhi"
    },
    {
        id: 2,
        title: "RD Sharma Mathematics - Class 12",
        author: "R. D. Sharma",
        store: "Student Book House",
        area: "Bhopal",
        price: 620,
        quantity: 3,
        address: "MP Nagar, Bhopal"
    },
    {
        id: 3,
        title: "Atomic Habits",
        author: "James Clear",
        store: "Page Turner Books",
        area: "Indore",
        price: 450,
        quantity: 2,
        address: "Vijay Nagar, Indore"
    }
];

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to Walk-In Store Backend!");
});

// GET: Fetch all books
app.get("/books", async (req, res) => {
    const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Supabase error:", error.message);
        return res.status(500).json({
            message: "Unable to fetch books."
        });
    }

    res.json(data);
});

// GET: Search books
app.get("/books/search", async (req, res) => {
    const search = (req.query.q || "").trim();

    const { data, error } = await supabase
        .from("books")
        .select("*")
        .or(`title.ilike.%${search}%,author.ilike.%${search}%,store.ilike.%${search}%`);

    if (error) {
        console.error("Supabase error:", error.message);
        return res.status(500).json({
            message: "Unable to search books."
        });
    }

    res.json(data);
});


// POST: Add a new book
app.post("/books", verifyShopkeeper, async (req, res) => {
const { title, author, store, area, price, quantity, address, image_url } = req.body;
    if (!title || !author || !store || !area ||
        price === undefined || quantity === undefined || !address) {
        return res.status(400).json({
            message: "Please provide all book details."
        });
    }

    if (
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0
    ) {
        return res.status(400).json({
            message: "Please enter a valid price and stock quantity."
        });
    }

    const { data, error } = await supabase
        .from("books")
               .insert([{
    title,
    author,
    store,
    area,
    price: Number(price),
    quantity: Number(quantity),
    address,
    image_url: image_url || null,
    owner_id: req.user.id
}])
        .select()
        .single();

    if (error) {
        console.error("Supabase error:", error.message);
        return res.status(500).json({
            message: "Unable to add book."
        });
    }

    res.status(201).json({
        message: "Book added successfully!",
        book: data
    });
});

// PUT: Update book stock

// PUT: Update book stock
app.put("/books/:id", verifyShopkeeper, async (req, res) => {
    const id = Number(req.params.id);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid book ID."
        });
    }

    if (
        req.body.quantity === undefined ||
        !Number.isInteger(quantity) ||
        quantity < 0
    ) {
        return res.status(400).json({
            message: "Enter a valid stock quantity."
        });
    }

    const { data, error } = await supabase
        .from("books")
        .update({ quantity: quantity })
        .eq("id", id)
        .eq("owner_id", req.user.id)
        .select()
        .maybeSingle();

    if (error) {
        console.error("Supabase error:", error.message);
        return res.status(500).json({
            message: "Unable to update stock."
        });
    }

    if (!data) {
        return res.status(404).json({
            message: "Book not found."
        });
    }

    res.json({
        message: "Stock updated successfully!",
        book: data
    });
});


// DELETE: Remove a book

// DELETE: Remove a book
app.delete("/books/:id", verifyShopkeeper, async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid book ID."
        });
    }

    const { data, error } = await supabase
        .from("books")
        .delete()
        .eq("id", id)
        .eq("owner_id", req.user.id)
        .select()
        .maybeSingle();

    if (error) {
        console.error("Supabase error:", error.message);
        return res.status(500).json({
            message: "Unable to delete book."
        });
    }

    if (!data) {
        return res.status(404).json({
            message: "Book not found."
        });
    }

    res.json({
        message: "Book deleted successfully!"
    });
});


// ==========================================
// ADMIN: GET PENDING SHOPKEEPERS
// ==========================================

app.get("/admin/shopkeepers", verifyAdmin, async (req, res) => {

    const { data, error } = await supabase
        .from("shopkeepers")
        .select("user_id, shop_name, shop_address, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Admin fetch error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch applications."
        });
    }

    res.json(data);
});


// ==========================================
// ADMIN: APPROVE OR REJECT SHOPKEEPER
// ==========================================

app.patch("/admin/shopkeepers/:userId", verifyAdmin, async (req, res) => {

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
            message: "Invalid application status."
        });
    }

    const { data, error } = await supabase
        .from("shopkeepers")
        .update({
            status: status,
            approved: status === "approved"
        })
        .eq("user_id", req.params.userId)
        .eq("status", "pending")
        .select()
        .maybeSingle();

    if (error) {
        console.error("Admin update error:", error.message);

        return res.status(500).json({
            message: "Unable to update application."
        });
    }

    if (!data) {
        return res.status(404).json({
            message: "Pending application not found."
        });
    }

    res.json({
        message: `Shopkeeper ${status} successfully!`,
        shopkeeper: data
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Walk-In Store backend running at http://localhost:${PORT}`);
});
