// Draws a user-sized matrix of randomly colored, slightly perturbed ring items.
// Run in Adobe Illustrator via File > Scripts > Other Script.

(function () {
    var previousInteractionLevel = app.userInteractionLevel;

    try {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;

        var settings = askSettings();
        if (!settings) {
            return;
        }

        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        var COLS = settings.cols;
        var ROWS = settings.rows;
        var OUTER_RADIUS = 28;
        var GAP = settings.gap;
        var MARGIN = settings.padding;
        var CELL = OUTER_RADIUS * 2 + GAP;
        var WIDTH = MARGIN * 2 + COLS * OUTER_RADIUS * 2 + (COLS - 1) * GAP;
        var HEIGHT = MARGIN * 2 + ROWS * OUTER_RADIUS * 2 + (ROWS - 1) * GAP;
        var RADII = buildRadii(OUTER_RADIUS, settings.circleCount);

        var preset = new DocumentPreset();
        preset.width = WIDTH;
        preset.height = HEIGHT;
        preset.colorMode = DocumentColorSpace.RGB;

        var doc = app.documents.addDocument("Print", preset);
        doc.rulerOrigin = [0, 0];

        var layer = doc.activeLayer;
        layer.name = "Random Ring Matrix";

        for (var row = 0; row < ROWS; row++) {
            for (var col = 0; col < COLS; col++) {
                var cx = MARGIN + OUTER_RADIUS + col * CELL;
                var cy = HEIGHT - MARGIN - OUTER_RADIUS - row * CELL;
                drawItem(layer, cx, cy, RADII);
            }
        }

        app.redraw();
    } catch (err) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("Could not draw ring matrix: " + err + (err && err.line ? " line " + err.line : ""));
    } finally {
        app.userInteractionLevel = previousInteractionLevel;
    }

    function askSettings() {
        var MAX_DIMENSION = 100;
        var MAX_CANVAS_SIZE = 16348;
        var OUTER_RADIUS = 28;
        var result = null;
        var dialog = new Window("dialog", "Random Ring Matrix Settings");

        dialog.alignChildren = ["fill", "top"];
        dialog.margins = 16;

        var fieldsPanel = dialog.add("panel", undefined, "Parameters");
        fieldsPanel.alignChildren = ["fill", "top"];
        fieldsPanel.margins = 14;

        var matrixField = addField(
            fieldsPanel,
            "Matrix size",
            "10x10",
            "Use columns x rows, or one number for a square matrix."
        );
        var circleCountField = addField(
            fieldsPanel,
            "Circles per item",
            "4",
            "Whole number from 1 to 20."
        );
        var gapField = addField(
            fieldsPanel,
            "Item gap, pt",
            "14",
            "Distance between neighboring items, from 0 to 500 points."
        );
        var paddingField = addField(
            fieldsPanel,
            "Matrix padding, pt",
            "28",
            "Padding around the full matrix, from 0 to 1000 points."
        );

        var buttons = dialog.add("group");
        buttons.alignment = ["right", "top"];
        var cancelButton = buttons.add("button", undefined, "Cancel", { name: "cancel" });
        var okButton = buttons.add("button", undefined, "OK", { name: "ok" });

        cancelButton.onClick = function () {
            dialog.close(0);
        };

        okButton.onClick = function () {
            var matrixSize = parseMatrixSize(matrixField.text);
            var circleCount = parseWholeNumber(circleCountField.text);
            var gap = parseNumber(gapField.text);
            var padding = parseNumber(paddingField.text);

            if (!matrixSize || !isValidDimension(matrixSize.cols, MAX_DIMENSION) || !isValidDimension(matrixSize.rows, MAX_DIMENSION)) {
                alert("Matrix size must be like 10x10 or 12. Each dimension must be from 1 to " + MAX_DIMENSION + ".");
                matrixField.active = true;
                return;
            }

            if (circleCount === null || circleCount < 1 || circleCount > 20) {
                alert("Circles per item must be a whole number from 1 to 20.");
                circleCountField.active = true;
                return;
            }

            if (gap === null || gap < 0 || gap > 500) {
                alert("Item gap must be a number from 0 to 500 points.");
                gapField.active = true;
                return;
            }

            if (padding === null || padding < 0 || padding > 1000) {
                alert("Matrix padding must be a number from 0 to 1000 points.");
                paddingField.active = true;
                return;
            }

            var width = padding * 2 + matrixSize.cols * OUTER_RADIUS * 2 + (matrixSize.cols - 1) * gap;
            var height = padding * 2 + matrixSize.rows * OUTER_RADIUS * 2 + (matrixSize.rows - 1) * gap;

            if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
                alert(
                    "Those settings create an artboard of " +
                    roundTo(width, 2) +
                    " x " +
                    roundTo(height, 2) +
                    " points. Please use smaller values so both dimensions stay at or below " +
                    MAX_CANVAS_SIZE +
                    " points."
                );
                matrixField.active = true;
                return;
            }

            result = {
                cols: matrixSize.cols,
                rows: matrixSize.rows,
                circleCount: circleCount,
                gap: gap,
                padding: padding
            };
            dialog.close(1);
        };

        matrixField.active = true;
        dialog.show();
        return result;
    }

    function addField(parent, label, defaultValue, helpText) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];

        var labelView = row.add("statictext", undefined, label);
        labelView.preferredSize.width = 110;

        var input = row.add("edittext", undefined, defaultValue);
        input.characters = 12;

        var help = row.add("statictext", undefined, helpText);
        help.preferredSize.width = 310;

        return input;
    }

    function parseMatrixSize(value) {
        value = trim(String(value)).toLowerCase();
        var parts = value.split(/[x*]/);
        var cols;
        var rows;

        if (parts.length === 1) {
            cols = parseWholeNumber(parts[0]);
            rows = cols;
        } else if (parts.length === 2) {
            cols = parseWholeNumber(parts[0]);
            rows = parseWholeNumber(parts[1]);
        } else {
            return null;
        }

        if (cols === null || rows === null) {
            return null;
        }

        return {
            cols: cols,
            rows: rows
        };
    }

    function buildRadii(outerRadius, circleCount) {
        var radii = [];
        var innerRadius = outerRadius * 0.2;

        if (circleCount === 1) {
            return [outerRadius];
        }

        for (var i = 0; i < circleCount; i++) {
            var t = i / (circleCount - 1);
            radii.push(outerRadius - (outerRadius - innerRadius) * t);
        }

        return radii;
    }

    function drawItem(layer, cx, cy, radii) {
        var group = layer.groupItems.add();
        group.name = "Ring Item";

        var centers = [{ x: cx, y: cy }];

        for (var i = 1; i < radii.length; i++) {
            var parentCenter = centers[i - 1];
            var maxOffset = radii[i - 1] - radii[i];
            var offset = randomPointInDisk(maxOffset);

            centers[i] = {
                x: parentCenter.x + offset.x,
                y: parentCenter.y + offset.y
            };
        }

        for (var j = 0; j < radii.length; j++) {
            drawCircle(group, centers[j].x, centers[j].y, radii[j], randomRGBColor());
        }
    }

    function drawCircle(group, cx, cy, radius, fillColor) {
        var diameter = radius * 2;
        var top = cy + radius;
        var left = cx - radius;
        var circle = group.pathItems.ellipse(top, left, diameter, diameter);

        circle.filled = true;
        circle.fillColor = fillColor;
        circle.stroked = false;
        return circle;
    }

    function randomPointInDisk(radius) {
        if (radius <= 0) {
            return { x: 0, y: 0 };
        }

        var angle = Math.random() * Math.PI * 2;
        var distance = Math.sqrt(Math.random()) * radius;

        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }

    function randomRGBColor() {
        var color = new RGBColor();

        color.red = randomInt(20, 245);
        color.green = randomInt(20, 245);
        color.blue = randomInt(20, 245);
        return color;
    }

    function randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    function parseWholeNumber(value) {
        value = trim(String(value));
        if (!/^\d+$/.test(value)) {
            return null;
        }

        return parseInt(value, 10);
    }

    function parseNumber(value) {
        value = trim(String(value));
        if (!/^\d+(\.\d+)?$/.test(value)) {
            return null;
        }

        return parseFloat(value);
    }

    function isValidDimension(value, max) {
        return value !== null && value >= 1 && value <= max;
    }

    function roundTo(value, decimals) {
        var factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    function trim(value) {
        return value.replace(/^\s+|\s+$/g, "");
    }
}());
