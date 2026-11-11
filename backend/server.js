
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

// Middleware
app.use(cors());
app.use(express.json());

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
app.post("/books", async (req, res) => {
    const { title, author, store, area, price, quantity, address } = req.body;

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
            address
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
app.put("/books/:id", async (req, res) => {
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
app.delete("/books/:id", async (req, res) => {
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


// Start server
app.listen(PORT, () => {
    console.log(`Walk-In Store backend running at http://localhost:${PORT}`);
});
