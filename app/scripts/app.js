'use strict';

/**
 * @ngdoc overview
 * @name landgrabApp
 * @description
 * # landgrabApp
 *
 * Main module of the application.
 */
angular
  .module('landgrabApp', [
    'ngAnimate',
    'ngRoute'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });



Array.prototype.forEach = function (fun) {
  var i = 0,
    len = this.length;
  for (; i < len; i++) {
    fun(this[i], i);
  }
};

Array.prototype.map = function (fun) {
  var results = new Array(),
    i;
  for (i = 0; i < this.length; i += 1) {
    results.push(fun(this[i], i));
  }
  return results;
};


Array.prototype.filter = function (filterFun) {
  var results = new Array(),
    i;
  for (i = 0; i < this.length; i += 1) {
    if (filterFun(this[i], i)) {
      results.push(this[i]);
    }
  }
  return results;
}