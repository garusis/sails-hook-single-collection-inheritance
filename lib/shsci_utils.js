/**
 * Created by Marcos J. Alvarez on 01/08/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.1
 */

module.exports = function (sails) {
    var patch = require("./patch")(sails);

    var allModels = {};

    var recursiveExtend = function (schemaWrapper) {
        var cbList = ['beforeCreate', 'beforeUpdate'];
        _.forEach(cbList, function (cbName) {
            var originalCallback = schemaWrapper.finalSchema[cbName];
            schemaWrapper.finalSchema[cbName] = function (values, cb) {
                var self = this;
                values[sails.config['single-collection-inheritance']] = schemaWrapper.inheritanceStack;
                if (originalCallback) {
                    return originalCallback.call(self, values, cb);
                }
                return cb();
            };
        });

        _.forEach(schemaWrapper.children, function (child, nameChildren) {
            _.defaults(child.finalSchema, child.schema, schemaWrapper.finalSchema);
            var cbList = ['beforeValidate', 'afterValidate', 'beforeCreate', 'afterCreate', 'beforeValidate', 'afterValidate', 'beforeUpdate', 'afterUpdate', 'beforeDestroy', 'afterDestroy'];
            _.forEach(cbList, function (cbName) {
                if (child.schema[cbName] && schemaWrapper.finalSchema[cbName]) {
                    child.finalSchema[cbName] = function (values, cb) {
                        var self = this;
                        return schemaWrapper.finalSchema[cbName].call(self, values, function (err) {
                            if (err) {
                                return cb(err);
                            }
                            return child.schema[cbName].call(self, values, function (err) {
                                return cb(err);
                            });
                        });
                    };
                } else {
                    child.finalSchema[cbName] = schemaWrapper.finalSchema[cbName] || child.schema[cbName];
                }
            });
            child.inheritanceStack = _.clone(schemaWrapper.inheritanceStack);
            child.inheritanceStack.push(nameChildren);
            recursiveExtend(child);
        });
    };

    var hasAllItsAncestors = function (schemaWrapper) {
        return !schemaWrapper.parent || (!_.isString(schemaWrapper.parent) && hasAllItsAncestors(schemaWrapper.parent));
    };

    return {
        patch: function () {
            sails
                .util
                ._(sails.models)
                .forEach(function (model) {
                    var nameModel = model.globalId;
                    if (allModels[nameModel]) {
                        var dataUtilModel = allModels[nameModel];
                        patch.patchFind(dataUtilModel, model);
                        patch.patchFindOne(dataUtilModel, model);
                        patch.patchCount(dataUtilModel, model);
                        patch.patchIsA(dataUtilModel, model);
                    } else {
                        patch.patchIsA(model);
                    }

                    //En el parcheo debe añadirse el respectivo metodo "isA" que permitira definir si un objeto pertenece
                    //a una clase especificada. Tambien debe sobreescribirse los respectivos where para limitar los elementos
                    //que se traeran por el query, solo a aquellos cuyo inheritanceStack contenga la llave especificada a la clase (globalID).

                    console.log(nameModel);
                });
        },
        inherit: function (ownSchema, modelName, parentModel) {
            //al aplicar el proceso de inherit a los modelos, añadir el campo determinado por discriminatorInheritanceKey como un String.
            var schemaWrapper = allModels[modelName] = {
                schema: ownSchema,
                finalSchema: {},
                children: {},
                parent: parentModel
            };

            _.forEach(allModels, function (wrapper, name) {
                if (wrapper.parent == modelName) {
                    schemaWrapper.children[name] = wrapper;
                    wrapper.parent = schemaWrapper;
                }
            });

            if (!parentModel) {
                delete  schemaWrapper.parent;
                schemaWrapper.finalSchema = _.clone(ownSchema);
                schemaWrapper.finalSchema[sails.config['single-collection-inheritance']] = {
                    type: 'array',
                    required: true
                };
                schemaWrapper.inheritanceStack = [modelName];
                recursiveExtend(schemaWrapper);
            } else if (allModels[parentModel]) {
                var parent = allModels[parentModel];
                schemaWrapper.parent = parent;
                parent.children[modelName] = schemaWrapper;

                if (hasAllItsAncestors(schemaWrapper)) {
                    _.defaults(schemaWrapper.finalSchema, schemaWrapper.schema, parent.finalSchema);
                    schemaWrapper.inheritanceStack = _.clone(parent.inheritanceStack);
                    schemaWrapper.inheritanceStack.push(modelName);
                    recursiveExtend(schemaWrapper);
                }
            }
            return schemaWrapper.finalSchema;
        }
    };
};
