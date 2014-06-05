/*
function checkCookie(cookiename) {
	if (document.cookie.indexOf(cookiename) >= 0) return true;
	else return false;
}

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+d.toGMTString();
	if(checkCookie(cname)) document.cookie = cname + '=' + cname"username=John Smith; expires=Thu, 18 Dec 2013 12:00:00 GMT; path=/";
	else document.cookie = cname + "=" + cvalue + "; " + expires;
}
*/

function resetOrders() {
	var orderarray = new Array();
	postdata = { action: 'midOrder', 'order': orderarray.toString(), 'bill': '' };
	// reset zamówień
	$.ajax({
	   url: '/',
	   type: 'POST',
	   contentType: 'application/json',
	   data: JSON.stringify(postdata)
	});
}

function countBill(orderarray, pizzaslist) {
	var result = 0, pizzaamo, pizzaname, pizzasize, temparray, tempindex, tempprice;
	for(var i = 0; i < orderarray.length; i += 2) {
		temparray = orderarray[i+1].split('+');
		pizzaamo = parseInt(orderarray[i]);
		pizzaname = temparray[0];
		pizzasize = temparray[1];

		temparray = pizzaslist.names.split(',');
		tempindex = temparray.indexOf(pizzaname);
		temparray = pizzaslist.prices.split(',');
		tempprice = temparray[tempindex];
		temparray = pizzaslist.sizes.split(',');
		tempindex = temparray.indexOf(pizzasize);
		temparray = tempprice.split('+');
		result = result + (parseInt(temparray[tempindex]) * pizzaamo);
	}
	return result;
}

var pizzaslist = {
	names: 'Margherita,Capricciosa,Hawai,Diabolo,Vesuvio,Mafioso,Trzy sery,Pizza Szefa',
	sizes: '30,40,50',
	ingredients: 'Sos+Ser+Oregano,Pieczarki+Szynka+Ser+Sos,Ananas+Brzoskwinia+Ser+Sos,Jalapeno+Oliwki+Szynka+Ser+Sos,Salami+Szynka+Ser+Sos,Pieczarki+Bekon+Ser+Sos,Mozzarella+Oliwki+Ser pleśniak+Sos+Ser gouda,Pieczarki+Salami+Papryka peperoni+Kiełbasa+Bekon+Podwójny ser+Cebula+Sos',
	prices: '15+20+25,16+21+26,16+21+26,17+22+27,16+21+26,16+21+26,17+22+27,20+25+30'
};

var site = window.location.pathname;

