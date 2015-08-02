/**
 * Created by Marcos J. Alvarez on 01/08/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.1
 */

module.exports = function (sails) {
    return {
        patch: function () {
            sails
                .util
                ._(sails.models)
                .forEach(function (model) {
                    var m = model.globalId;
                    console.log(m);
                });
        }
    };
};
