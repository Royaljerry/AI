// Cleans Illustrator copy suffixes from layer names.
// Run in Adobe Illustrator via File > Scripts > Other Script.

(function () {
    var MODE_REMOVE_COPY = "removeCopy";
    var MODE_NUMBER_COPIES = "numberCopies";

    if (app.documents.length === 0) {
        alert("Open a document before running this script.");
        return;
    }

    var selectedMode = askMode();

    if (!selectedMode) {
        return;
    }

    if (selectedMode === MODE_NUMBER_COPIES) {
        numberCopyGroups(app.activeDocument.layers);
    } else {
        processLayers(app.activeDocument.layers, removeCopyFromLayerName);
    }

    function askMode() {
        var selectedMode = null;
        var dialog = new Window("dialog", "Layer Manipulations");

        dialog.alignChildren = ["fill", "top"];
        dialog.margins = 16;

        var modePanel = dialog.add("panel", undefined, "Action");
        modePanel.alignChildren = ["left", "top"];
        modePanel.margins = 14;

        var removeCopyOption = modePanel.add("radiobutton", undefined, "Remove copy parts from layer names");
        var numberCopiesOption = modePanel.add("radiobutton", undefined, "Number copied layer groups");
        removeCopyOption.value = true;

        var buttons = dialog.add("group");
        buttons.alignment = ["right", "top"];
        var cancelButton = buttons.add("button", undefined, "Cancel", { name: "cancel" });
        var okButton = buttons.add("button", undefined, "OK", { name: "ok" });

        cancelButton.onClick = function () {
            dialog.close(0);
        };

        okButton.onClick = function () {
            selectedMode = numberCopiesOption.value ? MODE_NUMBER_COPIES : MODE_REMOVE_COPY;
            dialog.close(1);
        };

        dialog.show();
        return selectedMode;
    }

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
        withUnlockedLayer(layer, function () {
            callback(layer);

            if (layer.layers.length > 0) {
                processLayers(layer.layers, callback);
            }
        });
    }

    function isSkippedLayer(layer) {
        return layer.name.charAt(0) === "_";
    }

    function removeCopyFromLayerName(layer) {
        var cleanedName = getBaseLayerName(layer.name);

        if (cleanedName !== layer.name) {
            layer.name = cleanedName;
        }
    }

    function numberCopyGroups(layers) {
        var groups = collectCopyGroups(layers);

        for (var i = 0; i < groups.length; i++) {
            numberCopyGroup(groups[i]);
        }

        for (var j = 0; j < layers.length; j++) {
            var layer = layers[j];

            if (isSkippedLayer(layer)) {
                continue;
            }

            withUnlockedLayer(layer, function (unlockedLayer) {
                if (unlockedLayer.layers.length > 0) {
                    numberCopyGroups(unlockedLayer.layers);
                }
            });
        }
    }

    function collectCopyGroups(layers) {
        var groups = [];

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];

            if (isSkippedLayer(layer)) {
                continue;
            }

            addLayerToCopyGroup(groups, layer);
        }

        return groups;
    }

    function addLayerToCopyGroup(groups, layer) {
        var baseName = getBaseLayerName(layer.name);
        var group = findCopyGroup(groups, baseName);

        if (!group) {
            group = {
                baseName: baseName,
                hasCopyName: false,
                layers: []
            };
            groups.push(group);
        }

        if (baseName !== layer.name) {
            group.hasCopyName = true;
        }

        group.layers.push(layer);
    }

    function findCopyGroup(groups, baseName) {
        for (var i = 0; i < groups.length; i++) {
            if (groups[i].baseName === baseName) {
                return groups[i];
            }
        }

        return null;
    }

    function numberCopyGroup(group) {
        if (!group.hasCopyName || group.layers.length < 2) {
            return;
        }

        for (var i = 0; i < group.layers.length; i++) {
            renameLayer(group.layers[i], group.baseName + "-" + (i + 1));
        }
    }

    function renameLayer(layer, name) {
        withUnlockedLayer(layer, function (unlockedLayer) {
            unlockedLayer.name = name;
        });
    }

    function withUnlockedLayer(layer, callback) {
        var wasLocked = layer.locked;

        try {
            layer.locked = false;
            callback(layer);
        } finally {
            layer.locked = wasLocked;
        }
    }

    function getBaseLayerName(name) {
        var copyIndex = name.search(/\s+copy(?:\s+\d+)?(?:\s|$)/i);

        if (copyIndex < 0) {
            return name;
        }

        return trimRight(name.substring(0, copyIndex));
    }

    function trimRight(value) {
        return value.replace(/\s+$/g, "");
    }
}());
