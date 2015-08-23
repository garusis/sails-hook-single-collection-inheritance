/**
 * Created by Marcos J. Alvarez on 01/08/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.1
 */


module.exports = function (sails) {

    var allModels = {};

    var recursiveExtend = function (schemaWrapper) {
        _.forEach(schemaWrapper.children, function (child) {
            _.defaults(child.finalSchema, child.schema, schemaWrapper.finalSchema);
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
                recursiveExtend(schemaWrapper);
            } else if (allModels[parentModel]) {
                var parent = allModels[parentModel];
                schemaWrapper.parent = parent;
                parent.children[modelName] = schemaWrapper;

                if (hasAllItsAncestors(schemaWrapper)) {
                    _.defaults(schemaWrapper.finalSchema, schemaWrapper.schema, parent.finalSchema);
                    recursiveExtend(schemaWrapper);
                }
            }
            return schemaWrapper.finalSchema;
        }
    };
};
