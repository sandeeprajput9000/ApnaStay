const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    image: Joi.object({
      filename: Joi.string(),
      url: Joi.string().required(),
    }),
    price: Joi.number().required().min(0),
    location: Joi.string().required(),
    country: Joi.string().required(),
    category: Joi.string().required(),
  }).required(),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});

module.exports.reservationSchema = Joi.object({
  reservation: Joi.object({
    checkIn: Joi.date().iso().required(),
    checkOut: Joi.date()
      .iso()
      .greater(Joi.ref("checkIn"))
      .required()
      .messages({
        "date.greater": "Check-out date must be after the check-in date",
      }),
    guests: Joi.number().integer().min(1).max(20).required(),
  }).required(),
});
