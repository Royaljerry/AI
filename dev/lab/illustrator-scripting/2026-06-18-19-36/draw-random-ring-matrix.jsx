// Draws a user-sized matrix of randomly colored, nested shape items.
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
        var OUTER_RADII = buildOuterRadii(
            COLS,
            OUTER_RADIUS,
            settings.dynamicEnabled,
            settings.dynamicAmount
        );
        var MAX_OUTER_RADIUS = maxNumber(OUTER_RADII);
        var COLUMN_CENTERS = buildColumnCenters(OUTER_RADII, GAP, MARGIN);
        var WIDTH = calculateMatrixWidth(OUTER_RADII, GAP, MARGIN);
        var HEIGHT = calculateMatrixHeight(ROWS, MAX_OUTER_RADIUS, GAP, MARGIN);
        var ROW_CELL = MAX_OUTER_RADIUS * 2 + GAP;

        var preset = new DocumentPreset();
        preset.width = WIDTH;
        preset.height = HEIGHT;
        preset.colorMode = DocumentColorSpace.RGB;
        applyPixelPresetOptions(preset);

        var doc = createPixelDocument(preset);
        applyPixelDocumentOptions(doc);
        doc.rulerOrigin = [0, 0];

        var layer = doc.activeLayer;
        layer.name = "Random Shape Matrix";

        if (settings.backgroundEnabled) {
            drawBackground(doc, WIDTH, HEIGHT, settings.backgroundColor);
        }

        for (var row = 0; row < ROWS; row++) {
            for (var col = 0; col < COLS; col++) {
                var cx = COLUMN_CENTERS[col];
                var cy = HEIGHT - MARGIN - MAX_OUTER_RADIUS - row * ROW_CELL;
                var radii = buildRadii(OUTER_RADII[col], settings.shapeCount);

                drawItem(layer, cx, cy, radii, settings.shapeType);
            }
        }

        app.redraw();
    } catch (err) {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        alert("Could not draw shape matrix: " + err + (err && err.line ? " line " + err.line : ""));
    } finally {
        app.userInteractionLevel = previousInteractionLevel;
    }

    function askSettings() {
        var MAX_DIMENSION = 100;
        var MAX_CANVAS_PIXELS = 16348;
        var OUTER_RADIUS = 28;
        var result = null;
        var dialog = new Window("dialog", "Random Shape Matrix Settings");

        dialog.alignChildren = ["fill", "top"];
        dialog.margins = 16;

        var fieldsPanel = dialog.add("panel", undefined, "Parameters");
        fieldsPanel.alignChildren = ["fill", "top"];
        fieldsPanel.margins = 14;

        var shapeField = addDropdown(
            fieldsPanel,
            "Shape",
            ["Circles", "Squares", "Triangles"],
            0,
            "Choose the item shape to nest."
        );
        var matrixField = addField(
            fieldsPanel,
            "Matrix size",
            "10x10",
            "Use columns x rows, or one number for a square matrix."
        );
        var shapeCountField = addField(
            fieldsPanel,
            "Shapes per item",
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

        var dynamicsPanel = dialog.add("panel", undefined, "Row Dynamics");
        dynamicsPanel.alignChildren = ["fill", "top"];
        dynamicsPanel.margins = 14;

        var dynamicEnabledField = dynamicsPanel.add("checkbox", undefined, "Use row dynamics");
        dynamicEnabledField.value = false;

        var dynamicHelpText = wrapText(
            "Items become smaller near each row edge and larger near the row center.",
            60
        );
        var dynamicHelp = dynamicsPanel.add("statictext", undefined, dynamicHelpText, { multiline: true });
        dynamicHelp.preferredSize.width = 430;
        dynamicHelp.preferredSize.height = countLines(dynamicHelpText) * 17;

        var dynamicAmountField = addField(
            dynamicsPanel,
            "Amount, %",
            "50",
            "Edges shrink and the row center grows by this percentage, from 0 to 95."
        );
        dynamicAmountField.enabled = false;
        dynamicEnabledField.onClick = function () {
            dynamicAmountField.enabled = dynamicEnabledField.value;
        };

        var backgroundPanel = dialog.add("panel", undefined, "Background");
        backgroundPanel.alignChildren = ["fill", "top"];
        backgroundPanel.margins = 14;

        var backgroundEnabledField = backgroundPanel.add("checkbox", undefined, "Create a background behind the shapes");
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
            var shapeCount = parseWholeNumber(shapeCountField.text);
            var gap = parseNumber(gapField.text);
            var padding = parseNumber(paddingField.text);
            var dynamicEnabled = dynamicEnabledField.value;
            var dynamicAmount = parseNumber(dynamicAmountField.text);

            if (!matrixSize || !isValidDimension(matrixSize.cols, MAX_DIMENSION) || !isValidDimension(matrixSize.rows, MAX_DIMENSION)) {
                alert("Matrix size must be like 10x10 or 12. Each dimension must be from 1 to " + MAX_DIMENSION + ".");
                matrixField.active = true;
                return;
            }

            if (shapeCount === null || shapeCount < 1 || shapeCount > 20) {
                alert("Shapes per item must be a whole number from 1 to 20.");
                shapeCountField.active = true;
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

            if (dynamicEnabled && (dynamicAmount === null || dynamicAmount < 0 || dynamicAmount > 95)) {
                alert("Dynamic amount must be a number from 0 to 95 percent.");
                dynamicAmountField.active = true;
                return;
            }

            if (!dynamicEnabled) {
                dynamicAmount = 0;
            }

            var outerRadii = buildOuterRadii(matrixSize.cols, OUTER_RADIUS, dynamicEnabled, dynamicAmount);
            var width = calculateMatrixWidth(outerRadii, gap, padding);
            var height = calculateMatrixHeight(matrixSize.rows, maxNumber(outerRadii), gap, padding);

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
                shapeType: getSelectedShapeType(shapeField),
                shapeCount: shapeCount,
                gap: gap,
                padding: padding,
                dynamicEnabled: dynamicEnabled,
                dynamicAmount: dynamicAmount,
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

    function addDropdown(parent, label, items, selectedIndex, helpText) {
        var HELP_WIDTH = 260;
        var HELP_WRAP_CHARS = 42;
        var HELP_LINE_HEIGHT = 17;
        var row = parent.add("group");
        row.alignChildren = ["left", "top"];

        var labelView = row.add("statictext", undefined, label);
        labelView.preferredSize.width = 110;

        var dropdown = row.add("dropdownlist", undefined, items);
        dropdown.preferredSize.width = 118;
        dropdown.selection = selectedIndex;

        var wrappedHelpText = wrapText(helpText, HELP_WRAP_CHARS);
        var help = row.add("statictext", undefined, wrappedHelpText, { multiline: true });
        help.preferredSize.width = HELP_WIDTH;
        help.preferredSize.height = countLines(wrappedHelpText) * HELP_LINE_HEIGHT;

        return dropdown;
    }

    function getSelectedShapeType(dropdown) {
        var value = dropdown.selection ? dropdown.selection.text : "Circles";

        if (value === "Squares") {
            return "square";
        }

        if (value === "Triangles") {
            return "triangle";
        }

        return "circle";
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

    function buildOuterRadii(cols, baseRadius, dynamicEnabled, dynamicAmount) {
        var radii = [];

        for (var col = 0; col < cols; col++) {
            radii.push(baseRadius * calculateRowDynamicScale(col, cols, dynamicEnabled, dynamicAmount));
        }

        return radii;
    }

    function calculateRowDynamicScale(col, cols, dynamicEnabled, dynamicAmount) {
        if (!dynamicEnabled || dynamicAmount <= 0 || cols < 3) {
            return 1;
        }

        var amount = dynamicAmount / 100;
        var minScale = 1 - amount;
        var maxScale = 1 + amount;
        var wave = Math.sin((col / (cols - 1)) * Math.PI);

        return minScale + (maxScale - minScale) * wave;
    }

    function calculateMatrixWidth(outerRadii, gap, padding) {
        var width = padding * 2;

        for (var i = 0; i < outerRadii.length; i++) {
            width += outerRadii[i] * 2;
        }

        if (outerRadii.length > 1) {
            width += (outerRadii.length - 1) * gap;
        }

        return width;
    }

    function calculateMatrixHeight(rows, maxRadius, gap, padding) {
        return padding * 2 + rows * maxRadius * 2 + (rows - 1) * gap;
    }

    function buildColumnCenters(outerRadii, gap, padding) {
        var centers = [];
        var x = padding;

        for (var i = 0; i < outerRadii.length; i++) {
            centers[i] = x + outerRadii[i];
            x += outerRadii[i] * 2 + gap;
        }

        return centers;
    }

    function maxNumber(values) {
        var max = values[0];

        for (var i = 1; i < values.length; i++) {
            if (values[i] > max) {
                max = values[i];
            }
        }

        return max;
    }

    function buildRadii(outerRadius, shapeCount) {
        var radii = [];
        var innerRadius = outerRadius * 0.2;

        if (shapeCount === 1) {
            return [outerRadius];
        }

        for (var i = 0; i < shapeCount; i++) {
            var t = i / (shapeCount - 1);
            radii.push(outerRadius - (outerRadius - innerRadius) * t);
        }

        return radii;
    }

    function drawItem(layer, cx, cy, radii, shapeType) {
        var group = layer.groupItems.add();
        group.name = "Nested Shape Item";

        var centers = [{ x: cx, y: cy }];

        for (var i = 1; i < radii.length; i++) {
            var parentCenter = centers[i - 1];
            var maxOffset = radii[i - 1] - radii[i];
            var offset = randomPointInsideShape(shapeType, maxOffset);

            centers[i] = {
                x: parentCenter.x + offset.x,
                y: parentCenter.y + offset.y
            };
        }

        for (var j = 0; j < radii.length; j++) {
            drawShape(group, shapeType, centers[j].x, centers[j].y, radii[j], randomRGBColor());
        }
    }

    function drawShape(group, shapeType, cx, cy, radius, fillColor) {
        if (shapeType === "square") {
            return drawSquare(group, cx, cy, radius, fillColor);
        }

        if (shapeType === "triangle") {
            return drawTriangle(group, cx, cy, radius, fillColor);
        }

        return drawCircle(group, cx, cy, radius, fillColor);
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

    function drawSquare(group, cx, cy, radius, fillColor) {
        var size = radius * 2;
        var square = group.pathItems.rectangle(cy + radius, cx - radius, size, size);

        square.filled = true;
        square.fillColor = fillColor;
        square.stroked = false;
        return square;
    }

    function drawTriangle(group, cx, cy, radius, fillColor) {
        var triangle = group.pathItems.add();

        triangle.setEntirePath(buildTrianglePoints(cx, cy, radius));
        triangle.closed = true;
        triangle.filled = true;
        triangle.fillColor = fillColor;
        triangle.stroked = false;
        return triangle;
    }

    function buildTrianglePoints(cx, cy, radius) {
        var points = [];
        var startAngle = Math.PI / 2;

        for (var i = 0; i < 3; i++) {
            var angle = startAngle + i * Math.PI * 2 / 3;
            points.push([
                cx + Math.cos(angle) * radius,
                cy + Math.sin(angle) * radius
            ]);
        }

        return points;
    }

    function randomPointInsideShape(shapeType, radius) {
        if (shapeType === "square") {
            return randomPointInSquare(radius);
        }

        if (shapeType === "triangle") {
            return randomPointInTriangle(radius);
        }

        return randomPointInDisk(radius);
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

    function randomPointInSquare(radius) {
        if (radius <= 0) {
            return { x: 0, y: 0 };
        }

        return {
            x: randomRange(-radius, radius),
            y: randomRange(-radius, radius)
        };
    }

    function randomPointInTriangle(radius) {
        if (radius <= 0) {
            return { x: 0, y: 0 };
        }

        var vertices = buildTrianglePoints(0, 0, radius);
        var u = Math.random();
        var v = Math.random();

        if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
        }

        return {
            x: interpolateTriangleCoordinate(vertices, u, v, 0),
            y: interpolateTriangleCoordinate(vertices, u, v, 1)
        };
    }

    function interpolateTriangleCoordinate(vertices, u, v, axis) {
        return vertices[0][axis] +
            u * (vertices[1][axis] - vertices[0][axis]) +
            v * (vertices[2][axis] - vertices[0][axis]);
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

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
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
