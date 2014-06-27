var Order = require('../models/order');
var User = require('../models/user');
var mongoose = require('mongoose');
var ioc = require('socket.io-client');
var csocket = ioc.connect('localhost', { port: 3000 });

module.exports = function(app, passport) {

	app.get('*', function(req, res, next) {
		res.locals.loggedIn = (req.user) ? true : false;
		if (req.isAuthenticated()) res.locals.useremail = req.user.local.email || null;
		if (req.isAuthenticated()) res.locals.usertype = req.user.local.usertype || null;
		next();
	});

	// index
	app.get('/', isNotBanned, function(req, res) {
		var subtitle = '';
		if (req.isAuthenticated()) subtitle = 'Twoje zamówienie';
		else subtitle = 'Rejestracja';
		res.render('index', { 'title': 'Pizza online', 'subtitle': subtitle, 'user': req.isAuthenticated() });
	});
	app.post('/', isNotBanned, function(req, res) {
		var action = req.body.action;
		var date = Date.now();
		var email = req.user.local.email;

		if(action == 'midOrder') {
			var order = req.body.order;
			var bill = req.body.bill;
			Order.update({ 'email': email }, { 'order': order, 'bill': bill }, { upsert: true }, function(err){
				if(err) console.log(err);
				else res.send('success');
			});
		}
		else if(action == 'getOrder' && req.isAuthenticated()) {
			Order.findOne({ 'email': email }, function(err, order) {
				if(!order) {
					order = new Order();
					order.email = email;
				}
				res.send(order);
			});
		}
		else if(action == 'finalizeOrder' && req.isAuthenticated()) {
			var street = req.body.street;
			var apartment = req.body.apartment;
			Order.update({ 'email': email }, { 'email': email +'_finalized', 'street': street, 'apartment': apartment, 'date': date, 'status': 'awaiting' }, { upsert: false }, function(err){
				if(err) console.log(err);
				else {
					Order.findOne({ 'email': email +'_finalized', 'date': date, 'status': 'awaiting' }, function(err, order) {
						if(!err) {
							csocket.emit('finalizeOrder', order);
							res.send('success');
						}
					});
				}
			});
		}
		else if(action == 'getOrders' && req.isAuthenticated()) {
			Order.find({ 'status': 'awaiting' }, function(err, order) {
				if(err) console.log(err);
				else res.send(order);
			});
		}
		else if(action == 'archivizeOrder' && req.isAuthenticated()) {
			var email = req.body.email;
			var date = req.body.date;
			Order.update({ 'email': email, 'date': date }, { 'status': 'archived' }, { upsert: false }, function(err){
				if(err) console.log(err);
				else res.send('success');
			});
		}
		else if(action == 'banUser' && req.isAuthenticated()) {
			var client = String(req.body.client);
			if(client != req.user.local.email) {
				User.findOne({ 'local.email': client }, function(err, user) {
					if(!err && user) {
						user.local.acstatus = 'banned';
						user.save(function (err) {
							if(err) console.log(err);
							else {
								Order.find({ 'email': client +'_finalized', 'status': 'awaiting' }, function(err, order) {
									if(!err && order) {
										for(var i = 0; i < order.length; i++) {
											order[i].status = 'declined';
											order[i].save(function (err) {
												if(err) console.log(err);
											});
										}
										res.send('success');
									}
									else {
										if(err) console.log(err);
										else res.send('noorders');
									}
								});
								// Order.update({ 'email': client +'_finalized', 'status': 'awaiting' }, { 'status': 'declined' }, { upsert: false }, function(err){
								// 	if(err) console.log(err);
								// 	else res.send('success');
								// });
							}
						});
					}
					else {
						if(err) console.log(err);
						else res.send('nouser');
					}
				});

				// User.update({ 'local.email': client }, { 'acstatus': 'banned' }, { upsert: false }, function(err){
				// 	if(err) console.log(err);
				// 	else {
				// 		Order.update({ 'email': email }, { 'status': 'declined' }, { upsert: false }, function(err){
				// 			if(err) console.log(err);
				// 			else res.send('success');
				// 		});
				// 	}
				// });
			}
			else res.send('sameuser');
		}
	});

	// login
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/',
		failureRedirect : '/',
		failureFlash : true
	}));

	// logout
	app.get('/logout', isLoggedIn, function(req, res) {
		req.logout();
		res.redirect('/');
	});

	// signup
	app.get('/signup', isLoggedOut, function(req, res) {
		res.render('signup', { title: 'Rejestracja' });
	});
	app.post('/signup', isLoggedOut, passport.authenticate('local-signup', {
		successRedirect : '/',
		failureRedirect : '/signup',
		failureFlash : true
	}));

	// orders
	app.get('/orders', isAdmin, function(req, res) {
		res.render('orders', { title: 'Zamówienia' });
	});

	// checkout
	app.get('/checkout', isLoggedIn, function(req, res) {
		res.render('checkout', { 'title': 'Finalizacja zamówienia', 'subtitle': 'Twoje zamówienie', 'user': req.isAuthenticated() });
	});

	// accountissue
	app.get('/accountissue', isBanned, function(req, res) {
		res.render('accountissue', { 'title': 'Problem z kontem użytkownika', 'user': req.isAuthenticated() });
	});

};

function isLoggedIn(req, res, next) {
	// if user is authenticated in the session, carry on 
	if (req.isAuthenticated())
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/');
}
function isLoggedOut(req, res, next) {
	// if user is authenticated in the session, carry on 
	if (req.isAuthenticated())
		res.redirect('/');
	// if they aren't redirect them to the home page
	return next();
}
function isAdmin(req, res, next) {
	// if user is authenticated in the session, carry on 
	if (req.isAuthenticated() && req.user.local.usertype == 1)
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/');
}
function isNotBanned(req, res, next) {
	// if user is authenticated in the session, carry on 
	if ((req.isAuthenticated() && req.user.local.acstatus != 'banned') || !req.isAuthenticated())
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/accountissue');
}
function isBanned(req, res, next) {
	// if user is authenticated in the session, carry on 
	if (req.isAuthenticated() && req.user.local.acstatus == 'banned')
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/');
}

//var express = require('express');
//var router = express.Router();

/* GET home page. 
router.get('/', function(req, res) {
  res.render('index', { title: 'Pizza online' });
});

module.exports = router;
*/