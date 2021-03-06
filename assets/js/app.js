var timer = function(parent, recharge, color) {

	var width = 100,
		height = 100,
		radius = Math.min(width, height) / 2;

	var holder = parent.append("g")
		.attr('class', 'timer')
		.attr("width", width)
		.attr("height", height)

	var arc = d3.svg.arc()
		.innerRadius(45)
		.outerRadius(50);

	var data = [{
		start: 0.00001,
		end: 1,
		color: color
	}, {
		start: 1,
		end: 0.00001,
		color: 'rgba(0,0,0,0.2)'
	}];

	var pie = d3.layout.pie()
		.value(function(d) {
			return d.start;
		})
		.sort(null);

	var path = holder.datum(data).selectAll("path.timer")
		.data(pie)
		.enter()
		.append("path")
		.classed('hide', true)
		.attr("fill", function(d, i) {
			return d.data.color;
		})
		.attr("d", arc)

	function arcTween(a) {
		var i = d3.interpolate(this._current, a);
		this._current = i(0);
		return function(t) {
			return arc(i(t));
		};
	}
	return {
		holder: holder,
		start: function() {
			parent.classed('noclick', true)
			path.classed('hide', false)
				.each(function(d) {
					this._current = d;
				});
			pie.value(function(d) {
				return d.end;
			});
			path = path.data(pie); // compute the new angles
			path.transition()
				.ease('linear')
				.duration(recharge)
				.attrTween("d", arcTween).each("end", function() {
					parent.classed('noclick', false)
					pie.value(function(d) {
						return d.start;
					});
					path = path.data(pie).attr("d", arc).classed('hide', true);
					parent.data()[0].moving = false;
				});
		}
	}

};

