/**
 * Created by Marcos J. Alvarez on 12/07/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.3
 */
var getFileNameSchema = function () {
    // Save original Error.prepareStackTrace
    var origPrepareStackTrace = Error.prepareStackTrace;
    // Override with function that just returns `stack`
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    // Create a new `Error`, which automatically gets `stack`
    var err = new Error();
    // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
    var stack = err.stack;
    // Restore original `Error.prepareStackTrace`
    Error.prepareStackTrace = origPrepareStackTrace;

    // Remove superfluous function call on stack
    stack.shift(); // getStack --> Error
    console.log(stack[1].getFileName());
    return stack[1].getFileName();
};
module.exports = function (sails) {
    var utils = require("./lib/shsci_utils")(sails);
    var path = require("path");
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
            if (sails.hooks.orm) {
                evtsToWaitFor.push('hook:orm:loaded');
            }

            if (sails.hooks.pubsub) {
                evtsToWaitFor.push('hook:pubsub:loaded');
            }

            sails.after(evtsToWaitFor, function () {
                utils.patch();
                done();
            });
        },
        routes: {},
        inherit: function (parentModel, ownSchema) {
            if (!ownSchema) {
                ownSchema = parentModel;
            }
            var fileName = getFileNameSchema();
            var modelName = path.basename(fileName, path.extname(fileName));
            return utils.inherit(ownSchema, modelName, parentModel);
        }
    };
};