$(document).ready(function() {

	var socket = io.connect('http://localhost:3000');

	$('div[data-blur="true"]').blurjs({
        source: 'body',
        radius: 40,
        overlay: 'rgba(255, 255, 255, 0.8)'
    });

	/* ------------------------------------------------------------------------------------------------ */

	var useremail = $('div.useremail').html();

	if(site == '/') {
		// znajdź aktualne zamówienie użytkownika jeżeli jest zalogowany
		if(useremail != undefined) {
			var postdata = { 'action': 'getOrder' };
			$.ajax({
			   url: '/',
			   type: 'POST',
			   contentType: 'application/json',
			   data: JSON.stringify(postdata),
			   success: function(result) {
			    	var orderarray, pizzaid = 0, pizzasize, pizzaname, pizzaamount = 1, orderbill;
			    	if(result.order != undefined && result.order != '') {
						orderarray = result.order.split(',');
						orderbill = countBill(orderarray, pizzaslist);
						var cparray;
						for(pizzaid = 0; pizzaid < orderarray.length; pizzaid++) {
							if(pizzaid % 2 == 0) pizzaamount = orderarray[pizzaid];
							else {
								cparray = orderarray[pizzaid].split('+');
								pizzaname = cparray[0];
								pizzasize = cparray[1];
								$('div.divbox[data-name="orderlist"]').append(
									'<div class="pizzalistbox" data-type="sub" data-pizzaid="'+ pizzaid +'">'+
										'<div class="pizzaname" data-type="sub" data-pizzaid="'+ pizzaid +'">'+ pizzaname +'</div>'+
										'<div class="pizzasize" data-pizzaid="'+ pizzaid +'">'+ pizzasize +' cm</div>'+
										'<div class="pizzaamo" data-pizzaid="'+ pizzaid +'">x '+ pizzaamount +'</div>'+
										'<div class="pizzaremove" data-pizzaid="'+ pizzaid +'">usuń</div>'+
									'</div>'
								);
							}
						}
						$('div.orderbill').html('Suma: '+ orderbill +' zł');
						$('a[data-name="checkoutlink"]').show();
						pizzaid--;
					}
					else { orderarray = []; $('div.orderbill').html('Suma: 0 zł'); }

					// naciśnięcie na przycisk rozmiaru pizzy - dodanie pizzy do zamówienia
					$('div.pizzasizeinp').on('click', function() {
						pizzasize = $(this).attr('data-size');
						pizzaname = $(this).attr('data-pn');
						var tempid = orderarray.indexOf(pizzaname +'+'+ pizzasize);
						if(tempid == -1) {
							if(orderarray.length > 0) pizzaid = orderarray.length + 1;
							else {
								pizzaid = 1;
								$('a[data-name="checkoutlink"]').show();
							}
							orderarray.push(1, pizzaname + '+' + pizzasize);
							pizzaamount = 1;
						}
						else {
							pizzaamount = parseInt(orderarray[tempid-1]) + 1;
							orderarray[tempid-1] = pizzaamount;
							pizzaid = tempid;
						}
						orderbill = countBill(orderarray, pizzaslist);
						postdata = { action: 'midOrder', 'order': orderarray.toString(), 'bill': orderbill };
						// update zamówienia w bazie danych
						$.ajax({
						   url: '/',
						   type: 'POST',
						   contentType: 'application/json',
						   data: JSON.stringify(postdata),
						   success: function() {
						   	if(tempid == -1) {
							    	var newitem = $(
										'<div class="pizzalistbox" data-type="sub" data-pizzaid="'+ pizzaid +'">'+
											'<div class="pizzaname" data-type="sub" data-pizzaid="'+ pizzaid +'">'+ pizzaname +'</div>'+
											'<div class="pizzasize" data-pizzaid="'+ pizzaid +'">'+ pizzasize +' cm</div>'+
											'<div class="pizzaamo" data-pizzaid="'+ pizzaid +'">x '+ pizzaamount +'</div>'+
											'<div class="pizzaremove" data-pizzaid="'+ pizzaid +'">usuń</div>'+
										'</div>'
									).hide();
									$('div.divbox[data-name="orderlist"]').append(newitem);
									newitem.show(300);
								}
								else $('.pizzaamo[data-pizzaid="'+ pizzaid +'"]').html('x '+ pizzaamount);
								$('div.orderbill').html('Suma: '+ orderbill +' zł');
						   }
						});
					});

					// naciśnięcie na przycisk usunięcia wpisu z zamówienia
					$(document).on('click', 'div.pizzaremove', function() {
						pizzaid = parseInt($(this).attr('data-pizzaid'));
						var cparray = orderarray[pizzaid].split('+');
						pizzaname = cparray[0];
						pizzasize = cparray[1];
						pizzaamount = parseInt(orderarray[pizzaid-1]);
						if(pizzaamount == 1) {
							orderarray.splice(pizzaid-1, 2);
							if(orderarray.length == 0) $('a[data-name="checkoutlink"]').hide();
						}
						else orderarray[pizzaid-1] = pizzaamount-1;
						orderbill = countBill(orderarray, pizzaslist);
						postdata = { action: 'midOrder', 'order': orderarray.toString(), 'bill': orderbill };
						// update zamówienia w bazie danych - zmiana ilości
						$.ajax({
						   url: '/',
						   type: 'POST',
						   contentType: 'application/json',
						   data: JSON.stringify(postdata),
						   success: function() {
						   	if(pizzaamount == 1) {
									$('.pizzaremove[data-pizzaid="'+ pizzaid +'"]').parent().fadeOut(300, function(){ $(this).remove(); });
									var orderlistcount = orderarray.length / 2;
									var newid, currentid = 1;
									for(var i = 1; i <= orderlistcount; i++) {
										currentid += 2;
										if(currentid > pizzaid) {
											newid = currentid - 2;
											$('div.pizzalistbox[data-pizzaid="'+ currentid +'"]').attr('data-pizzaid', newid);
											$('div.pizzaname[data-pizzaid="'+ currentid +'"]').attr('data-pizzaid', newid);
											$('div.pizzasize[data-pizzaid="'+ currentid +'"]').attr('data-pizzaid', newid);
											$('div.pizzaamo[data-pizzaid="'+ currentid +'"]').attr('data-pizzaid', newid);
											$('div.pizzaremove[data-pizzaid="'+ currentid +'"]').attr('data-pizzaid', newid);
										}
									}
						   	}
								else $('.pizzaamo[data-pizzaid="'+ pizzaid +'"]').html('x '+ (pizzaamount - 1));
								$('div.orderbill').html('Suma: '+ orderbill +' zł');
						   },
						   error: function(){ alert('error'); }
						});
					});
			   },
			   error: function() { $('div.sider_switch').append('<div class="divbox">Wystąpił błąd podczas wczytywania zamówienia.</div>'); }
			});
		}
	}
	else if(site == '/checkout') {
		var postdata = { 'action': 'getOrder' };
		$.ajax({
		   url: '/',
		   type: 'POST',
		   contentType: 'application/json',
		   data: JSON.stringify(postdata),
		   success: function(result) {
		    	if(result.order != undefined && result.order != '') {
		    		var orderarray, pizzasize, pizzaname, pizzaamount = 1, cparray;
					orderarray = result.order.split(',');
					for(var i = 0; i < orderarray.length; i++) {
						if(i % 2 == 0) {
							pizzaamount = orderarray[i];
						}
						else {
							cparray = orderarray[i].split('+');
							pizzaname = cparray[0];
							pizzasize = cparray[1];
							$('div.divbox[data-name="orderlist"]').append(
								'<div class="pizzalistbox" data-type="sub">'+
									'<div class="pizzaname" data-type="sub2">'+ pizzaname +'</div>'+
									'<div class="pizzasize">'+ pizzasize +' cm</div>'+
									'<div class="pizzaamo">x '+ pizzaamount +'</div>'+
								'</div>'
							);
						}
					}
					orderbill = countBill(orderarray, pizzaslist);
					$('div.orderbill').html('Suma: '+ orderbill +' zł');
				}
				else window.location.href = '/';
			}
		});
		$('input[type="submit"]').on('click', function(){
			var street = $('input[name="street"]').val();
			var apartment = $('input[name="apartment"]').val();
			if(street.length > 3 && apartment.length >= 1) {
				var postdata = { action: 'finalizeOrder', 'street': street, 'apartment': apartment };
				$.ajax({
				   url: '/',
				   type: 'POST',
				   contentType: 'application/json',
				   data: JSON.stringify(postdata),
				   success: function() {
				   	$('.sider').hide();
				   	$('.pagetitle').html('Status zamówienia');
				   	$('.divbox[data-name="checkoutbox"]').hide(300, function(){
				   		$(this).html('Zamówienie zostało wysłane.').fadeIn(300);
				   	});
				   }
				});
			}
			else alert('Wypełnij pola formularza.');
		});
	}
	else if(site == '/orders') {
		$('.sider').hide();
		var postdata = { 'action': 'getOrders' };
		$.ajax({
		   url: '/',
		   type: 'POST',
		   contentType: 'application/json',
		   data: JSON.stringify(postdata),
		   success: function(result) {
		   	if(result.length > 0) {
		   		var orderObj, orderarray, temparray, pizzaamo, pizzaname, pizzasize, pizzaresult, year, month, day, hour, minute;
		   		for(var i = 0; i < result.length; i++) {
		   			orderObj = result[i];
		   			orderarray = orderObj.order.split(',');
		   			pizzaresult = '';
		   			for(var y = 0; y < orderarray.length; y+=2) {
		   				temparray = orderarray[y+1].split('+');
		   				pizzaname = temparray[0];
		   				pizzasize = temparray[1];
		   				pizzaamo = orderarray[y];
		   				pizzaresult += '<div class="pizzasupbox"><div class="supname">'+ pizzaname +'</div><div class="supamount">x '+ pizzaamo +'</div><div class="supsize">'+ pizzasize +' cm</div></div>';
		   			}
		   			temparray = orderObj.date.split('T');
		   			temparray = temparray[0].split('-');
		   			year = temparray[0];
		   			month = temparray[1];
		   			day = temparray[2];
		   			temparray = orderObj.date.split('T');
		   			temparray = temparray[1].split(':');
		   			hour = temparray[0];
		   			minute = temparray[1];
		   			$('.divbox[data-name="orderslist"]').append(
		   				'<div class="pizzalistbox" data-type="sup">'+
		   					'<div class="odleftbox" style="width: 40%;">'+
			   					'<div class="odemail" style="width: 100%;">klient: '+ orderObj.email.replace('_finalized', '') +'</div>'+
			   					'<div class="oddate" style="width: 100%;">data: '+ day +'.'+ month +'.'+ year +' '+ hour +':'+ minute +'</div>'+
			   					'<div class="odstreet" style="width: 100%;">adres: '+ orderObj.street +' '+ orderObj.apartment +'</div>'+
			   					'<div class="odbill" style="width: 100%;">kwota: '+ orderObj.bill +' zł</div>'+
			   				'</div>'+
		   					'<div class="odpizzaslist" style="width: 50%;">'+ pizzaresult +'</div>'+
		   					'<input type="submit" data-email="'+ orderObj.email +'" data-date="'+ orderObj.date +'" value="archiwizuj" style="margin-top: 21px;" />'+
		   				'</div>'
		   			);
		   		}
		   	}
			}
		});

		$(document).on('click', 'input[type="submit"][value="archiwizuj"]', function() {
			var cuele = $(this);
			var email = cuele.attr('data-email');
			var date = cuele.attr('data-date');
			var postdata = { action: 'archivizeOrder', 'email': email, 'date': date };
			$.ajax({
			   url: '/',
			   type: 'POST',
			   contentType: 'application/json',
			   data: JSON.stringify(postdata),
			   success: function() {
			   	cuele.parent().hide(300, function(){ $(this).remove(); });
			   }
			});
		});

		socket.on('order', function (data) {
			var orderarray = data.order.split(',');
			var pizzaresult = '<div class="pizzasupbox">';
			var temparray, pizzaname, pizzasize, pizzaamo, year, month, day, hour, minute;
			for(var y = 0; y < orderarray.length; y+=2) {
				temparray = orderarray[y+1].split('+');
				pizzaname = temparray[0];
				pizzasize = temparray[1];
				pizzaamo = orderarray[y];
				pizzaresult += '<div class="supname">'+ pizzaname +'</div><div class="supamount">x '+ pizzaamo +'</div><div class="supsize">'+ pizzasize +' cm</div>';
			}
			pizzaresult += '</div>';
			temparray = data.date.split('T');
			temparray = temparray[0].split('-');
			year = temparray[0];
			month = temparray[1];
			day = temparray[2];
			temparray = data.date.split('T');
			temparray = temparray[1].split(':');
			hour = temparray[0];
			minute = temparray[1];
			$('.divbox[data-name="orderslist"]').append(
				'<div class="pizzalistbox" data-type="sup">'+
					'<div class="odleftbox" style="width: 40%;">'+
   					'<div class="odemail" style="width: 100%;">klient: '+ data.email.replace('_finalized', '') +'</div>'+
   					'<div class="oddate" style="width: 100%;">data: '+ day +'.'+ month +'.'+ year +' '+ hour +':'+ minute +'</div>'+
   					'<div class="odstreet" style="width: 100%;">adres: '+ data.street +' '+ data.apartment +'</div>'+
   					'<div class="odbill" style="width: 100%;">kwota: '+ data.bill +' zł</div>'+
   				'</div>'+
					'<div class="odpizzaslist" style="width: 50%;">'+ pizzaresult +'</div>'+
					'<input type="submit" data-email="'+ data.email +'" data-date="'+ data.date +'" value="archiwizuj" style="margin-top: 21px;" />'+
				'</div>'
			);
			//$('.divbox[data-name="orderslist"]').append('<div class="divbox">'+ data.order +'</div>');
   	});
	}
	else if(site == '/signup') {
		$('.sider').hide();
	}
});