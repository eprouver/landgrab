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
				});
		}
	}

};

function Board() {
	var self = this;
	var selected = {};
	var activePlayer = false;

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

	var colors = [d3.rgb('white'), d3.rgb('cyan'), d3.rgb('fuchsia')];
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
			x: px? px + (Math.random() * dif) : Math.random(),
			y: py? py + (Math.random() * dif) : Math.random()
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
	self.addShip = function(t, x, y, tx, ty) {
		var ship = {
			x: x || Math.random(),
			y: y || Math.random(),
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

		ship.tx = tx ? tx : ship.x;
		ship.ty = ty ? ty : ship.y;

		shipsData.push(ship);
		//d3.selectAll('.ship').remove();
		// ships = self.main.selectAll('.ship').data(shipsData).enter().append('g').attr('class', function(d) {
		// 	return 'ship ' + (d.selected ? 'selected' : '');
		// });
var d3Ship = document.createElementNS ("http://www.w3.org/2000/svg", "g");
d3Ship.setAttributeNS(null, 'class', 'ship');
self.main[0][0].appendChild(d3Ship);

		d3Ship = d3.select(d3Ship).datum(ship);

		d3Ship
			.each(function(d){
				d.timer = timer(d3.select(this), self.recharge, color(ship.player));
			})
			.append('rect')
			.attr('class', 'clickarea')
			.attr('width', 80)
			.attr('height', 80)
			.attr('x', -40)
			.attr('y', -40)
			.on('click', function(d) {
				d3.event.stopPropagation();

				d.selected = !d.selected;
				if (d.selected) {
					shipsData.filter(function(s) {
						return s.player === d.player;
					}).forEach(function(v) {
						v.selected = false;
					})
					d.selected = true;
					selected[d.player] = d
					activePlayer = d.player;
				} else {
					selected[d.player] = activePlayer = false;
				}

				d3.select(this.parentNode).attr('class', function(d) {
					return 'ship ' + (d.selected ? 'selected' : '');
				});
			});

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
			.attr('class','destroyed')
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

			shipsData.slice(i+1).forEach(function(s){
				if(s.player === d.player){
					return;
				}
				if(Math.sqrt( Math.pow(s.x - d.x, 2) + Math.pow(s.y - d.y, 2)  ) < 0.05){
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


		//Update Planet Ownership
		planetData.forEach(function(planet) {
			var xs, ys;
			for (var i = 0; i < ters.length; i++) {
				var xs = ters[i].__data__.map(function(x) {
					return x[0]
				});
				var ys = ters[i].__data__.map(function(y) {
					return y[1]
				});

				if (pnpoly(ters[i].__data__.length, xs, ys, x(planet.x), y(planet.y))) {
					var appShips = shipsData.map(function(s) {
						return [~~(x(s.x)), ~~(y(s.y))]
					})
					var app = ters[i].__data__.point.map(Math.floor);

					for (var s = 0; s < appShips.length; s++) {
						if (appShips[s][1] === app[1] && appShips[s][0] === app[0]) {
							shipsData[s].links++;
							planet.owner = shipsData[s].player;
							planet.close = shipsData[s];
							break;
						}
					}
					return;

				}
			}

		})

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
		.attr('width', this.dims.width)
		.attr('height', this.dims.height)
		.on('click', function() {
			//Find player
			if (selected[activePlayer]) {
				var coords = d3.mouse(this);
				selected[activePlayer].tx = coords[0] / self.dims.width;
				selected[activePlayer].ty = coords[1] / self.dims.height;
				selected[activePlayer].selected = false;
				selected[activePlayer].timer.start();
				selected[activePlayer] = false;

				d3.select('.selected').classed('selected', false);
			}
		});

}


function start() {
	var board = new Board();
	var ship;
	for (var i = 0; i < 3; i++) {
		ship = board.addShip(i);
		board.addShip(i, ship.x + Math.random() * 0.05, ship.y + Math.random() * 0.05);
	}

	for(var j = 0; j < 10; j++){
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