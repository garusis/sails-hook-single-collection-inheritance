/**
 * Created by Marcos J. Alvarez on 01/08/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.1
 */


module.exports = function (sails) {

    var allModels = {};

    var recursiveExtend = function (schemaWrapper) {
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
            //añadir al finalSchema, el campo determinado por el discriminatorInheritanceKey con el respectivo stack de clases padres.
            //añadir al before update y before create la insersion del array correspondiente al inheritanceStack.
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
                    //al iniciar el parcheo recorrer todos los modelos y reconstruir un JSON Clase:stackInheritance.
                    //Cuando se encuentre un hijo se añade la clave al padre y luego se añade en el reemplazo del create,
                    //una referencia a objetoAsociativo[globalID] en lugar de algo estatico.

                    var m = model.globalId;
                    console.log(m);
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
