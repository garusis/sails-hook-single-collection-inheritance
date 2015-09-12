/**
 * Created by Marcos J. Alvarez on 26/08/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.1
 */
var usageError = require('../node_modules/sails/node_modules/waterline/lib/waterline/utils/helpers');
var utils = require('../node_modules/sails/node_modules/waterline/lib/waterline/utils/helpers');
var normalize = require('../node_modules/sails/node_modules/waterline/lib/waterline/utils/normalize');
var sorter = require('../node_modules/sails/node_modules/waterline/lib/waterline/utils/sorter');
var Deferred = require('../node_modules/sails/node_modules/waterline/lib/waterline/query/deferred');
var Joins = require('../node_modules/sails/node_modules/waterline/lib/waterline/query/finders/joins');
var Operations = require('../node_modules/sails/node_modules/waterline/lib/waterline/query/finders/operations');
var Integrator = require('../node_modules/sails/node_modules/waterline/lib/waterline/query/integrator');
var waterlineCriteria = require('../node_modules/sails/node_modules/waterline/node_modules/waterline-criteria');
var _ = require('lodash');
var async = require('async');
var hasOwnProperty = utils.object.hasOwnProperty;

module.exports = function (sails) {
    var patches = {};
    patches.patchFindOne = function (dataUtilModel, model) {
        var oldFindOne = model.findOne;
        model.findOne = function (criteria, cb) {
            var self = this;

            if (typeof criteria === 'function') {
                cb = criteria;
                criteria = null;
            }

            // If the criteria is an array of objects, wrap it in an "or"
            if (Array.isArray(criteria) && _.all(criteria, function (crit) {
                    return _.isObject(crit);
                })) {
                criteria = {or: criteria};
            }

            // Check if criteria is an integer or string and normalize criteria
            // to object, using the specified primary key field.
            criteria = normalize.expandPK(self, criteria);

            // Normalize criteria
            criteria = normalize.criteria(criteria);

            // Return Deferred or pass to adapter
            if (typeof cb !== 'function') {
                return new Deferred(this, this.findOne, criteria);
            }

            // Transform Search Criteria
            criteria = self._transformer.serialize(criteria);

            // serialize populated object
            if (criteria.joins) {
                criteria.joins.forEach(function(join) {
                    if (join.criteria && join.criteria.where) {
                        var joinCollection = self.waterline.collections[join.child];
                        join.criteria.where = joinCollection._transformer.serialize(join.criteria.where);
                    }
                });
            }

            // If there was something defined in the criteria that would return no results, don't even
            // run the query and just return an empty result set.
            if (criteria === false || criteria.where === null) {
                // Build Default Error Message
                var err = '.findOne() requires a criteria. If you want the first record try .find().limit(1)';
                return cb(err);
            }

            criteria.where[sails.config['single-collection-inheritance']] = model.globalId;
            return oldFindOne.call(this, criteria, cb);
        };
    };

    patches.patchFind = function (dataUtilModel, model) {
        var oldFind = model.find;
        model.find = function (criteria, options, cb) {
            var self = this;

            var usage = utils.capitalize(this.identity) + '.find([criteria],[options]).exec(callback|switchback)';

            if (typeof criteria === 'function') {
                cb = criteria;
                criteria = null;
                options = null;
            }

            if (typeof options === 'function') {
                cb = options;
                options = null;
            }

            // If the criteria is an array of objects, wrap it in an "or"
            if (Array.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
                criteria = {or: criteria};
            }

            // Check if criteria is an integer or string and normalize criteria
            // to object, using the specified primary key field.
            criteria = normalize.expandPK(self, criteria);

            // Normalize criteria
            criteria = normalize.criteria(criteria);

            // Validate Arguments
            if (typeof criteria === 'function' || typeof options === 'function') {
                return usageError('Invalid options specified!', usage, cb);
            }

            // Return Deferred or pass to adapter
            if (typeof cb !== 'function') {
                return new Deferred(this, this.find, criteria, options);
            }

            // If there was something defined in the criteria that would return no results, don't even
            // run the query and just return an empty result set.
            if (criteria === false) {
                return cb(null, []);
            }

            // Fold in options
            if (options === Object(options) && criteria === Object(criteria)) {
                criteria = _.extend({}, criteria, options);
            }

            // Transform Search Criteria
            if (!self._transformer) {
                throw new Error('Waterline can not access transformer-- maybe the context of the method is being overridden?');
            }

            criteria = self._transformer.serialize(criteria);

            // serialize populated object
            if (criteria.joins) {
                criteria.joins.forEach(function(join) {
                    if (join.criteria && join.criteria.where) {
                        var joinCollection = self.waterline.collections[join.child];
                        join.criteria.where = joinCollection._transformer.serialize(join.criteria.where);
                    }
                });
            }

            criteria.where[sails.config['single-collection-inheritance']] = model.globalId;
            return oldFind.call(this, criteria, options, cb);
        };
    };

    patches.patchCount = function (dataUtilModel, model) {
        var oldCount = model.count;
        model.count = function (criteria, options, cb) {
            var usage = utils.capitalize(this.identity) + '.count([criteria],[options],callback)';

            if (typeof criteria === 'function') {
                cb = criteria;
                criteria = null;
                options = null;
            }

            if (typeof options === 'function') {
                cb = options;
                options = null;
            }

            // Return Deferred or pass to adapter
            if (typeof cb !== 'function') {
                return new Deferred(this, this.count, criteria);
            }

            // Normalize criteria and fold in options
            criteria = normalize.criteria(criteria);

            // If there was something defined in the criteria that would return no results, don't even
            // run the query and just return 0
            if (criteria === false) {
                return cb(null, 0);
            }

            if (_.isObject(options) && _.isObject(criteria)) {
                criteria = _.extend({}, criteria, options);
            }

            if (_.isFunction(criteria) || _.isFunction(options)) {
                return usageError('Invalid options specified!', usage, cb);
            }

            // Transform Search Criteria
            criteria = this._transformer.serialize(criteria);
            criteria.where[sails.config['single-collection-inheritance']] = model.globalId;
            return oldCount.call(this, criteria, options, cb);
        }
    };

    patches.patchIsA = function (dataUtilModel, model) {
        if (arguments.length == 1) {
            model = dataUtilModel;
            dataUtilModel = null;
        }
        if (dataUtilModel) {
            model.prototype.isA = function (otModel) {
                if (!dataUtilModel) {
                    return model.globalId === otModel.globalId;
                }
                return dataUtilModel.inheritanceStack.indexOf(otModel.globalId) > -1;
            }
        }
    };
    return patches;
};