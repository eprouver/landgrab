'use strict';

/**
 * @ngdoc function
 * @name landgrabApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the landgrabApp
 */
angular.module('landgrabApp')
	.controller('MainCtrl', function($scope, $timeout) {

		var myScroll = new IScroll('#iscrollHolder', {
			scrollY: true,
			scrollX: true,
			freeScroll: true
		});

		$scope.$on('$viewContentLoaded', function() {
			$timeout(function() {
				myScroll.refresh();
			}, 100);
		})

		$scope.bigArray = d3.range(0, 300);

		function Board() {
			var self = this;

			this.prodmax = 30;
			this.lifeColors = ['yellow', 'orange', 'red'];
			this.growthSpread = 13;

			this.dims = {
				width: 1000,
				height: 1000
			}

			var x = d3.scale.linear()
				.range([0, this.dims.width]);

			var y = d3.scale.linear()
				.range([0, this.dims.height]);

			var color = function(d) {
				return ['white', 'cyan', 'fuchsia'][d];
			};

			//Board
			var selected = {};
			var activePlayer = false;
			var main = d3.select('#main')
				.attr('width', this.dims.width)
				.attr('height', this.dims.height)
				.on('click', function() {
					//Find player
					if (selected[activePlayer]) {
						var coords = d3.mouse(this);
						selected[activePlayer].tx = coords[0] / self.dims.width;
						selected[activePlayer].ty = coords[1] / self.dims.height;
						selected[activePlayer].selected = false;
						selected[activePlayer] = false;
					}
				});

			//Veronoi
			var territoryHolder = main.append("g").attr('class', 'noclick');
			var territory = territoryHolder.selectAll("path.territory");
			var voronoi = d3.geom.voronoi()
				.clipExtent([
					[0, 0],
					[this.dims.width, this.dims.height]
				]);

			//Planets
			var planets;
			this.addPlanet = function() {
				planetData.push({
					x: Math.random(),
					y: Math.random()
				});

				planets = main.selectAll('.planet').data(planetData).enter()
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
			var planetData = [];

			//Ships
			var shipsData = [];
			var ships, prods;

			this.addShip = function(t, x, y, tx, ty) {
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

				d3.selectAll('.ship').remove();

				ships = main.selectAll('.ship').data(shipsData).enter().append('g');

				ships.append('circle').attr('r', 15)

				//.attr('d', "m-15,-2l14,22l14,-22l-16,-22l-12,22z");

				ships.attr('class', function(d) {
						return 'ship ' + (d.selected ? 'selected' : '');
					})
					.attr('r', 10)
					.attr('fill', function(d) {
						return color(d.player);
					})
					.on('dblclick', function(d) {
						self.destroyShip(this, d);
					})
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

						d3.select(this).attr('class', function(d) {
							return 'ship ' + (d.selected ? 'selected' : '');
						});
					});

				prods = ships.append('circle')
					.attr('cx', 0)
					.attr('cy', 0)
					.attr('r', function(d) {
						return (d.prod * self.growthSpread) || 0
					})
					.attr('class', 'prod')

			}

			this.destroyShip = function(ship, d) {
				d3.select(ship).remove();
				shipsData.splice(shipsData.indexOf(d), 1);
			}

			//Updates
			var lifeColor = d3.scale.linear()
				.domain([0, 1])
				.range(self.lifeColors);

			var vertices = [],
				t, ters;
			var linkData = [];
			var links = main.selectAll('.link').data(linkData).enter()
				.append('line')
				.attr('class', 'link')

			var movers = [].concat(shipsData);

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
				shipsData.forEach(function(d) {
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
							return vertices[i].color;
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
				ships.attr('transform', function(d) {
						return 'translate(' + x(d.x) + ',' + y(d.y) + ')'
					})
					.attr('class', function(d) {
						return 'ship ' + (d.selected ? 'selected' : '');
					}).attr('fill', function(d) {
						return color(d.player);
					})
					.attr('stroke-width', function(d) {
						return d.links;
					})
					.attr('stroke', function(d) {
						return lifeColor(((d.prod / (self.prodmax / self.lifeColors.length)) % self.lifeColors.length));
					})

				//Production Circles
				prods.attr('r', function(d) {
						if (!d.prod || d.prod < 0 || d.links == 0) {
							return 0;
						}
						return (((self.lifeColors.length * d.prod) / (self.prodmax / self.lifeColors.length)) % self.lifeColors.length) * self.growthSpread;
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
				window.requestAnimationFrame(self.tick);
			}

		}


		/*
		var force = d3.layout.force()
		    .nodes(movers)
		    .size([this.dims.width, this.dims.height])
		    .on("tick", tick)
		    .start(); */

		var board = new Board();

		for (var i = 0; i < 3; i++) {
			board.addShip(i);
		}

		for (var i = 0; i < 15; i++) {
			board.addPlanet();
		}


		window.requestAnimationFrame(board.tick);

	});