var mongoose = require('mongoose');

var orderSchema = mongoose.Schema({
	status: String,
   email: String,
   date: { type: Date, default: Date.now },
   street: String,
   apartment: String,
   order: String,
   bill: Number
});

module.exports = mongoose.model('Order', orderSchema);