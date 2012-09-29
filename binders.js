
var Observers = require("./observers");
var Properties = require("./properties");
var autoCancelPrevious = Observers.autoCancelPrevious;
var once = Observers.once;

exports.makePropertyBinder = makePropertyBinder;
function makePropertyBinder(observeObject, observeKey) {
    return function (observeValue, source, target, parameters, trace) {
        var isActive;
        return observeObject(autoCancelPrevious(function (object) {
            return observeKey(autoCancelPrevious(function (key) {
                return observeValue(autoCancelPrevious(function (value) {
                    if (isActive) {
                        trace && console.log("IGNORED SET", trace.targetPath, "TO", value, "ON", object, "BECAUSE", trace.sourcePath, "ALREADY ACTIVE");
                        return;
                    }
                    try {
                        isActive = true;
                        trace && console.log("SET", trace.targetPath, "TO", value, "ON", object, "BECAUSE", trace.sourcePath);
                        object[key] = value;
                    } finally {
                        isActive = false;
                    }
                }), source, parameters, false, trace);
            }), target, parameters, false, trace);
        }), target, parameters, false, trace);
    };
}

exports.makeHasBinder = makeHasBinder;
function makeHasBinder(observeSet, observeValue) {
    return function (observeHas, source, target, parameters, trace) {
        return observeSet(autoCancelPrevious(function (set) {
            return observeValue(autoCancelPrevious(function (value) {
                return observeHas(autoCancelPrevious(function (has) {
                    // wait for the initial value to be updated by the
                    // other-way binding
                    if (has === undefined) {
                    } else if (has) { // should be in set
                        if (!(set.has || set.contains).call(set, value)) {
                            trace && console.log("ADD", value, "TO", trace.targetPath, "BECAUSE", trace.sourcePath);
                            set.add(value);
                        }
                    } else { // should not be in set
                        while ((set.has || set.contains).call(set, value)) {
                            trace && console.log("REMOVE", value, "FROM", trace.targetPath, "BECAUSE", trace.sourcePath);
                            (set.remove || set['delete']).call(set, value);
                        }
                    }
                }), target, parameters, false, trace);
            }), source, parameters, false, trace);
        }), source, parameters, false, trace);
    };
}

exports.makeEqualityBinder = makeEqualityBinder;
function makeEqualityBinder(bindLeft, observeRight) {
    return function (observeEquals, source, target, parameters, trace) {
        return observeEquals(autoCancelPrevious(function (equals) {
            if (equals) {
                trace && console.log("BIND", trace.targetPath, "TO", trace.sourcePath);
                var cancel = bindLeft(observeRight, source, source, parameters, trace);
                return function () {
                    trace && console.log("UNBIND", trace.targetPath, "FROM", trace.sourcePath);
                };
            }
        }), target, parameters, false, trace);
    };
}

exports.makeContentBinder = makeContentBinder;
function makeContentBinder(observeTarget) {
    return function (observeSource, source, target, parameters, trace) {
        return observeTarget(Observers.autoCancelPrevious(function (target) {
            if (!target)
                return;
            return observeSource(Observers.autoCancelPrevious(function (source) {
                if (!source)
                    return;
                function contentChange(plus, minus, index) {
                    if (target.getContentChangeDescriptor().isActive)
                        return;
                    target.swap(index, minus.length, plus);
                }
                source.addContentChangeListener(contentChange);
                contentChange(source, target, 0);
                return once(function () {
                    source.removeContentChangeListener(contentChange);
                });
            }), source, parameters, false, trace);
        }), target, parameters, false, trace);
    };
}

exports.makeReversedBinder = makeReversedBinder;
function makeReversedBinder(observeTarget) {
    return function (observeSource, source, target, parameters, trace) {
        return observeTarget(Observers.autoCancelPrevious(function (target) {
            return observeSource(Observers.autoCancelPrevious(function (source) {
                if (!source)
                    return;
                function contentChange(plus, minus, index) {
                    if (target.getContentChangeDescriptor().isActive)
                        return;
                    var reflected = target.length - index - minus.length;
                    target.swap(reflected, minus.length, plus.reversed());
                }
                source.addContentChangeListener(contentChange);
                contentChange(source, target, 0);
                return once(function () {
                    source.removeContentChangeListener(contentChange);
                });
            }), source, parameters, false, trace);
        }), target, parameters, false, trace);
    };
}