function Board() {
	var self = this;
	var selected = {};
	var activePlayer = false;
	var teams = [];
	var myPlayer = 0;

	this.prodmax = 30;
	this.lifeColors = ['yellow', 'orange', 'red'];
	this.growthSpread = 80;

	this.dims = {
		width: 2000,
		height: 2000
	}
	this.recharge = 20000;

	var x = d3.scale.linear()
		.range([0, this.dims.width]);

	var y = d3.scale.linear()
		.range([0, this.dims.height]);

	var path = '/sounds/';
	var sounds = ['acknowledge.wav', 'explosion.wav', 'get.wav', 'lose.wav', 'order.wav', 'select.wav'].map(function(v){
		return new Howl({ urls: [path + v]});
	});
	sounds[1].volume(0.2);

	var colors = ['#0074D9', '#2ECC40', '#B10DC9', '#FFFFFF', '#3D9970', '#39CCCC', '#85144B', '#001F3F', '#F012BE'].map(function(c){ return d3.rgb(c); });
	var color = function(d) {
		return colors[d];
	};

	self.main = d3.select('#main')
		.attr('width', this.dims.width)
		.attr('height', this.dims.height)
		.append("g")

	hammerTime(self.main, this.dims.width / 2, this.dims.height / 2, 0.5);

	var territoryHolder = self.main.append("g").attr('class', 'noclick');
	var territory = territoryHolder.selectAll("path.territory");
	var planets;
	var planetData = [];
	var shipsData = [];
	var ships, prods;

	//Veronoi
	var buffer = 3000;
	var voronoi = d3.geom.voronoi()
		.clipExtent([
			[-buffer, -buffer],
			[this.dims.width + buffer, this.dims.height + buffer]
		]);

	//Planets
	self.addPlanet = function(px, py, dif) {
		planetData.push({
			x: px ? px + (Math.random() * dif) : Math.random(),
			y: py ? py + (Math.random() * dif) : Math.random()
		});

		planets = self.main.selectAll('.planet').data(planetData).enter()
			.append('circle')
			.attr('class', 'noclick')
			.attr('cx', function(d) {
				return x(d.x)
			})
			.attr('cy', function(d) {
				return y(d.y)
			})
			.attr('r', 3)
	}

	//Ships
	self.addShip = function(t, mx, my, tx, ty) {
		var ship = {
			v: 0,
			a: 0.0000005,
			mv: 0.1,
			life: 1,
			links: 0,
			prod: 0,
			prodSpeed: 0.0001,
			selected: false,
			player: t === undefined ? ~~(Math.random() * 3) : t
		}

		if (teams[t] === undefined && t !== myPlayer
			) {
			teams[t] = {
				color: color(t)
			};
		}

		ship.x = mx !== undefined ? mx : Math.random();
		ship.y = my !== undefined ? my : Math.random();
		ship.tx = tx !== undefined ? tx : ship.x;
		ship.ty = ty !== undefined ? ty : ship.y;

		shipsData.push(ship);
		//d3.selectAll('.ship').remove();
		// ships = self.main.selectAll('.ship').data(shipsData).enter().append('g').attr('class', function(d) {
		// 	return 'ship ' + (d.selected ? 'selected' : '');
		// });
		var d3Ship = document.createElementNS("http://www.w3.org/2000/svg", "g");
		d3Ship.setAttributeNS(null, 'class', 'ship');
		self.main[0][0].appendChild(d3Ship);

		d3Ship = d3.select(d3Ship).datum(ship);

		d3Ship
			.each(function(d) {
				d.timer = timer(d3.select(this), self.recharge, color(ship.player));
			})
			.append('rect')
			.attr('class', 'clickarea')
			.attr('width', 80)
			.attr('height', 80)
			.attr('x', -40)
			.attr('y', -40)

			if(t === myPlayer){
				d3Ship.on('click', function(d) {
					d3.event.stopPropagation();

					d.selected = !d.selected;
					if (d.selected) {
						sounds[5].play();
						shipsData.filter(function(s) {
							return s.player === d.player;
						}).forEach(function(v) {
							v.selected = false;
						})
						d.selected = true;
						selected[d.player] = d
					} else {
						selected[d.player] = false;
					}

					d3.select(this).attr('class', function(d) {
						return 'ship ' + (d.selected ? 'selected' : '');
					});
				});
			}

		d3Ship.append('path').attr('d', "m-15,-2l14,22l14,-22l-16,-22l-12,22z")
			.attr('class', 'visualShip')
			.attr('fill', function(d) {
				return color(d.player);
			})

		ship.d3Ship = d3Ship;
		return ship;

	}

	self.destroyShip = function(ship, d) {
			d3.select(ship.parentNode).select('.visualShip')
				.attr('class', 'destroyed')
				.attr('opacity', 1)
				.attr('stroke', color(d.player))
				.attr('stroke-width', 0)
				.attr('stroke-dasharray', '5 5')
				.attr('stroke-dashoffset', 0)
				.attr('stroke-linejoin', 'round')
				.transition()
				.ease('linear')
				.duration(800)
				.attr('stroke-width', 10000)
				.attr('stroke-dasharray', '1 30')
				.attr('stroke-dashoffset', 0).each('end', function() {
					d3.select(ship.parentNode).remove();
				})
			shipsData.splice(shipsData.indexOf(d), 1);
			sounds[1].play();
		}
		//Updates
	var lifeColor = d3.scale.linear()
		.domain([0, 1])
		.range(self.lifeColors);

	var vertices = [],
		t, ters;
	var linkData = [];
	var links = self.main.selectAll('.link').data(linkData).enter()
		.append('line')
		.attr('class', 'link')

	function move(s, e, v, dt) {
		return s + ((e - s) * (v * dt / 1000));
	}

	var lastE = 0
	var rounddif = 0.001;

			function rnd(mean, stdev) {
			function rnd_snd() {
				return (Math.random() * 2 - 1) + (Math.random() * 2 - 1) + (Math.random() * 2 - 1);
			}

			return Math.round(rnd_snd() * stdev + mean);
		}

	function polygon(d) {
		return "M" + d.join("L") + "Z";
	}

	function pnpoly(nvert, vertx, verty, testx, testy) {
		var i, j, c = 0;
		for (i = 0, j = nvert - 1; i < nvert; j = i++) {
			if (((verty[i] > testy) != (verty[j] > testy)) && (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) c = !c;
		}
		return c;
	}

	var iteration = 0;

	this.tick = function(e) {
		var dt = e - lastE;

		//Update Ship Data
		shipsData.forEach(function(d, i) {

			shipsData.slice(i + 1).forEach(function(s) {
				if (s.player === d.player) {
					return;
				}
				if (Math.sqrt(Math.pow(s.x - d.x, 2) + Math.pow(s.y - d.y, 2)) < 0.05) {
					self.destroyShip(d.d3Ship.select('rect')[0][0], d);
					self.destroyShip(s.d3Ship.select('rect')[0][0], s);

				}
			})

			if (d.tx && d.ty) {
				if (Math.abs(d.x - d.tx) > rounddif || Math.abs(d.y - d.ty) > rounddif) {
					if (d.v < d.mv) {
						d.v += d.a * e;
					}
					d.x = move(d.x, d.tx, d.v, dt);
					d.y = move(d.y, d.ty, d.v, dt);
				} else {
					d.v = 0;
				}
			}

			if (d.links) {
				d.prod += (d.links || 0) * d.prodSpeed * dt;
			} else {
				d.prod = (d.prod) > 0 ? d.prod - (d.prodSpeed * dt) : 0;
			}

			if (d.prod > self.prodmax) {
				d.prod = 0;
				self.addShip(d.player, d.x + (Math.random() - 0.5) / 10, d.y + (Math.random() - 0.5) / 10);
			}

			d.links = 0;
		});


		//if (iteration % 100 === 0) {
		//Draw territories
		vertices = shipsData.map(function(v) {
			return {
				color: color(v.player),
				point: [x(v.x), y(v.y)]
			}
		});

		territoryHolder.selectAll("*").remove();
		t = territory.data(voronoi(vertices.map(function(v) {
			return v.point
		}))).enter();
		ters = t[0];

		t.append("path")
			.attr('class', 'territory')
			.attr("fill", function(d, i) {
				return vertices[i].color.darker(5);
			})
			.attr("stroke", function(d, i) {
				return vertices[i].color;
			})
			.attr("d", polygon);
		//}

		var appShips = shipsData.map(function(s) {
			return [~~(x(s.x)), ~~(y(s.y))]
		})

		//Update Planet Ownership
		planetData.forEach(function(planet) {
			var xs, ys, score = [];
			for (var i = 0; i < ters.length; i++) {
				var xs = ters[i].__data__.map(function(x) {
					return x[0]
				});
				var ys = ters[i].__data__.map(function(y) {
					return y[1]
				});

				if (pnpoly(ters[i].__data__.length, xs, ys, x(planet.x), y(planet.y))) {

					var app = ters[i].__data__.point.map(Math.floor);

					for (var s = 0; s < appShips.length; s++) {
						if (appShips[s][1] === app[1] && appShips[s][0] === app[0]) {
							
							if(planet.owner != shipsData[s].player){
								if(shipsData[s].player === myPlayer && planet.owner !== myPlayer){
									sounds[2].play();
								}else if(planet.owner === myPlayer && shipsData[s] !== myPlayer){
									sounds[3].play();
								}								
							}

							shipsData[s].links++;
							planet.owner = shipsData[s].player;
							planet.close = shipsData[s];


							break;
						}
					}
					return;

				}
			}
		});


		var currentScore = 0,
			points, ships, others;

		//Stupid AI
		for (var team in teams) {
			team = parseInt(team);

			ships = shipsData.filter(function(s) {
				return (s.player == team) && !s.moving
			});
			if (ships.length === 0) continue;

			others = shipsData.filter(function(s) {
				return (s.player != team) || s.moving
			});
			vertices = ships.map(function(v, oPoint) {
				if (Math.random() > 0.2 || v.links === 0) {
					oPoint = [rnd(v.x, 0.1), rnd(v.y, 0.1)].map(function(v) {
						return Math.min(Math.max(v, 0), 1);
					});
				} else {
					oPoint = [Math.random(), Math.random()];
				 }

				return {
					point: [x(oPoint[0]), y(oPoint[1])],
					oPoint: oPoint
				}
			}).concat(others.map(function(v) {
				return {
					point: [x(v.x), y(v.y)]
				}
			}));


			t = territory.data(voronoi(vertices.map(function(v) {
				return v.point
			}))).enter();
			ters = t[0].filter(function(v) {
				return v.__data__
			});

			if (ters.length == shipsData.length) {
				points = 0;
				currentScore = shipsData.filter(function(v) {
					return v.player == team
				}).reduce(function(i, a) {
					return i + a.links
				}, 0);

				planetData.forEach(function(planet) {
					for (var i = 0; i < ters.length; i++) {
						var xs = ters[i].__data__.map(function(x) {
							return x[0]
						});
						var ys = ters[i].__data__.map(function(y) {
							return y[1]
						});

						if (pnpoly(ters[i].__data__.length, xs, ys, x(planet.x), y(planet.y))) {
							if(shipsData[i].player === team){
								points++;
							}
							
							return;

						}
					}
				});

				if (points > currentScore) {
					ships.forEach(function(v, i) {
						v.tx = vertices[i].oPoint[0];
						v.ty = vertices[i].oPoint[1];
						v.timer.start();
						v.moving = true;
						sounds[4].play();
					});
				}
			}


		}

		//Draw Ships
		ships = self.main.selectAll('.ship')
		ships.attr('transform', function(d) {
				return 'translate(' + x(d.x) + ',' + y(d.y) + ')'
			})
			.attr('stroke-width', function(d) {
				return d.links;
			})
			.attr('stroke', function(d) {
				return lifeColor(((d.prod / (self.prodmax / self.lifeColors.length)) % self.lifeColors.length));
			})


		lastE = e;

		//Redraw Planets
		planets.attr('fill', function(d) {
			return color(d.owner);
		});

		//Find Links
		linkData = [];
		planetData.forEach(function(l) {
			if (!l.close) return;
			linkData.push({
				x1: l.x,
				y1: l.y,
				x2: l.close.x,
				y2: l.close.y,
				owner: l.owner
			});
		});

		//Redraw Links
		d3.selectAll('line.link').remove();
		links.data(linkData).enter().append('line')
			.attr('class', 'link')
			.attr('x1', function(d) {
				return x(d.x1);
			})
			.attr('x2', function(d) {
				return x(d.x2);
			})
			.attr('y1', function(d) {
				return y(d.y1);
			})
			.attr('y2', function(d) {
				return y(d.y2);
			})
			.attr('stroke', function(d) {
				return color(d.owner);
			})

		iteration++;
		reqAnimationFrame(self.tick);
	}

	self.main.append('rect')
		.attr('class', 'outterBorder')
		.attr('width', this.dims.width * 1.1)
		.attr('height', this.dims.height * 1.1)
		.on('click', function() {
			//Find player
			if (selected[myPlayer]) {
				var coords = d3.mouse(this);
				selected[myPlayer].tx = coords[0] / self.dims.width;
				selected[myPlayer].ty = coords[1] / self.dims.height;
				selected[myPlayer].selected = false;
				selected[myPlayer].timer.start();
				selected[myPlayer].moving = true;
				selected[myPlayer] = false;

				d3.select('.selected').classed('selected', false);
			}
		});
}


function start() {
	var board = new Board();
	var ship;
	for (var i = 0; i < 9; i++) {
		ship = board.addShip(i, 0.15 + (i % 3) * 0.4,0.25 + ~~(((i+1) / 10) * 3)/ 3);
		board.addShip(i, ship.x + 0.015, ship.y + 0.015);
	}

	for (var j = 0; j < 10; j++) {
		var x = Math.random();
		var y = Math.random();
		for (var i = 0; i < 5; i++) {
			board.addPlanet(x, y, 0.09);
		}
	}


	var gui = new dat.GUI();
	gui.add(board, 'addPlanet');
	gui.add(board, 'growthSpread', 5, 500);

	reqAnimationFrame(board.tick);
}

window.addEventListener('load', start);