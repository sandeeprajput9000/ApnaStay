require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Review = require("../models/review");
const User = require("../models/user");

const SEED_BATCH = "contextual-five-per-listing-v1";
const REVIEWS_PER_LISTING = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// These are the 13 reviewer accounts supplied for this seed batch.
const REVIEWER_EMAILS = [
  "jaspalrajput123@gmail.com",
  "gouravpatidar12@gmail.com",
  "dheerajpatidar1234@gmail.com",
  "nikitamewada123@gmail.com",
  "radhika123@gmail.com",
  "ajay123@gmail.com",
  "manu123@gmail.com",
  "prashant123@gmail.com",
  "yash123@gmail.com",
  "priyanshi123@gmail.com",
  "shivani123@gmail.com",
  "apoorva123@gmail.com",
  "vaibhav123@gmail.com",
];

const CATEGORY_CONTEXT = {
  Apartment: {
    label: "apartment",
    highlight: "comfortable layout and polished interiors",
    experience: "The practical design makes it easy to relax after exploring the area",
  },
  Beach: {
    label: "beach stay",
    highlight: "coastal atmosphere and beautiful seaside setting",
    experience: "The relaxed coastal mood makes mornings and evenings especially lovely",
  },
  "Amazing-Pools": {
    label: "poolside stay",
    highlight: "inviting pool area and refreshing outdoor ambience",
    experience: "The poolside setting is perfect for slowing down and enjoying the day",
  },
  Cabins: {
    label: "cabin",
    highlight: "warm cabin character and connection with nature",
    experience: "The peaceful surroundings create a wonderfully cozy escape",
  },
  Boat: {
    label: "boat stay",
    highlight: "unique waterside setting and memorable deck views",
    experience: "Being close to the water makes the whole experience feel special",
  },
  Campsite: {
    label: "campsite",
    highlight: "open-air setting and calm natural surroundings",
    experience: "The outdoor atmosphere is ideal for quiet evenings under the sky",
  },
  Camping: {
    label: "camping stay",
    highlight: "peaceful outdoor setting and back-to-nature feel",
    experience: "It is a refreshing place to unplug and enjoy the landscape",
  },
  "Historical-Homes": {
    label: "historic home",
    highlight: "heritage details and timeless architectural character",
    experience: "The blend of history and comfort gives the stay a distinctive charm",
  },
  Lake: {
    label: "lakeside stay",
    highlight: "serene water views and peaceful lakeside atmosphere",
    experience: "The calm setting by the water makes it easy to truly unwind",
  },
  Rooms: {
    label: "private room",
    highlight: "cozy space and welcoming, thoughtfully arranged interior",
    experience: "The comfortable setup makes settling in feel effortless",
  },
  "Iconic-Cities": {
    label: "city stay",
    highlight: "stylish urban feel and convenient city setting",
    experience: "It is a great base for discovering the energy and character of the city",
  },
  Mountains: {
    label: "mountain retreat",
    highlight: "dramatic mountain scenery and peaceful natural setting",
    experience: "The fresh mountain atmosphere makes the visit feel deeply restorative",
  },
  Castles: {
    label: "castle stay",
    highlight: "grand architecture and storybook character",
    experience: "The remarkable setting turns an ordinary trip into a memorable experience",
  },
  Farm: {
    label: "farm stay",
    highlight: "quiet fields and authentic countryside atmosphere",
    experience: "The slower rural rhythm makes this a wonderfully peaceful break",
  },
  Arctic: {
    label: "arctic retreat",
    highlight: "striking snowy landscape and cozy shelter",
    experience: "The dramatic surroundings make every view feel unforgettable",
  },
  "Ski-in-out": {
    label: "ski stay",
    highlight: "easy slope access and welcoming alpine atmosphere",
    experience: "The mountain setting is wonderfully suited to an active winter escape",
  },
  New: {
    label: "modern stay",
    highlight: "fresh design and clean, contemporary finish",
    experience: "The thoughtfully finished space feels bright, easy, and comfortable",
  },
  Woodlands: {
    label: "woodland retreat",
    highlight: "lush forest surroundings and quiet natural ambience",
    experience: "The trees and peaceful setting make this a refreshing place to recharge",
  },
  Countryside: {
    label: "countryside stay",
    highlight: "open rural views and wonderfully calm atmosphere",
    experience: "The unhurried surroundings offer a lovely escape from the usual rush",
  },
  "Bed-and-Breakfasts": {
    label: "bed and breakfast",
    highlight: "homely character and warm, welcoming atmosphere",
    experience: "The intimate setting gives the visit a relaxed and personal feel",
  },
};

