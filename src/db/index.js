"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw "Mongo URI not found !";
}

const client = mongoose.connect(
  MONGODB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (!err) {
      console.log("Successfully Established Connection with MongoDB");
    } else {
      console.log(
        "Failed to Establish Connection with MongoDB with Error: " + err
      );
    }
  }
);

const { MRequest } = require("./monitor_request.model");
module.exports = {
  client,
  MRequest,
};
