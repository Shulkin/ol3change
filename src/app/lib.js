// array of process functions
var functions = {
	composite: multitemporal_composite,
	difference: image_difference,
	ratio: image_ratio
};

// array of kernels for filters
var kernels = {
	sharpen: [
		0, -1, 0,
		-1, 5, -1,
		0, -1, 0
	],
	gaussian: [
		1, 4, 7, 4, 1,
		4, 16, 26, 16, 4,
		7, 26, 41, 26, 7,
		4, 16, 26, 16, 4,
		1, 4, 7, 4, 1
	],
	edge: [
		0, 1, 0,
		1, -4, 1,
		0, 1, 0
	]
};

/**
* Make a multi-temporal composite. Red band from src,
* Green and Blue from dst. Simple.
* @param {Image} src Input image 1.
* @param {Image} dst Input image 2.
* @param {Object} data Additional parameters.
*/
function multitemporal_composite(src, dst) {
	var width = src.width;
	var height = src.height;
	var srcData = src.data;
	var dstData = dst.data;
	var outputData = new Uint8ClampedArray(srcData.length);
	var i = 0;
	while (i < srcData.length) {
		var pixel = []; // result
		pixel[0] = (srcData[i] + srcData[i + 1] + srcData[i + 2]) / 3; // red
		pixel[1] = (dstData[i] + dstData[i + 1] + dstData[i + 2]) / 3; // green
		pixel[2] = (dstData[i] + dstData[i + 1] + dstData[i + 2]) / 3; // blue
		pixel[3] = 255; // aplha
		for (var j = 0; j < 4; j++) outputData[i + j] = pixel[j];
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}

/**
* Calculates the difference between the brightness of the pixels.
* Set change depending on threshold value from data.
* @param {Image} src Input image 1.
* @param {Image} dst Input image 2.
* @param {Object} threshold Additional parameter.
*/
function image_difference(src, dst, threshold) {
	var width = src.width;
	var height = src.height;
	var srcData = src.data;
	var dstData = dst.data;
	var outputData = new Uint8ClampedArray(srcData.length);
	var i = 0;
	while (i < srcData.length) {
		// calculate difference
		var mean_src = (srcData[i] + srcData[i + 1] + srcData[i + 2]) / 3;
		var mean_dst = (dstData[i] + dstData[i + 1] + dstData[i + 2]) / 3;
		var delta = Math.abs(mean_dst - mean_src);
		var pixel = delta > threshold ? change() : empty(); // result
		for (var j = 0; j < 4; j++) outputData[i + j] = pixel[j];
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}

/**
* Calculates the ratio between pixels. Change is determined by threshold.
* @param {Image} src Input image 1.
* @param {Image} dst Input image 2.
* @param {Object} threshold Additional parameter.
*/
function image_ratio(src, dst, threshold) {
	var width = src.width;
	var height = src.height;
	var srcData = src.data;
	var dstData = dst.data;
	var outputData = new Uint8ClampedArray(srcData.length);
	var i = 0;
	while (i < srcData.length) {
		// calculate ratio
		var mean_src = (srcData[i] + srcData[i + 1] + srcData[i + 2]) / 3;
		var mean_dst = (dstData[i] + dstData[i + 1] + dstData[i + 2]) / 3;
		if (mean_src === 0) mean_src += 1;
		if (mean_dst === 0) mean_dst += 1;
		var ratio = Math.min(mean_src, mean_dst) / Math.max(mean_src, mean_dst);
		var pixel = ratio > threshold ? change() : empty(); // result
		for (var j = 0; j < 4; j++) outputData[i + j] = pixel[j];
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}

/**
* Normalize a kernel N x N.
* @param {Array.<number>} kernel Kernel.
*/
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
* Apply a convolution kernel to image. This works for any size kernel, but
* performance starts degrading above 3 x 3.
* @param {Image} image Input data.
* @param {Array.<number>} kernel Kernel.
*/
function convolve(image, kernel) {
	var width = image.width;
	var height = image.height;
	var size = Math.sqrt(kernel.length);
	var half = Math.floor(size / 2);
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData);
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
	return {data: outputData, width: width, height: height};
}

/**
* Remove any chosen color from image.
* @param {Image} image Input data.
*/
function remove(image, color) {
	var width = image.width;
	var height = image.height;
	var inputData = image.data;
	var outputData = new Uint8ClampedArray(inputData.length);
	var i = 0;
	while (i < inputData.length) {
		var match = true;
		for (var j = 0; j < 3; j++) { // compare first 3 colors [R, G, B]
			if (inputData[i + j] != color[j]) {
				match = false;
				break;
			}
		}
		// copy first 3 color components
		for (j = 0; j < 3; j++) outputData[i + j] = inputData[i + j];
		outputData[i + 3] = match ? 0 : 255; // decide alpha
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}

/**
* Join 2 images together.
* @param {Image} image Input data.
*/
function overlap(src ,dst) {
	var width = src.width;
	var height = src.height;
	var srcData = src.data;
	var dstData = dst.data;
	var outputData = new Uint8ClampedArray(srcData.length);
	var i = 0;
	while (i < srcData.length) {
		for (var j = 0; j < 4; j++) outputData[i + j] = srcData[i + j]; // init as srsData
		// overlap from dstData if corresponding alpha is not transparent
		if (dstData[i + 3] != 0) {
			for (j = 0; j < 4; j++) outputData[i + j] = dstData[i + j];
		}
		i += 4;
	}
	return {data: outputData, width: width, height: height};
}