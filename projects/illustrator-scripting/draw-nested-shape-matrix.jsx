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

        if (settings.backgroundEnabled && !settings.backgroundColor) {
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
        var SINE_AMPLITUDE = settings.sineEnabled ? settings.sineAmplitude : 0;
        var COLUMN_CENTERS = buildColumnCenters(OUTER_RADII, GAP, MARGIN);
        var WIDTH = calculateMatrixWidth(OUTER_RADII, GAP, MARGIN);
        var HEIGHT = calculateMatrixHeight(ROWS, MAX_OUTER_RADIUS, GAP, MARGIN, SINE_AMPLITUDE);
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
                var cy = HEIGHT - MARGIN - SINE_AMPLITUDE - MAX_OUTER_RADIUS - row * ROW_CELL;
                cy += calculateSineWaveOffset(
                    col,
                    COLS,
                    settings.sineEnabled,
                    settings.sineAmplitude,
                    settings.sineFrequency
                );
                var radii = buildRadii(OUTER_RADII[col], settings.shapeCount);
                var rotationAngle = calculateRowRotationAngle(
                    col,
                    COLS,
                    settings.rotationEnabled,
                    settings.rotationAngle
                );

                drawItem(layer, cx, cy, radii, settings.shapeType, rotationAngle);
            }
        }

        app.redraw();

        if (settings.saveSettingsEnabled) {
            app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
            saveSettingsMarkdown(settings, WIDTH, HEIGHT, OUTER_RADIUS);
        }
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
        var randomizedBackgroundColor = null;
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
            "Distance between neighboring items, from -500 to 500 pixels. Negative values overlap items."
        );
        var paddingField = addField(
            fieldsPanel,
            "Matrix padding, px",
            "28",
            "Padding around the full matrix, from 0 to 1000 pixels."
        );
        var randomizeButtonRow = fieldsPanel.add("group");
        randomizeButtonRow.alignment = ["left", "top"];
        var randomizeButton = randomizeButtonRow.add("button", undefined, "Randomize Parameters");

        var dynamicsPanel = dialog.add("panel", undefined, "Row Dynamics");
        dynamicsPanel.alignChildren = ["fill", "top"];
        dynamicsPanel.margins = 14;

        var dynamicEnabledField = dynamicsPanel.add("checkbox", undefined, "Use row dynamics");
        dynamicEnabledField.value = false;

        var dynamicHelpText = wrapText(
            "Items become smaller near each row edge and larger near the row center.",
            90
        );
        var dynamicHelp = dynamicsPanel.add("statictext", undefined, dynamicHelpText, { multiline: true });
        dynamicHelp.preferredSize.width = 620;
        dynamicHelp.preferredSize.height = countLines(dynamicHelpText) * 17;

        var dynamicAmountField = addField(
            dynamicsPanel,
            "Amount, %",
            "50",
            "Edges shrink and the row center grows by this percentage, from 0 to 95."
        );
        dynamicAmountField.enabled = false;
        dynamicEnabledField.onClick = function () {
            syncDynamicFields();
        };

        var rotationPanel = dialog.add("panel", undefined, "Rotation");
        rotationPanel.alignChildren = ["fill", "top"];
        rotationPanel.margins = 14;

        var rotationEnabledField = rotationPanel.add("checkbox", undefined, "Use row rotation");
        rotationEnabledField.value = false;

        var rotationHelpText = wrapText(
            "Items rotate from 0 degrees near each row edge to the full angle near the row center.",
            90
        );
        var rotationHelp = rotationPanel.add("statictext", undefined, rotationHelpText, { multiline: true });
        rotationHelp.preferredSize.width = 620;
        rotationHelp.preferredSize.height = countLines(rotationHelpText) * 17;

        var rotationAngleField = addField(
            rotationPanel,
            "Angle, deg",
            "20",
            "Maximum rotation angle at the row center, from -180 to 180 degrees."
        );
        rotationAngleField.enabled = false;
        rotationEnabledField.onClick = function () {
            syncRotationFields();
        };

        var sinePanel = dialog.add("panel", undefined, "Sine Wave");
        sinePanel.alignChildren = ["fill", "top"];
        sinePanel.margins = 14;

        var sineEnabledField = sinePanel.add("checkbox", undefined, "Use sine wave");
        sineEnabledField.value = false;

        var sineHelpText = wrapText(
            "Offsets items vertically along each row to create a horizontal sine wave.",
            90
        );
        var sineHelp = sinePanel.add("statictext", undefined, sineHelpText, { multiline: true });
        sineHelp.preferredSize.width = 620;
        sineHelp.preferredSize.height = countLines(sineHelpText) * 17;

        var sineAmplitudeField = addField(
            sinePanel,
            "Amplitude, px",
            "40",
            "Vertical wave height from the row baseline, from 0 to 1000 pixels."
        );
        var sineFrequencyField = addField(
            sinePanel,
            "Frequency",
            "3",
            "Number of wave repetitions across each row, from 0.1 to 100."
        );
        sineAmplitudeField.enabled = false;
        sineFrequencyField.enabled = false;
        sineEnabledField.onClick = function () {
            syncSineFields();
        };

        var backgroundPanel = dialog.add("panel", undefined, "Background");
        backgroundPanel.alignChildren = ["fill", "top"];
        backgroundPanel.margins = 14;

        var backgroundEnabledField = backgroundPanel.add("checkbox", undefined, "Create a background behind the shapes");
        backgroundEnabledField.value = false;
        backgroundEnabledField.onClick = function () {
            randomizedBackgroundColor = null;
        };

        var backgroundHelp = backgroundPanel.add(
            "statictext",
            undefined,
            "If enabled, the color picker opens after you click OK.",
            { multiline: true }
        );
        backgroundHelp.preferredSize.width = 430;

        var outputPanel = dialog.add("panel", undefined, "Output");
        outputPanel.alignChildren = ["fill", "top"];
        outputPanel.margins = 14;

        var saveSettingsField = outputPanel.add("checkbox", undefined, "Save settings markdown");
        saveSettingsField.value = true;

        var saveSettingsHelp = outputPanel.add(
            "statictext",
            undefined,
            "If enabled, choose where to save a Markdown file after the artwork is created.",
            { multiline: true }
        );
        saveSettingsHelp.preferredSize.width = 430;

        randomizeButton.onClick = function () {
            randomizeSettingsFields();
        };

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
            var gap = parseSignedNumber(gapField.text);
            var padding = parseNumber(paddingField.text);
            var dynamicEnabled = dynamicEnabledField.value;
            var dynamicAmount = parseNumber(dynamicAmountField.text);
            var rotationEnabled = rotationEnabledField.value;
            var rotationAngle = parseSignedNumber(rotationAngleField.text);
            var sineEnabled = sineEnabledField.value;
            var sineAmplitude = parseNumber(sineAmplitudeField.text);
            var sineFrequency = parseNumber(sineFrequencyField.text);

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

            if (gap === null || gap < -500 || gap > 500) {
                alert("Item gap must be a number from -500 to 500 pixels.");
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

            if (rotationEnabled && (rotationAngle === null || rotationAngle < -180 || rotationAngle > 180)) {
                alert("Rotation angle must be a number from -180 to 180 degrees.");
                rotationAngleField.active = true;
                return;
            }

            if (!rotationEnabled) {
                rotationAngle = 0;
            }

            if (sineEnabled && (sineAmplitude === null || sineAmplitude < 0 || sineAmplitude > 1000)) {
                alert("Sine wave amplitude must be a number from 0 to 1000 pixels.");
                sineAmplitudeField.active = true;
                return;
            }

            if (sineEnabled && (sineFrequency === null || sineFrequency < 0.1 || sineFrequency > 100)) {
                alert("Sine wave frequency must be a number from 0.1 to 100.");
                sineFrequencyField.active = true;
                return;
            }

            if (!sineEnabled) {
                sineAmplitude = 0;
                sineFrequency = 0;
            }

            var outerRadii = buildOuterRadii(matrixSize.cols, OUTER_RADIUS, dynamicEnabled, dynamicAmount);
            var maxOuterRadius = maxNumber(outerRadii);

            if (!isValidGapForMatrix(outerRadii, matrixSize.rows, maxOuterRadius, gap)) {
                alert("That negative gap overlaps neighboring items too much. Please use a larger gap value.");
                gapField.active = true;
                return;
            }

            var width = calculateMatrixWidth(outerRadii, gap, padding);
            var height = calculateMatrixHeight(matrixSize.rows, maxOuterRadius, gap, padding, sineAmplitude);

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
                rotationEnabled: rotationEnabled,
                rotationAngle: rotationAngle,
                sineEnabled: sineEnabled,
                sineAmplitude: sineAmplitude,
                sineFrequency: sineFrequency,
                backgroundEnabled: backgroundEnabledField.value,
                backgroundColor: randomizedBackgroundColor,
                saveSettingsEnabled: saveSettingsField.value
            };
            dialog.close(1);
        };

        function syncDynamicFields() {
            dynamicAmountField.enabled = dynamicEnabledField.value;
        }

        function syncRotationFields() {
            rotationAngleField.enabled = rotationEnabledField.value;
        }

        function syncSineFields() {
            sineAmplitudeField.enabled = sineEnabledField.value;
            sineFrequencyField.enabled = sineEnabledField.value;
        }

        function randomizeSettingsFields() {
            var cols = randomInt(4, 30);
            var rows = randomInt(4, 30);

            shapeField.selection = randomInt(0, 2);
            matrixField.text = cols + "x" + rows;
            shapeCountField.text = String(randomInt(1, 12));
            gapField.text = String(randomInt(-8, 72));
            paddingField.text = String(randomInt(0, 140));

            dynamicEnabledField.value = randomBoolean();
            dynamicAmountField.text = String(randomInt(10, 85));
            syncDynamicFields();

            rotationEnabledField.value = randomBoolean();
            rotationAngleField.text = String(randomSignedInt(5, 90));
            syncRotationFields();

            sineEnabledField.value = randomBoolean();
            sineAmplitudeField.text = String(randomInt(5, 120));
            sineFrequencyField.text = String(randomDecimal(0.5, 6, 1));
            syncSineFields();

            backgroundEnabledField.value = randomBoolean();
            randomizedBackgroundColor = backgroundEnabledField.value ? randomRGBColor() : null;
            saveSettingsField.value = true;
        }

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

    function saveSettingsMarkdown(settings, width, height, baseOuterRadius) {
        var runDate = new Date();
        var defaultFile = new File(
            Folder.desktop.fsName + "/" + buildSettingsFileName(runDate)
        );
        var file = defaultFile.saveDlg("Save settings markdown", "Markdown files:*.md");

        if (!file) {
            return;
        }

        if (!/\.md$/i.test(file.name)) {
            file = new File(file.fsName + ".md");
        }

        file.encoding = "UTF-8";
        file.lineFeed = "Unix";

        if (!file.open("w")) {
            alert("Could not open the settings file for writing.");
            return;
        }

        file.write(buildSettingsMarkdown(settings, width, height, baseOuterRadius, runDate));
        file.close();
    }

    function buildSettingsFileName(date) {
        return "draw-nested-shape-matrix-settings-" + formatFileDate(date) + ".md";
    }

    function buildSettingsMarkdown(settings, width, height, baseOuterRadius, runDate) {
        var lines = [];

        lines.push("# Draw Nested Shape Matrix");
        lines.push("");
        lines.push("`" + formatDisplayDate(runDate) + "`");
        lines.push("");
        lines.push("- Matrix size: `" + settings.cols + " x " + settings.rows + "`");
        lines.push("- Shape: `" + shapeTypeToLabel(settings.shapeType) + "`");
        lines.push("- Shapes per item: `" + settings.shapeCount + "`");
        lines.push("- Base outer radius: `" + formatNumber(baseOuterRadius) + " px`");
        lines.push("- Item gap: `" + formatNumber(settings.gap) + " px`");
        lines.push("- Matrix padding: `" + formatNumber(settings.padding) + " px`");
        lines.push("- Row dynamics: `" + formatBoolean(settings.dynamicEnabled) + "`");
        lines.push("- Dynamic amount: `" + formatNumber(settings.dynamicAmount) + "%`");
        lines.push("- Row rotation: `" + formatBoolean(settings.rotationEnabled) + "`");
        lines.push("- Rotation angle: `" + formatNumber(settings.rotationAngle) + " deg`");
        lines.push("- Sine wave: `" + formatBoolean(settings.sineEnabled) + "`");
        lines.push("- Sine amplitude: `" + formatNumber(settings.sineAmplitude) + " px`");
        lines.push("- Sine frequency: `" + formatNumber(settings.sineFrequency) + "`");
        lines.push("- Background: `" + formatBoolean(settings.backgroundEnabled) + "`");
        lines.push("- Background color: `" + formatBackgroundColor(settings) + "`");
        lines.push("- Artboard size: `" + formatNumber(width) + " x " + formatNumber(height) + " px`");
        lines.push("- Randomized parts: `shape colors and nested shape offsets`");
        lines.push("");

        return lines.join("\n");
    }

    function formatDisplayDate(date) {
        return date.getFullYear() +
            "/" + pad2(date.getMonth() + 1) +
            "/" + pad2(date.getDate()) +
            " @ " + pad2(date.getHours()) +
            ":" + pad2(date.getMinutes()) +
            ":" + pad2(date.getSeconds());
    }

    function formatFileDate(date) {
        return date.getFullYear() +
            "-" + pad2(date.getMonth() + 1) +
            "-" + pad2(date.getDate()) +
            "-" + pad2(date.getHours()) +
            pad2(date.getMinutes()) +
            pad2(date.getSeconds());
    }

    function pad2(value) {
        value = String(value);
        return value.length < 2 ? "0" + value : value;
    }

    function shapeTypeToLabel(shapeType) {
        if (shapeType === "square") {
            return "Squares";
        }

        if (shapeType === "triangle") {
            return "Triangles";
        }

        return "Circles";
    }

    function formatBoolean(value) {
        return value ? "true" : "false";
    }

    function formatNumber(value) {
        return String(roundTo(value, 4));
    }

    function formatBackgroundColor(settings) {
        if (!settings.backgroundEnabled || !settings.backgroundColor) {
            return "none";
        }

        return rgbColorToHex(settings.backgroundColor);
    }

    function addField(parent, label, defaultValue, helpText) {
        var LABEL_WIDTH = 140;
        var INPUT_WIDTH = 72;
        var HELP_WIDTH = 440;
        var HELP_WRAP_CHARS = 80;
        var HELP_LINE_HEIGHT = 17;
        var row = parent.add("group");
        row.alignChildren = ["left", "top"];
        row.spacing = 6;

        var labelView = row.add("statictext", undefined, label);
        labelView.preferredSize.width = LABEL_WIDTH;

        var input = row.add("edittext", undefined, defaultValue);
        input.characters = 6;
        input.preferredSize.width = INPUT_WIDTH;

        var wrappedHelpText = wrapText(helpText, HELP_WRAP_CHARS);
        var help = row.add("statictext", undefined, wrappedHelpText, { multiline: true });
        help.preferredSize.width = HELP_WIDTH;
        help.preferredSize.height = countLines(wrappedHelpText) * HELP_LINE_HEIGHT;

        return input;
    }

    function addDropdown(parent, label, items, selectedIndex, helpText) {
        var LABEL_WIDTH = 140;
        var DROPDOWN_WIDTH = 72;
        var HELP_WIDTH = 440;
        var HELP_WRAP_CHARS = 80;
        var HELP_LINE_HEIGHT = 17;
        var row = parent.add("group");
        row.alignChildren = ["left", "top"];
        row.spacing = 6;

        var labelView = row.add("statictext", undefined, label);
        labelView.preferredSize.width = LABEL_WIDTH;

        var dropdown = row.add("dropdownlist", undefined, items);
        dropdown.preferredSize.width = DROPDOWN_WIDTH;
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
        var wave = calculateRowWave(col, cols);

        return minScale + (maxScale - minScale) * wave;
    }

    function calculateRowRotationAngle(col, cols, rotationEnabled, rotationAngle) {
        if (!rotationEnabled || rotationAngle === 0 || cols < 3) {
            return 0;
        }

        return rotationAngle * calculateRowWave(col, cols);
    }

    function calculateSineWaveOffset(col, cols, sineEnabled, amplitude, frequency) {
        if (!sineEnabled || amplitude <= 0 || frequency <= 0 || cols < 2) {
            return 0;
        }

        return amplitude * Math.sin((col / (cols - 1)) * Math.PI * 2 * frequency);
    }

    function calculateRowWave(col, cols) {
        if (cols < 3) {
            return 0;
        }

        return Math.sin((col / (cols - 1)) * Math.PI);
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

    function calculateMatrixHeight(rows, maxRadius, gap, padding, sineAmplitude) {
        return padding * 2 + sineAmplitude * 2 + rows * maxRadius * 2 + (rows - 1) * gap;
    }

    function isValidGapForMatrix(outerRadii, rows, maxRadius, gap) {
        if (outerRadii.length > 1) {
            for (var i = 0; i < outerRadii.length - 1; i++) {
                if ((outerRadii[i] + outerRadii[i + 1] + gap) <= 0) {
                    return false;
                }
            }
        }

        if (rows > 1 && (maxRadius * 2 + gap) <= 0) {
            return false;
        }

        return true;
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

    function drawItem(layer, cx, cy, radii, shapeType, rotationAngle) {
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

        if (rotationAngle !== 0) {
            group.rotate(rotationAngle);
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

    function randomSignedInt(minAbs, maxAbs) {
        var value = randomInt(minAbs, maxAbs);
        return randomBoolean() ? value : -value;
    }

    function randomDecimal(min, max, decimals) {
        return roundTo(randomRange(min, max), decimals);
    }

    function randomBoolean() {
        return Math.random() >= 0.5;
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

    function parseSignedNumber(value) {
        value = trim(String(value));
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
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
