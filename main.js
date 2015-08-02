/**
 * Created by Marcos J. Alvarez on 12/07/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.3
 */
module.exports = function (sails) {
    var utils = require("./lib/shsci_utils")(sails);

    return {
        defaults: {
            __configKey__: {
                discriminatorInheritanceKey: "__shsci__discriminator_stack"
            }
        },
        configure: function () {
        },
        initialize: function (done) {

            var evtsToWaitFor = [];
            if(sails.hooks.orm){
                evtsToWaitFor.push('hook:orm:loaded');
            }

            if(sails.hooks.pubsub){
                evtsToWaitFor.push('hook:pubsub:loaded');
            }

            sails.after(evtsToWaitFor, function() {
                    utils.patch();
                    done();
                });
        },
        routes: {}
    };
};