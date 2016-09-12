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
* Normalize a kernel N x N.
* @param {Array.<number>} kernel Kernel.
*/
function kernel_normalize(kernel) {
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