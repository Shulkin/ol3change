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
var f_array = [composite, difference, ratio];

function changeDetection(method) {
	var func = f_array[method] // process function
	var id1 = get("layer1");
	var id2 = get("layer2");
	if (id1 === 'null' || id2 === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
	// process by chosen method
	var raster = new ol.source.Raster({
		sources: [mosaics[id1].getSource(), mosaics[id2].getSource()],
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
	// simple blur, remove pixels with less than 3 neighbours
	var classified = new ol.source.Raster({
		sources: [raster],
		operationType: 'image',
		operation: function(inputs, data) {
			var image = inputs[0]; // source image
			var width = image.width;
			var height = image.height;
			var inputData = image.data;
			//var outputData = new Uint8ClampedArray(inputData);
			/*
			for (var i = 0; i < inputData.length; i++) {
				var p_r = inputData[i];
				var p_g = inputData[i + 1];
				var p_b = inputData[i + 2];
				var p_a = inputData[i + 3];
				if (p_a === 255) {
					outputData[i] = 0;
					outputData[i + 1] = 255;
					outputData[i + 2] = 0;
					outputData[i + 3] = 255;
				} else {
					outputData[i] = p_r;
					outputData[i + 1] = p_g;
					outputData[i + 2] = p_b;
					outputData[i + 3] = p_a;
				}
			}
			*/
			return {data: inputData, width: width, height: height};
		}
	});
	// add result image layer to map
	var img = new ol.layer.Image({
		title: "Результат",
		group: "imagery",
		deletable: true,
		source: raster
	});
	map.addLayer(img);
	refreshLayersList(map);
}