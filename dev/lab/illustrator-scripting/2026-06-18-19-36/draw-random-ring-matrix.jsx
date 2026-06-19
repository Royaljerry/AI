// Draws a user-sized matrix of randomly colored, slightly perturbed ring items.
// Run in Adobe Illustrator via File > Scripts > Other Script.

(function () {
    var previousInteractionLevel = app.userInteractionLevel;

    try {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;

        var matrixSize = askMatrixSize("10x10");
        if (!matrixSize) {
            return;
        }

        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        var COLS = matrixSize.cols;
        var ROWS = matrixSize.rows;
        var OUTER_RADIUS = 28;
        var GAP = 14;
        var MARGIN = 28;
        var CELL = OUTER_RADIUS * 2 + GAP;
        var WIDTH = MARGIN * 2 + COLS * OUTER_RADIUS * 2 + (COLS - 1) * GAP;
        var HEIGHT = MARGIN * 2 + ROWS * OUTER_RADIUS * 2 + (ROWS - 1) * GAP;
        var RADII = [OUTER_RADIUS, 20, 12, 6];

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

    function askMatrixSize(defaultValue) {
        var MAX_DIMENSION = 100;

        while (true) {
            var answer = prompt(
                "Matrix size? Use columns x rows, or one number for a square matrix.",
                defaultValue
            );

            if (answer === null) {
                return null;
            }

            answer = trim(String(answer)).toLowerCase();
            var parts = answer.split(/[x*]/);
            var cols;
            var rows;

            if (parts.length === 1) {
                cols = parseWholeNumber(parts[0]);
                rows = cols;
            } else if (parts.length === 2) {
                cols = parseWholeNumber(parts[0]);
                rows = parseWholeNumber(parts[1]);
            }

            if (isValidDimension(cols, MAX_DIMENSION) && isValidDimension(rows, MAX_DIMENSION)) {
                return {
                    cols: cols,
                    rows: rows
                };
            }

            alert("Please enter a size like 10x10 or 12. Each dimension must be from 1 to " + MAX_DIMENSION + ".");
        }
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

    function isValidDimension(value, max) {
        return value !== null && value >= 1 && value <= max;
    }

    function trim(value) {
        return value.replace(/^\s+|\s+$/g, "");
    }
}());
