/**
* User.js
*
* @description :: This is the model of the users.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
  	name: {
  		type: 'string'
  	},
  	email: {
  		type: 'string'
  	},
  	password: {
  		type: 'string'
  	}
  }
};

