const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const {
  isLoggedIn,
  isReservationOwner,
  validateReservation,
} = require("../middlewares");
const reservationController = require("../controllers/reservations");

router.get("/", isLoggedIn, wrapAsync(reservationController.index));

router.get(
  "/:id/edit",
  isLoggedIn,
  isReservationOwner,
  wrapAsync(reservationController.renderEditForm)
);

router
  .route("/:id")
  .put(
    isLoggedIn,
    isReservationOwner,
    validateReservation,
    wrapAsync(reservationController.updateReservation)
  )
  .delete(
    isLoggedIn,
    isReservationOwner,
    wrapAsync(reservationController.destroyReservation)
  );

module.exports = router;
