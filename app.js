if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
} 

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const reservationRouter = require("./routes/reservation.js");

app.use(express.static(path.join(__dirname, "/public")));
app.engine("ejs", ejsMate);
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

const dbName = process.env.ATLASDB_NAME || "test";
const dbUrl = buildDatabaseUrl(process.env.ATLASDB_URL);

function buildDatabaseUrl(srvUrl) {
  if (!srvUrl) {
    throw new Error("ATLASDB_URL is missing. Add it to the .env file.");
  }

  const seedHosts = process.env.ATLASDB_SEED_HOSTS;
  if (!seedHosts || !srvUrl.startsWith("mongodb+srv://")) {
    return srvUrl;
  }

  const parsedUrl = new URL(srvUrl);
  const credentials = parsedUrl.username
    ? `${parsedUrl.username}${parsedUrl.password ? `:${parsedUrl.password}` : ""}@`
    : "";
  const options = new URLSearchParams(parsedUrl.searchParams);

  options.set("tls", "true");
  options.set("authSource", options.get("authSource") || "admin");
  if (process.env.ATLASDB_REPLICA_SET) {
    options.set("replicaSet", process.env.ATLASDB_REPLICA_SET);
  }

  return `mongodb://${credentials}${seedHosts}/${dbName}?${options.toString()}`;
}

const mongoClientPromise = mongoose
  .connect(dbUrl, {
    dbName,
    serverSelectionTimeoutMS: 15000,
  })
  .then(() => mongoose.connection.getClient());

const store = MongoStore.create({
  clientPromise: mongoClientPromise,
  dbName,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 2600,
});

store.on("error", (err) => {
  console.error("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/listings");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/reservations", reservationRouter);
app.use("/", userRouter);

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Some Error Occured!" } = err;
  res.status(statusCode).render("./listings/error.ejs", { message });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await mongoClientPromise;
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exitCode = 1;
  }
}

startServer();
