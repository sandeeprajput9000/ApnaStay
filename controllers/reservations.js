const Listing = require("../models/listing");
const Reservation = require("../models/reservation");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getNumberOfNights = (checkIn, checkOut) =>
  Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_IN_MS);

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getDateInputValue = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const getReservationDates = (reservationData) => {
  // Store date-only values at UTC midnight so they do not shift a day in the UI.
  const checkIn = new Date(reservationData.checkIn);
  const checkOut = new Date(reservationData.checkOut);

  if (reservationData.checkIn < getDateInputValue(getToday())) {
    return null;
  }

  return { checkIn, checkOut };
};

module.exports.createReservation = async (req, res) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    req.flash("error", "The property you are trying to reserve does not exist!");
    return res.redirect("/listings");
  }

  const existingReservation = await Reservation.findOne({
    listing: listing._id,
    guest: req.user._id,
  });

  if (existingReservation) {
    req.flash(
      "error",
      "You have already reserved this property. You can edit it from My Reservations."
    );
    return res.redirect("/reservations");
  }

  const dates = getReservationDates(req.body.reservation);
  if (!dates) {
    req.flash("error", "Check-in date cannot be in the past!");
    return res.redirect(`/listings/${listing._id}`);
  }

  const nights = getNumberOfNights(dates.checkIn, dates.checkOut);
  const reservation = new Reservation({
    listing: listing._id,
    guest: req.user._id,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    guests: req.body.reservation.guests,
    pricePerNight: listing.price,
    totalPrice: listing.price * nights,
  });

  try {
    await reservation.save();
  } catch (error) {
    if (error.code === 11000) {
      req.flash("error", "You have already reserved this property!");
      return res.redirect("/reservations");
    }
    throw error;
  }

  req.flash("success", "Property reserved! You can manage it from My Reservations.");
  res.redirect("/reservations");
};

module.exports.index = async (req, res) => {
  const reservations = await Reservation.find({ guest: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });

  res.render("reservations/index.ejs", {
    reservations: reservations.filter((reservation) => reservation.listing),
  });
};

module.exports.renderEditForm = async (req, res) => {
  await req.reservation.populate("listing");

  if (!req.reservation.listing) {
    req.flash("error", "This reserved property no longer exists!");
    return res.redirect("/reservations");
  }

  res.render("reservations/edit.ejs", {
    reservation: req.reservation,
    minDate: getDateInputValue(getToday()),
  });
};

module.exports.updateReservation = async (req, res) => {
  const dates = getReservationDates(req.body.reservation);
  if (!dates) {
    req.flash("error", "Check-in date cannot be in the past!");
    return res.redirect(`/reservations/${req.reservation._id}/edit`);
  }

  const nights = getNumberOfNights(dates.checkIn, dates.checkOut);
  req.reservation.checkIn = dates.checkIn;
  req.reservation.checkOut = dates.checkOut;
  req.reservation.guests = req.body.reservation.guests;
  req.reservation.totalPrice = req.reservation.pricePerNight * nights;
  await req.reservation.save();

  req.flash("success", "Reservation updated successfully!");
  res.redirect("/reservations");
};

module.exports.destroyReservation = async (req, res) => {
  await req.reservation.deleteOne();
  req.flash("success", "Property unreserved successfully!");
  res.redirect("/reservations");
};
