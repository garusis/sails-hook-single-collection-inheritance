/**
 * Created by Marcos J. Alvarez on 12/07/2015.
 * @author Marcos J. Alvarez
 * @email garusis@gmail.com
 * @version 0.0.1
 */
var Waterline = require("waterline");

var oldExtend = Waterline.Collection.extend;
Waterline.Collection.extend = function (protoProps, staticProps) {
    protoProps = protoProps || {}, staticProps = staticProps || {};

    protoProps["wsci_inheritance_stack"]="array";

    return oldExtend.call(this, protoProps, staticProps);
};