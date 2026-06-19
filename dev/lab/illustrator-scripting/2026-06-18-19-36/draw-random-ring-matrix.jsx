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

        if (settings.backgroundEnabled) {
            settings.backgroundColor = askBackgroundColor(rgbColorFromHex("#FFFFFF"));
            if (!settings.backgroundColor) {
                return;
            }
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
        applyPixelPresetOptions(preset);

        var doc = createPixelDocument(preset);
        applyPixelDocumentOptions(doc);
        doc.rulerOrigin = [0, 0];

        var layer = doc.activeLayer;
        layer.name = "Random Ring Matrix";

        if (settings.backgroundEnabled) {
            drawBackground(doc, WIDTH, HEIGHT, settings.backgroundColor);
        }

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
        var MAX_CANVAS_PIXELS = 16348;
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
            "Item gap, px",
            "14",
            "Distance between neighboring items, from 0 to 500 pixels."
        );
        var paddingField = addField(
            fieldsPanel,
            "Matrix padding, px",
            "28",
            "Padding around the full matrix, from 0 to 1000 pixels."
        );

        var backgroundPanel = dialog.add("panel", undefined, "Background");
        backgroundPanel.alignChildren = ["fill", "top"];
        backgroundPanel.margins = 14;

        var backgroundEnabledField = backgroundPanel.add("checkbox", undefined, "Create a background behind the circles");
        backgroundEnabledField.value = false;

        var backgroundHelp = backgroundPanel.add(
            "statictext",
            undefined,
            "If enabled, the color picker opens after you click OK.",
            { multiline: true }
        );
        backgroundHelp.preferredSize.width = 430;

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
                alert("Item gap must be a number from 0 to 500 pixels.");
                gapField.active = true;
                return;
            }

            if (padding === null || padding < 0 || padding > 1000) {
                alert("Matrix padding must be a number from 0 to 1000 pixels.");
                paddingField.active = true;
                return;
            }

            var width = padding * 2 + matrixSize.cols * OUTER_RADIUS * 2 + (matrixSize.cols - 1) * gap;
            var height = padding * 2 + matrixSize.rows * OUTER_RADIUS * 2 + (matrixSize.rows - 1) * gap;

            if (width > MAX_CANVAS_PIXELS || height > MAX_CANVAS_PIXELS) {
                alert(
                    "Those settings create an artboard of " +
                    roundTo(width, 2) +
                    " x " +
                    roundTo(height, 2) +
                    " pixels. Please use smaller values so both dimensions stay at or below " +
                    MAX_CANVAS_PIXELS +
                    " pixels."
                );
                matrixField.active = true;
                return;
            }

            result = {
                cols: matrixSize.cols,
                rows: matrixSize.rows,
                circleCount: circleCount,
                gap: gap,
                padding: padding,
                backgroundEnabled: backgroundEnabledField.value,
                backgroundColor: null
            };
            dialog.close(1);
        };

        matrixField.active = true;
        dialog.show();
        return result;
    }

    function askBackgroundColor(defaultColor) {
        return pickRGBColor(defaultColor);
    }

    function applyPixelPresetOptions(preset) {
        try {
            preset.units = RulerUnits.Pixels;
        } catch (errUnits) {}

        try {
            preset.rasterResolution = DocumentRasterResolution.ScreenResolution;
        } catch (errResolution) {}
    }

    function createPixelDocument(preset) {
        try {
            return app.documents.addDocument("Web", preset);
        } catch (errWebPreset) {
            return app.documents.addDocument("Print", preset);
        }
    }

    function applyPixelDocumentOptions(doc) {
        try {
            doc.rulerUnits = RulerUnits.Pixels;
        } catch (errRulerUnits) {}
    }

    function drawBackground(doc, width, height, fillColor) {
        var backgroundLayer = doc.layers.add();
        backgroundLayer.name = "Background";
        backgroundLayer.zOrder(ZOrderMethod.SENDTOBACK);

        var rect = backgroundLayer.pathItems.rectangle(height, 0, width, height);
        rect.filled = true;
        rect.fillColor = fillColor;
        rect.stroked = false;
        rect.name = "Background";
        rect.locked = true;
    }

    function addField(parent, label, defaultValue, helpText) {
        var HELP_WIDTH = 260;
        var HELP_WRAP_CHARS = 42;
        var HELP_LINE_HEIGHT = 17;
        var row = parent.add("group");
        row.alignChildren = ["left", "top"];

        var labelView = row.add("statictext", undefined, label);
        labelView.preferredSize.width = 110;

        var input = row.add("edittext", undefined, defaultValue);
        input.characters = 12;

        var wrappedHelpText = wrapText(helpText, HELP_WRAP_CHARS);
        var help = row.add("statictext", undefined, wrappedHelpText, { multiline: true });
        help.preferredSize.width = HELP_WIDTH;
        help.preferredSize.height = countLines(wrappedHelpText) * HELP_LINE_HEIGHT;

        return input;
    }

    function wrapText(text, maxChars) {
        var sourceLines = String(text).split(/\r\n|\r|\n/);
        var wrappedLines = [];

        for (var i = 0; i < sourceLines.length; i++) {
            wrapLine(sourceLines[i], maxChars, wrappedLines);
        }

        return wrappedLines.join("\n");
    }

    function wrapLine(line, maxChars, output) {
        var words = trim(String(line)).split(/\s+/);
        var current = "";

        for (var i = 0; i < words.length; i++) {
            var word = words[i];

            if (!word) {
                continue;
            }

            if (!current) {
                current = word;
            } else if ((current.length + 1 + word.length) <= maxChars) {
                current += " " + word;
            } else {
                output.push(current);
                current = word;
            }

            while (current.length > maxChars) {
                output.push(current.substr(0, maxChars));
                current = current.substr(maxChars);
            }
        }

        if (current) {
            output.push(current);
        }
    }

    function countLines(text) {
        if (!text) {
            return 1;
        }

        return String(text).split(/\r\n|\r|\n/).length;
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

    function pickRGBColor(currentColor) {
        if (app.showColorPicker) {
            try {
                return app.showColorPicker(currentColor);
            } catch (errShowColorPicker) {}
        }

        if (typeof $.colorPicker === "function") {
            try {
                var pickedValue = $.colorPicker(rgbColorToNumber(currentColor));

                if (pickedValue >= 0) {
                    return rgbColorFromNumber(pickedValue);
                }
            } catch (errColorPicker) {}
        }

        alert("No compatible color picker is available in this environment.");
        return null;
    }

    function rgbColorFromNumber(value) {
        var color = new RGBColor();

        color.red = (value >> 16) & 255;
        color.green = (value >> 8) & 255;
        color.blue = value & 255;
        return color;
    }

    function rgbColorToNumber(color) {
        return (clampColorValue(color.red) << 16) +
            (clampColorValue(color.green) << 8) +
            clampColorValue(color.blue);
    }

    function rgbColorFromHex(value) {
        value = trim(String(value)).replace(/^#/, "");

        if (!/^[0-9a-fA-F]{6}$/.test(value)) {
            return null;
        }

        var color = new RGBColor();
        color.red = parseInt(value.substr(0, 2), 16);
        color.green = parseInt(value.substr(2, 2), 16);
        color.blue = parseInt(value.substr(4, 2), 16);
        return color;
    }

    function rgbColorToHex(color) {
        return "#" +
            colorByteToHex(color.red) +
            colorByteToHex(color.green) +
            colorByteToHex(color.blue);
    }

    function colorByteToHex(value) {
        var hex = clampColorValue(value).toString(16).toUpperCase();

        return hex.length < 2 ? "0" + hex : hex;
    }

    function clampColorValue(value) {
        value = Math.round(Number(value));

        if (isNaN(value)) {
            return 0;
        }

        if (value < 0) {
            return 0;
        }

        if (value > 255) {
            return 255;
        }

        return value;
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
