
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
app.use(cors({
    origin: [
        "https://walk-in-store.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json({ limit: "100kb" }));

// Verify shopkeeper authentication

async function verifyShopkeeper(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please log in to add books."
            });
        }

        const { data, error } = await supabaseAuth.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                message: "Your session is invalid or expired. Please log in again."
            });
        }

        const { data: shopkeeper, error: shopError } = await supabase
            .from("shopkeepers")
            .select("approved, status")
            .eq("user_id", data.user.id)
            .single();

        if (shopError || !shopkeeper) {
            return res.status(403).json({
                message: "Shopkeeper account not found. Please contact the administrator."
            });
        }

        if (shopkeeper.status === "rejected") {
            return res.status(403).json({
                message: "Your shopkeeper application has been rejected. Please contact the administrator."
            });
        }

        if (shopkeeper.approved !== true) {
            return res.status(403).json({
                message: "Your account is awaiting admin approval. You can add books after approval."
            });
        }

        req.user = data.user;
        next();

    } catch (err) {
        console.error("Shopkeeper authentication error:", err);

        return res.status(500).json({
            message: "Authentication failed due to a server error."
        });
    }
}


// ==========================================
// VERIFY ADMIN AUTHENTICATION
// ==========================================

async function verifyAdmin(req, res, next) {
    try {
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

    } catch (err) {
        console.error("Admin authentication error:", err);

        return res.status(500).json({
            message: "Admin authentication failed."
        });
    }
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

// GET: Fetch all books with shopkeeper verification status
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

    // Get approved shopkeepers
    const { data: shopkeepers, error: shopkeeperError } =
        await supabase
            .from("shopkeepers")
            .select("user_id, approved")
            .eq("approved", true);

    if (shopkeeperError) {
        console.error("Shopkeeper fetch error:", shopkeeperError.message);
        return res.status(500).json({
            message: "Unable to fetch verification details."
        });
    }

    // Attach verification status to each book
    const verifiedUsers = new Set(
        shopkeepers.map(shop => shop.user_id)
    );

    const booksWithVerification = data.map(book => ({
        ...book,
        is_verified: book.owner_id
            ? verifiedUsers.has(book.owner_id)
            : false
    }));

    res.json(booksWithVerification);
});


// GET: Search books safely
app.get("/books/search", async (req, res) => {
    try {
        if (typeof req.query.q !== "string") {
            return res.status(400).json({
                message: "Please enter a valid search term."
            });
        }

        const search = req.query.q.trim();

        if (!search || search.length > 100) {
            return res.status(400).json({
                message: "Search must contain 1 to 100 characters."
            });
        }

        // Allow letters, numbers, spaces, apostrophes and hyphens
        const safeSearch = search
            .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
            .trim();

        if (!safeSearch) {
            return res.status(400).json({
                message: "Please enter a valid search term."
            });
        }

        const { data, error } = await supabase
            .from("books")
            .select("*")
            .or(
                `title.ilike.%${safeSearch}%,author.ilike.%${safeSearch}%,store.ilike.%${safeSearch}%`
            );

        if (error) {
            console.error("Supabase search error:", error.message);

            return res.status(500).json({
                message: "Unable to search books."
            });
        }

        res.json(data);

    } catch (err) {
        console.error("Search error:", err);

        res.status(500).json({
            message: "Something went wrong while searching."
        });
    }
});


// POST: Add a new book

app.post("/books", verifyShopkeeper, async (req, res) => {

    const { title, author, store, area, price, quantity, image_url } = req.body;

    if (!title || !author || !store || !area ||
        price === undefined || quantity === undefined) {
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

    // Fetch the logged-in shopkeeper's registered address
    const { data: shopkeeper, error: shopkeeperError } =
        await supabase
            .from("shopkeepers")
            .select("shop_address")
            .eq("user_id", req.user.id)
            .single();

    if (shopkeeperError || !shopkeeper?.shop_address?.trim()) {
        return res.status(400).json({
            message: "Please add a valid shop address to your account."
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
            address: shopkeeper.shop_address.trim(),
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

// ==========================================
// ADMIN: LIST ALL SHOPKEEPER ACCOUNTS
// ==========================================

app.get("/admin/shopkeepers/manage", verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("shopkeepers")
            .select("user_id, shop_name, shop_address, status, approved, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Shopkeeper management error:", error.message);

            return res.status(500).json({
                message: "Unable to load shopkeeper accounts."
            });
        }

        res.json(data);

    } catch (err) {
        console.error("Account list error:", err);

        res.status(500).json({
            message: "Unable to load accounts."
        });
    }
});


// ==========================================
// ADMIN: PERMANENTLY DELETE SHOPKEEPER
// ==========================================

app.delete("/admin/shopkeepers/:userId", verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Validate UUID format
        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(userId)) {
            return res.status(400).json({
                message: "Invalid account ID."
            });
        }

        // Never allow an admin to delete their own account
        if (userId === req.user.id) {
            return res.status(403).json({
                message: "You cannot delete your own admin account."
            });
        }

        // Never allow deletion of another admin account
        const { data: admin, error: adminError } = await supabase
            .from("admins")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        if (admin) {
            return res.status(403).json({
                message: "Admin accounts cannot be deleted here."
            });
        }

        // Confirm that this is a registered shopkeeper
        const { data: shopkeeper, error: shopError } = await supabase
            .from("shopkeepers")
            .select("user_id, shop_name")
            .eq("user_id", userId)
            .maybeSingle();

        if (shopError) {
            throw shopError;
        }

        if (!shopkeeper) {
            return res.status(404).json({
                message: "Shopkeeper account not found."
            });
        }

        // Find uploaded images belonging to this shopkeeper
        const imagePaths = [];
        let offset = 0;
        const pageSize = 100;

        while (true) {
            const { data: files, error: storageError } =
                await supabase.storage
                    .from("book-images")
                    .list(userId, {
                        limit: pageSize,
                        offset: offset
                    });

            if (storageError) {
                throw storageError;
            }

            if (!files || files.length === 0) {
                break;
            }

            files.forEach(file => {
                imagePaths.push(`${userId}/${file.name}`);
            });

            offset += files.length;

            if (files.length < pageSize) {
                break;
            }
        }

        // Remove uploaded images
        if (imagePaths.length > 0) {
            const { error: imageError } = await supabase.storage
                .from("book-images")
                .remove(imagePaths);

            if (imageError) {
                throw imageError;
            }
        }

        // Delete all books belonging to this shopkeeper
        const { error: booksError } = await supabase
            .from("books")
            .delete()
            .eq("owner_id", userId);

        if (booksError) {
            throw booksError;
        }

        // Delete the shopkeeper approval/profile record
        const { error: profileError } = await supabase
            .from("shopkeepers")
            .delete()
            .eq("user_id", userId);

        if (profileError) {
            throw profileError;
        }

        // Permanently delete the Supabase Auth account
        const { error: authError } =
            await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Auth account deletion error:", authError.message);

            return res.status(500).json({
                message: "Listings and shopkeeper profile were removed, but the login account could not be deleted. Please check Supabase."
            });
        }

        res.json({
            message: `${shopkeeper.shop_name || "Shopkeeper"} and their account were permanently deleted.`
        });

    } catch (err) {
        console.error("Shopkeeper deletion error:", err);

        res.status(500).json({
            message: "Unable to complete account deletion."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Walk-In Store backend running at http://localhost:${PORT}`);
});
