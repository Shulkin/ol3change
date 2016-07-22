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

// array of process functions
var f_array = [composite, difference];

function changeDetection(method) {
	var func = f_array[method] // process function
	var id1 = get("layer1");
	var id2 = get("layer2");
	if (id1 === 'null' || id2 === 'null') {
		error(tr("error:invalid_layer"));
		return;
	}
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
		lib: {
			get: get,
			process: func
		}
	});
	var img = new ol.layer.Image({
		title: "Результат",
		group: "imagery",
		deletable: true,
		source: raster
	});
	map.addLayer(img);
	refreshLayersList(map);
}