function buildDatabaseUrl(srvUrl) {
  if (!srvUrl) {
    throw new Error("ATLASDB_URL is missing from .env");
  }

  const seedHosts = process.env.ATLASDB_SEED_HOSTS;
  if (!seedHosts || !srvUrl.startsWith("mongodb+srv://")) {
    return srvUrl;
  }

  const dbName = process.env.ATLASDB_NAME || "test";
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

function descriptionHighlight(description, fallback) {
  const text = (description || "").toLowerCase();
  const signals = [
    [/ocean|beach|coast|sea/, "the beautiful coastal setting"],
    [/pool/, "the inviting poolside atmosphere"],
    [/mountain|alpine|valley/, "the impressive mountain scenery"],
    [/lake|river|waterfront|waterside/, "the peaceful waterside setting"],
    [/forest|woodland|nature|trees/, "the close connection with nature"],
    [/historic|heritage|century|traditional/, "the property's distinctive historic character"],
    [/castle|palace|grand/, "the striking architecture and grand sense of place"],
    [/farm|rural|countryside|fields/, "the calm rural surroundings"],
    [/ski|snow|winter|arctic/, "the memorable winter landscape"],
    [/city|downtown|urban|central/, "the convenient city location"],
    [/modern|stylish|contemporary/, "the clean and stylish design"],
    [/cozy|cosy|charming|warm/, "the cozy and welcoming character"],
  ];

  return signals.find(([pattern]) => pattern.test(text))?.[1] || fallback;
}

function createComments(listing) {
  const context = CATEGORY_CONTEXT[listing.category] || {
    label: "stay",
    highlight: "welcoming design and relaxing atmosphere",
    experience: "The thoughtful setting makes the visit comfortable and memorable",
  };
  const place = [listing.location, listing.country].filter(Boolean).join(", ");
  const location = listing.location || listing.country || "the area";
  const title = listing.title || "This place";
  const descriptionDetail = descriptionHighlight(listing.description, context.highlight);

  return [
    `${title} in ${place} is every bit as beautiful as the photos. The ${context.highlight} gives the whole stay a warm and memorable character.`,
    `A lovely ${context.label} in ${place}. I especially enjoyed ${descriptionDetail}; it made the experience feel both relaxing and special.`,
    `The setting around ${location} is wonderful, and this place fits it perfectly. ${context.experience}, while the space feels comfortable and thoughtfully presented.`,
    `Such a charming find in ${place}! The ${context.highlight} stands out immediately, and the peaceful atmosphere makes it easy to settle in and enjoy the stay.`,
    `${title} is a beautiful choice for anyone visiting ${location}. ${context.experience}; I would happily recommend this ${context.label} and return again.`,
  ];
}

function selectReviewers(reviewers, listing, existingAuthorIds, listingIndex) {
  const ownerId = listing.owner?.toString();
  const eligible = reviewers.filter((reviewer) => {
    const reviewerId = reviewer._id.toString();
    return reviewerId !== ownerId && !existingAuthorIds.has(reviewerId);
  });

  if (eligible.length < REVIEWS_PER_LISTING) {
    throw new Error(`Not enough eligible reviewers for ${listing.title}`);
  }

  const start = listingIndex % eligible.length;
  return Array.from(
    { length: REVIEWS_PER_LISTING },
    (_, index) => eligible[(start + index) % eligible.length],
  );
}

async function verifySeed(listings) {
  const seededReviews = await Review.collection.find({ seedBatch: SEED_BATCH }).toArray();
  const reviewsByListing = new Map();

  for (const review of seededReviews) {
    const listingId = review.seedListing.toString();
    if (!reviewsByListing.has(listingId)) {
      reviewsByListing.set(listingId, []);
    }
    reviewsByListing.get(listingId).push(review);
  }

  for (const listing of listings) {
    const reviews = reviewsByListing.get(listing._id.toString()) || [];
    const authors = new Set(reviews.map((review) => review.author.toString()));
    const hasHostReview = reviews.some(
      (review) => review.author.toString() === listing.owner?.toString(),
    );

    if (reviews.length !== REVIEWS_PER_LISTING || authors.size !== REVIEWS_PER_LISTING || hasHostReview) {
      throw new Error(`Seed verification failed for ${listing.title}`);
    }
  }

  return seededReviews.length;
}

async function main() {
  const shouldApply = process.argv.includes("--apply");
  const dbName = process.env.ATLASDB_NAME || "test";

  await mongoose.connect(buildDatabaseUrl(process.env.ATLASDB_URL), {
    dbName,
    serverSelectionTimeoutMS: 15000,
  });

  const [reviewers, listings] = await Promise.all([
    User.find({ email: { $in: REVIEWER_EMAILS } }, "username email").lean(),
    Listing.find({}, "title description location country category owner reviews").sort({ _id: 1 }).lean(),
  ]);

  const foundEmails = new Set(reviewers.map((reviewer) => reviewer.email));
  const missingEmails = REVIEWER_EMAILS.filter((email) => !foundEmails.has(email));
  if (missingEmails.length) {
    throw new Error(`Reviewer accounts not found: ${missingEmails.join(", ")}`);
  }

  const orderedReviewers = REVIEWER_EMAILS.map((email) =>
    reviewers.find((reviewer) => reviewer.email === email),
  );
  const existingReviews = await Review.find(
    { _id: { $in: listings.flatMap((listing) => listing.reviews) } },
    "author",
  ).lean();
  const existingReviewById = new Map(
    existingReviews.map((review) => [review._id.toString(), review]),
  );

  const plans = listings.map((listing, listingIndex) => {
    const existingAuthorIds = new Set(
      listing.reviews
        .map((reviewId) => existingReviewById.get(reviewId.toString())?.author?.toString())
        .filter(Boolean),
    );
    const selectedReviewers = selectReviewers(
      orderedReviewers,
      listing,
      existingAuthorIds,
      listingIndex,
    );
    const comments = createComments(listing);

    return {
      listing,
      reviews: selectedReviewers.map((reviewer, reviewIndex) => ({
        _id: new mongoose.Types.ObjectId(),
        comment: comments[reviewIndex],
        rating: [5, 5, 4, 5, 5][reviewIndex],
        author: reviewer._id,
        createdAt: new Date(Date.now() - ((listingIndex + reviewIndex * 7) % 90 + 1) * DAY_IN_MS),
        seedBatch: SEED_BATCH,
        seedListing: listing._id,
      })),
    };
  });

  const reviewTotal = plans.reduce((total, plan) => total + plan.reviews.length, 0);
  console.log(`Prepared ${reviewTotal} reviews for ${listings.length} listings.`);

  const existingSeedCount = await Review.collection.countDocuments({ seedBatch: SEED_BATCH });
  if (existingSeedCount) {
    const verifiedCount = await verifySeed(listings);
    console.log(`Seed batch already exists and is valid (${verifiedCount} reviews). No changes made.`);
    return;
  }

  if (!shouldApply) {
    console.log("Dry run complete. Run again with --apply to write these reviews.");
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const transactionSeedCount = await Review.collection.countDocuments(
        { seedBatch: SEED_BATCH },
        { session },
      );
      if (transactionSeedCount) {
        throw new Error("This review seed batch was applied by another process.");
      }

      const reviewDocuments = plans.flatMap((plan) => plan.reviews);
      await Review.collection.insertMany(reviewDocuments, { session, ordered: true });
      await Listing.bulkWrite(
        plans.map((plan) => ({
          updateOne: {
            filter: { _id: plan.listing._id },
            update: { $push: { reviews: { $each: plan.reviews.map((review) => review._id) } } },
          },
        })),
        { session, ordered: true },
      );
    });
  } finally {
    await session.endSession();
  }

  const verifiedCount = await verifySeed(listings);
  const [reviewDocumentTotal, linkedReviewTotal] = await Promise.all([
    Review.countDocuments(),
    Listing.aggregate([
      { $project: { count: { $size: "$reviews" } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
  ]);

  console.log(`Added and verified ${verifiedCount} contextual reviews.`);
  console.log(`Review documents: ${reviewDocumentTotal}`);
  console.log(`Reviews linked from listings: ${linkedReviewTotal[0]?.total || 0}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
