// Removes trailing "copy" fragments from layer names, skipping underscore-prefixed layers.
// Run in Adobe Illustrator via File > Scripts > Other Script.

(function () {
    if (app.documents.length === 0) {
        alert("Open a document before running this script.");
        return;
    }

    processLayers(app.activeDocument.layers, removeCopyFromLayerName);

    function processLayers(layers, callback) {
        for (var i = layers.length - 1; i >= 0; i--) {
            var layer = layers[i];

            if (isSkippedLayer(layer)) {
                continue;
            }

            processLayer(layer, callback);
        }
    }

    function processLayer(layer, callback) {
        var wasLocked = layer.locked;

        try {
            layer.locked = false;
            callback(layer);

            if (layer.layers.length > 0) {
                processLayers(layer.layers, callback);
            }
        } finally {
            layer.locked = wasLocked;
        }
    }

    function isSkippedLayer(layer) {
        return layer.name.charAt(0) === "_";
    }

    function removeCopyFromLayerName(layer) {
        var cleanedName = layer.name.replace(/(\s+copy(?:\s+\d+)*)+$/i, "");

        if (cleanedName !== layer.name) {
            layer.name = cleanedName;
        }
    }
}());
