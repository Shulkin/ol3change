// 3x3 kernels for filter
var kernels = {
	none: [
		0, 0, 0,
		0, 1, 0,
		0, 0, 0
	],
	sharpen: [
		0, -1, 0,
		-1, 5, -1,
		0, -1, 0
	],
	gaussian: [
		1/16, 1/8, 1/16,
		1/8, 1/4, 1/8,
		1/16, 1/8, 1/16
	],
	edge: [
		0, 1, 0,
		1, -4, 1,
		0, 1, 0
	]
};

function normalize(kernel) {
	var len = kernel.length;
	var normal = new Array(len);
	var i, sum = 0;
	for (i = 0; i < len; ++i) {
		sum += kernel[i];
	}
	if (sum <= 0) {
		normal.normalized = false;
		sum = 1;
	} else {
		normal.normalized = true;
	}
	for (i = 0; i < len; ++i) {
		normal[i] = kernel[i] / sum;
	}
	return normal;
}

/**
* Apply a convolution kernel to canvas.  This works for any size kernel, but
* performance starts degrading above 3 x 3.
* @param {CanvasRenderingContext2D} context Canvas 2d context.
* @param {Array.<number>} kernel Kernel.
*/
function convolve(context, kernel) {
	var canvas = context.canvas;
	var width = canvas.width;
	var height = canvas.height;
	var size = Math.sqrt(kernel.length);
	var half = Math.floor(size / 2);
	var inputData = context.getImageData(0, 0, width, height).data;
	var output = context.createImageData(width, height);
	var outputData = output.data;
	for (var pixelY = 0; pixelY < height; ++pixelY) {
		var pixelsAbove = pixelY * width;
		for (var pixelX = 0; pixelX < width; ++pixelX) {
			var r = 0, g = 0, b = 0, a = 0;
			for (var kernelY = 0; kernelY < size; ++kernelY) {
				for (var kernelX = 0; kernelX < size; ++kernelX) {
					var weight = kernel[kernelY * size + kernelX];
					var neighborY = Math.min(height - 1, Math.max(0, pixelY + kernelY - half));
					var neighborX = Math.min(width - 1, Math.max(0, pixelX + kernelX - half));
					var inputIndex = (neighborY * width + neighborX) * 4;
					r += inputData[inputIndex] * weight;
					g += inputData[inputIndex + 1] * weight;
					b += inputData[inputIndex + 2] * weight;
					a += inputData[inputIndex + 3] * weight;
				}
			}
			var outputIndex = (pixelsAbove + pixelX) * 4;
			outputData[outputIndex] = r;
			outputData[outputIndex + 1] = g;
			outputData[outputIndex + 2] = b;
			outputData[outputIndex + 3] = kernel.normalized ? a : 255;
		}
	}
	context.putImageData(output, 0, 0);
}

// multitemporal composite
function composite(src, dst) {
	var pixel = [0,0,0,0]; // result
	pixel[0] = (src[0] + src[1] + src[2]) / 3; // red
	pixel[1] = (dst[0] + dst[1] + dst[2]) / 3; // green
	pixel[2] = (dst[0] + dst[1] + dst[2]) / 3; // blue
	pixel[3] = 255; // aplha
	return pixel;
}

// image difference
function difference(src, dst) {
	var pixel = [0,0,0,0]; // result
	// image difference
	var threshold = 100;
	var mean_src = (src[0] + src[1] + src[2]) / 3;
	var mean_dst = (dst[0] + dst[1] + dst[2]) / 3;
	var delta = Math.abs(mean_dst - mean_src);
	if (delta > threshold) {
		pixel = [255,0,0,255]; // major change
	} else {
		pixel = [0,0,0,0]; // transparent
	}
	return pixel;
}

// image ratio
function ratio(src, dst) {
	var pixel = [0,0,0,0]; // result
	// image ratio
	var threshold = 0.7; // ?
	var mean_src = (src[0] + src[1] + src[2]) / 3;
	var mean_dst = (dst[0] + dst[1] + dst[2]) / 3;
	if (mean_src === 0) mean_src += 1; // ?
	if (mean_dst === 0) mean_dst += 1; // ?
	var ratio = Math.min(mean_src, mean_dst) / Math.max(mean_src, mean_dst);
	if (ratio > threshold) { // more than 0.5 ratio
		pixel = [255,0,0,255]; // major change
	} else {
		pixel = [0,0,0,0]; // transparent
	}
	return pixel;
}

// array of process functions
var functions = [composite, difference, ratio];

function addResult(source, title, name) {
	var img = new ol.layer.Image({
		title: title,
		name: name,
		group: "imagery",
		deletable: true,
		source: source
	});
	map.addLayer(img);
	refreshLayersList(map);
}

function postProcessing(type) {
	var matrix = kernels[type]; // choose filter type
	var name = get("layer_filter");
	if (name === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
	var layer = getLayerByName(map, name);
	if (layer === null) {
		//error: layer not found
		return;
	}
	/**
	* Apply a filter on "postcompose" events.
	*/
	if (layer.listener != undefined && layer.listener != null) {
		// remove previous filter, so they don't stack up
		layer.unByKey(layer.listener);
	}
	if (type != 'none') { // no extra load on the CPU for empty kernel
		layer.listener = layer.on('postcompose', function(event) {
			convolve(event.context, matrix);
		});
	}
	map.render();
}

function changeDetection(method) {
	var func = functions[method] // process function
	var name_1 = get("layer_change_1");
	var name_2 = get("layer_change_2");
	if (name_1 === 'null' || name_2 === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
	var layer_1 = getLayerByName(map, name_1);
	var layer_2 = getLayerByName(map, name_2);
	if (layer_1 === null || layer_2 === null) {
		//error: layers not found
		return;
	}
	// process by chosen method
	var raster = new ol.source.Raster({
		sources: [layer_1.getSource(), layer_2.getSource()],
		/**
		 * Run calculations on pixel data.
		 * @param {Array} pixels List of pixels (one per source).
		 * @param {Object} data User data object.
		 * @return {Array} The output pixel.
		 */
		operation: function(pixels, data) {
			return process(pixels[0], pixels[1]);
		},
		lib: {process: func}
	});
	// some mumbo-jumbo with titles
	var title_1 = layer_1.get('title');
	var title_2 = layer_2.get('title');
	title_full = "Изменения [" + title_1 + ", " + title_2 + "]";
	var title_short = title_full; // initially the same
	if (title_short.length > 20) {
		title_short = title_short.substring(0, 20) + "..."; // cut
	}
	// add result image layer to map
	addResult(raster, title_short, "change_" + uid());
	map.render();
}