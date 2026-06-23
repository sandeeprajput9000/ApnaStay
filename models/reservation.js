const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reservationSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    guest: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    guests: {
      type: Number,
      min: 1,
      max: 20,
      required: true,
    },
    pricePerNight: {
      type: Number,
      min: 0,
      required: true,
    },
    totalPrice: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { timestamps: true }
);

// A guest manages one reservation per property from the account page.
reservationSchema.index({ guest: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model("Reservation", reservationSchema);
