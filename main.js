/**
 * Created by Marcos J. Alvarez on 12/07/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.3
 */
module.exports = function (sails) {
    return {
        defaults: {
            __configKey__: {
                inheritanceStackKeyModel: "__shsci__inheritance_stack"
            }
        },
        configure: function () {

        },
        initialize: function (cb) {

            cb();
        },
        routes: {}
    };
};