/**
* Calculate mean of the image pixels.
*/
function image_mean(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var bands = new Array(len).fill(0); // [r, g, b, a]
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			bands[j] += data[i + j];
		}
		i += len;
		count++;
	}
	for (j = 0; j < len; j++) {
		bands[j] /= count;
	}
	return bands;
}

/**
* Calculate maximum of the image pixels.
*/
function image_max(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var result = new Array(len).fill(Number.NEGATIVE_INFINITY);
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			if (result[j] < data[i + j]) result[j] = data[i + j];
		}
		i += len;
		count++;
	}
	return result;
}

/**
* Calculate minimum of the image pixels.
*/
function image_min(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var result = new Array(len).fill(Number.POSITIVE_INFINITY);
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			if (result[j] > data[i + j]) result[j] = data[i + j];
		}
		i += len;
		count++;
	}
	return result;
}

/**
* Calculate standard deviation of the image pixels.
*/
function image_standard_deviation(data) {
	var i = 0;
	var len = 4; // bands num
	var count = 0; // total counter
	var m = mean(data); // calculate mean
	var dispersion = new Array(len).fill(0);
	// calculate dispersion
	while (i < data.length) {
		for (var j = 0; j < len; j++) {
			dispersion[j] += Math.pow(data[i + j] - m[j], 2);
		}
		i += len;
		count++;
	}
	var bands = new Array(len).fill(0);
	for (j = 0; j < len; j++) {
		bands[j] = Math.sqrt((1 / (count)) * dispersion[j]);
	}
	return bands;
}